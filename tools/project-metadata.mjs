import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const json = file => JSON.parse(readFileSync(file, "utf8"));
const write = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
const hash = file => createHash("sha256").update(readFileSync(file)).digest("hex");
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const packageInfo = json("package.json");
const lock = json("package-lock.json");
const game = json("game-artifact.lock.json");
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
  if (hash("dist/game/artifact-manifest.json") !== game.manifestSha256) throw new Error("Built client manifest mismatch");
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
function artifacts() {
  return ["dist/version.json", "dist/index.html", "dist/game/artifact-manifest.json", "coverage/tested-image-id.txt", `coverage/chart/poker-web-${versions().chart}.tgz`]
    .filter(existsSync).map(path => ({ path, sha256: hash(path), version: path.endsWith(".tgz") ? versions().chart : path.includes("/game/") ? json("dist/game/version.json").version : packageInfo.version }));
}
function receipt(args) {
  const file = "coverage/ci-local.json";
  const option = key => args[args.indexOf(key) + 1];
  let value;
  if (args[0] === "init") {
    value = { schemaVersion: 1, source: json("coverage/source.json"), startedAt: new Date().toISOString(), status: "running", checks: [], artifacts: [], versions: versions(), tools: { node: process.version, npm: execFileSync("npm", ["--version"], { encoding: "utf8" }).trim(), vitest: json(new URL("../node_modules/vitest/package.json", import.meta.url)).version, vite: json(new URL("../node_modules/vite/package.json", import.meta.url)).version, eslint: json(new URL("../node_modules/eslint/package.json", import.meta.url)).version } };
  } else {
    value = json(file);
    if (args[0] === "record") {
      const exitCode = Number(option("--exit-code"));
      if (!Number.isInteger(exitCode)) throw new Error("Invalid check exit code");
      value.checks.push({ name: option("--name"), command: option("--command"), status: exitCode === 0 ? "passed" : "failed", exitCode });
    } else if (args[0] === "finish") {
      value.status = option("--status");
      if (value.status === "passed" && (!value.checks.length || value.checks.some(check => check.exitCode !== 0))) value.status = "failed";
      if (JSON.stringify(value.source) !== JSON.stringify(json("coverage/source.json"))) value.status = "failed";
      value.finishedAt = new Date().toISOString();
      value.artifacts = artifacts();
      value.coverage = { policy: "advisory", report: "coverage/vitest/coverage-summary.json", ...(existsSync("coverage/vitest/coverage-summary.json") ? { sha256: hash("coverage/vitest/coverage-summary.json") } : {}) };
      writeFileSync("coverage/ci-local-summary.md", `# Local CI: ${value.status}\n\nSource: ${value.source.commit}; dirty: ${value.source.dirty}.\n\n${value.checks.map(check => `- ${check.name}: ${check.status} (${check.exitCode})`).join("\n")}\n`);
      writeFileSync("coverage/checksums.sha256", value.artifacts.map(artifact => `${artifact.sha256}  ${artifact.path}\n`).join(""));
    } else throw new Error("Unknown receipt operation");
  }
  write(file, value);
  if (args[0] === "finish" && value.status !== option("--status")) throw new Error("Source changed during local CI");
}
const [command, ...args] = process.argv.slice(2);
if (command === "version") console.log(JSON.stringify(versions(), null, 2));
else if (command === "build-version") {
  mkdirSync("dist", { recursive: true });
  write("dist/version.json", { version: versions().application, sourceCommit: process.env.SOURCE_COMMIT, clientCommit: game.clientCommit, bridgeVersion: game.bridgeVersion });
} else if (command === "release-check") releaseCheck();
else if (command === "receipt") receipt(args);
else throw new Error("Expected version, build-version, release-check or receipt");
