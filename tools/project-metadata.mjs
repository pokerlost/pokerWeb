import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

import { z } from "zod";

const json = file => JSON.parse(readFileSync(file, "utf8"));
const write = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
const hash = file => createHash("sha256").update(readFileSync(file)).digest("hex");
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const packageInfo = json("package.json");
const lock = json("package-lock.json");
const game = json("game-artifact.lock.json");
const gameDirectory = `dist/game/${game.manifestSha256}`;
const chartScalar = (key) => {
  const values = [...readFileSync("deploy/chart/Chart.yaml", "utf8").matchAll(new RegExp(`^${key}: ([^\\s]+)$`, "gm"))];
  if (values.length !== 1) throw new Error(`Expected one plain chart ${key}`);
  return values[0][1];
};
function versions() {
  const result = { application: packageInfo.version, chart: chartScalar("version"), chartAppVersion: chartScalar("appVersion"), bridge: game.bridgeVersion, clientCommit: game.clientCommit };
  if (!semver.test(result.application) || !semver.test(result.chart)
    || result.chartAppVersion !== result.application || lock.version !== result.application
    || lock.packages[""].version !== result.application) throw new Error("Package/lock/chart version mismatch");
  return result;
}
function releaseCheck() {
  const expected = versions();
  const built = json("dist/version.json");
  const source = json("coverage/source.json");
  if (source.dirty) throw new Error("Release readiness requires clean reviewed source");
  if (built.version !== expected.application || built.sourceCommit !== source.commit
    || built.clientCommit !== game.clientCommit || built.bridgeVersion !== game.bridgeVersion) throw new Error("Built application identity mismatch");
  if (hash(`${gameDirectory}/artifact-manifest.json`) !== game.manifestSha256) throw new Error("Built client manifest mismatch");
  const tested = readFileSync("coverage/source-commit.txt", "utf8").trim();
  if (tested !== source.commit) throw new Error("Browser acceptance source mismatch");
  const image = json("coverage/runtime-image.json")[0];
  const labels = image.Config.Labels;
  if (labels["org.opencontainers.image.version"] !== expected.application
    || labels["org.opencontainers.image.revision"] !== source.commit
    || image.Id !== readFileSync("coverage/tested-image-id.txt", "utf8").trim()) throw new Error("Tested runtime image identity mismatch");
  const chart = execFileSync("helm", ["show", "chart", `coverage/chart/poker-web-${expected.chart}.tgz`], { encoding: "utf8" });
  if (!chart.includes(`version: ${expected.chart}\n`) || !chart.includes(`appVersion: ${expected.application}\n`)) throw new Error("Packaged Helm chart version mismatch");
  console.log("Application, chart, lock, built client and browser source versions agree.");
}
const requiredChecks = ["check", "coverage", "build", "chart", "verify", "release-check"];
const checkName = z.enum([...requiredChecks, "offline-preflight"]);
const sourceSchema = z.object({ commit: z.string().regex(/^[a-f0-9]{40,64}$/), dirty: z.boolean(), contentSha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const checkSchema = z.object({ name: checkName, command: z.string().min(1), status: z.enum(["passed", "failed", "blocked"]), exitCode: z.number().int().min(0).max(255) }).strict();
const planSchema = z.object({ scope: z.enum(["full", "scoped"]), checks: z.array(z.enum(requiredChecks)).min(1) }).strict();
const receiptSchema = z.object({ schemaVersion: z.literal(1), source: sourceSchema, status: z.enum(["running", "passed", "failed", "blocked"]), scope: z.enum(["full", "scoped"]), plannedChecks: z.array(z.enum(requiredChecks)).min(1), checks: z.array(checkSchema), artifacts: z.array(z.object({ path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/), version: z.string().min(1) }).strict()) }).passthrough();
const stateFor = code => code === 0 ? "passed" : code === 3 ? "blocked" : "failed";
function plan() {
  const value = planSchema.parse(json("coverage/ci-plan.json"));
  if (new Set(value.checks).size !== value.checks.length || (value.scope === "full" && JSON.stringify(value.checks) !== JSON.stringify(requiredChecks))) throw new Error("Invalid native CI plan");
  return value;
}
function options(args, names) {
  if (args.length !== names.length * 2) throw new Error("Missing or unexpected receipt options");
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!names.includes(key) || Object.hasOwn(result, key) || !value || value.startsWith("--")) throw new Error("Invalid receipt option");
    result[key] = value;
  }
  return result;
}
function validateChecks(value) {
  const names = value.checks.map(check => check.name);
  if (new Set(names).size !== names.length || names.slice(1).includes("offline-preflight")) throw new Error("Duplicate or misplaced check");
  const native = names.filter(name => name !== "offline-preflight");
  if (JSON.stringify(native) !== JSON.stringify(value.plannedChecks.slice(0, native.length)) || value.checks.some(check => check.status !== stateFor(check.exitCode))) throw new Error("Malformed check receipt");
}
function artifacts(required) {
  const paths = ["dist/version.json", "dist/index.html", `${gameDirectory}/artifact-manifest.json`, `${gameDirectory}/version.json`, "coverage/tested-image-id.txt", `coverage/chart/poker-web-${versions().chart}.tgz`];
  if (required && paths.some(path => !existsSync(path))) throw new Error("Missing required built artifact");
  return paths.filter(path => existsSync(path) && (!path.includes("/game/") || existsSync(`${gameDirectory}/version.json`)))
    .map(path => ({ path, sha256: hash(path), version: path.endsWith(".tgz") ? versions().chart : path.includes("/game/") ? json(`${gameDirectory}/version.json`).version : packageInfo.version }));
}
function receipt(args) {
  const file = "coverage/ci-local.json";
  const [operation, ...rest] = args;
  let value;
  let failure;
  if (operation === "init") {
    options(rest, []);
    const currentPlan = plan();
    value = { schemaVersion: 1, source: sourceSchema.parse(json("coverage/source.json")), scope: currentPlan.scope, plannedChecks: currentPlan.checks, startedAt: new Date().toISOString(), status: "running", checks: [], artifacts: [], versions: versions(), tools: { node: process.version, npm: execFileSync("npm", ["--version"], { encoding: "utf8" }).trim(), vitest: json(new URL("../node_modules/vitest/package.json", import.meta.url)).version, vite: json(new URL("../node_modules/vite/package.json", import.meta.url)).version, eslint: json(new URL("../node_modules/eslint/package.json", import.meta.url)).version } };
  } else {
    value = receiptSchema.parse(json(file));
    if (value.status !== "running") throw new Error("Receipt is already finished");
    const currentPlan = plan();
    if (value.scope !== currentPlan.scope || JSON.stringify(value.plannedChecks) !== JSON.stringify(currentPlan.checks)) throw new Error("CI plan changed during execution");
    validateChecks(value);
    if (operation === "record") {
      const fields = options(rest, ["--name", "--command", "--exit-code"]);
      if (!/^\d+$/.test(fields["--exit-code"])) throw new Error("Invalid check exit code");
      const exitCode = Number(fields["--exit-code"]);
      value.checks.push(checkSchema.parse({ name: fields["--name"], command: fields["--command"], status: stateFor(exitCode), exitCode }));
      validateChecks(value);
    } else if (operation === "finish") {
      const requested = z.enum(["passed", "failed", "blocked"]).parse(options(rest, ["--status"])["--status"]);
      value.status = requested;
      try {
        if (JSON.stringify(value.source) !== JSON.stringify(sourceSchema.parse(json("coverage/source.json")))) throw new Error("Source changed during local CI");
        const hasFailure = value.checks.some(check => check.status === "failed");
        const hasBlocked = value.checks.some(check => check.status === "blocked");
        if (hasFailure) value.status = "failed";
        else if (hasBlocked) value.status = "blocked";
        if (requested === "passed" && value.status === "blocked") {
          failure = new Error("Blocked check cannot produce PASS");
        } else if (requested === "passed") {
          if (value.status !== "passed") throw new Error("Non-passing check cannot produce PASS");
          if (JSON.stringify(value.checks.filter(check => check.name !== "offline-preflight").map(check => check.name)) !== JSON.stringify(value.plannedChecks)) throw new Error("Required checks were not executed");
        }
        value.artifacts = value.scope === "full" ? artifacts(value.status === "passed") : [];
      } catch (error) {
        failure = error;
        value.status = "failed";
        value.artifacts = [];
      }
      value.finishedAt = new Date().toISOString();
      value.coverage = { policy: "advisory", report: "coverage/vitest/coverage-summary.json", ...(existsSync("coverage/vitest/coverage-summary.json") ? { sha256: hash("coverage/vitest/coverage-summary.json") } : {}) };
      writeFileSync("coverage/ci-local-summary.md", `# Local CI (${value.scope}): ${value.status}\n\nSource: ${value.source.commit}; dirty: ${value.source.dirty}.\n\n${value.checks.map(check => `- ${check.name}: ${check.status} (${check.exitCode})`).join("\n")}\n`);
      writeFileSync("coverage/checksums.sha256", value.artifacts.map(artifact => `${artifact.sha256}  ${artifact.path}\n`).join(""));
    } else throw new Error("Unknown receipt operation");
  }
  write(file, receiptSchema.parse(value));
  if (failure) throw failure;
}
const [command, ...args] = process.argv.slice(2);
if (command === "version") console.log(JSON.stringify(versions(), null, 2));
else if (command === "build-version") {
  mkdirSync("dist", { recursive: true });
  write("dist/version.json", { version: versions().application, sourceCommit: process.env.SOURCE_COMMIT, clientCommit: game.clientCommit, bridgeVersion: game.bridgeVersion });
} else if (command === "release-check") releaseCheck();
else if (command === "receipt") receipt(args);
else throw new Error("Expected version, build-version, release-check or receipt");
