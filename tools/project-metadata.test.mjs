import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const script = resolve("tools/project-metadata.mjs");
describe("native version and source receipt gates", () => {
  let root;
  const write = (path, value) => writeFileSync(join(root, path), JSON.stringify(value));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "web-version-"));
    mkdirSync(join(root, "deploy/chart"), { recursive: true });
    mkdirSync(join(root, "coverage"));
    write("package.json", { version: "0.1.0-dev.0" });
    write("package-lock.json", { version: "0.1.0-dev.0", packages: { "": { version: "0.1.0-dev.0" } } });
    write("game-artifact.lock.json", { bridgeVersion: 1, clientCommit: "a".repeat(40) });
    writeFileSync(join(root, "deploy/chart/Chart.yaml"), "version: 0.2.0-dev.0\nappVersion: 0.1.0-dev.0\n");
    write("coverage/ci-plan.json", { scope: "full", checks: ["check", "coverage", "build", "chart", "verify", "release-check"] });
    write("coverage/source.json", { commit: "a".repeat(40), dirty: false, contentSha256: "b".repeat(64) });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  it("binds prepared static bytes to the exact clean source", () => {
    mkdirSync(join(root, "dist"));
    write("dist/version.json", { version: "0.1.0-dev.0", sourceCommit: "a".repeat(40) });
    writeFileSync(join(root, "dist/index.html"), "synthetic website");
    expect(run("capture-build").status).toBe(0);
    expect(run("check-build").status).toBe(0);
    writeFileSync(join(root, "dist/index.html"), "changed website");
    expect(run("check-build").status).not.toBe(0);
    writeFileSync(join(root, "dist/index.html"), "synthetic website");
    write("coverage/source.json", { commit: "a".repeat(40), dirty: false, contentSha256: "c".repeat(64) });
    expect(run("check-build").status).not.toBe(0);
  });
  it("rejects extra files and symlinks in prepared static output", () => {
    mkdirSync(join(root, "dist"));
    write("dist/version.json", { version: "0.1.0-dev.0", sourceCommit: "a".repeat(40) });
    expect(run("capture-build").status).toBe(0);
    writeFileSync(join(root, "dist/extra"), "extra");
    expect(run("check-build").status).not.toBe(0);
    rmSync(join(root, "dist/extra"));
    symlinkSync("version.json", join(root, "dist/link"));
    expect(run("check-build").status).not.toBe(0);
  });
  it("keeps application and independent chart versions distinct", () => {
    expect(JSON.parse(run("version").stdout)).toMatchObject({ application: "0.1.0-dev.0", chart: "0.2.0-dev.0" });
  });
  it("rejects npm lock or chart appVersion drift", () => {
    write("package-lock.json", { version: "9.0.0", packages: { "": { version: "0.1.0-dev.0" } } });
    expect(run("version").status).not.toBe(0);
    write("package-lock.json", { version: "0.1.0-dev.0", packages: { "": { version: "0.1.0-dev.0" } } });
    writeFileSync(join(root, "deploy/chart/Chart.yaml"), "version: 0.2.0-dev.0\nappVersion: 9.0.0\n");
    expect(run("version").status).not.toBe(0);
  });
  it("rejects source changes between receipt start and finish", () => {
    expect(run("receipt", "init").status).toBe(0);
    expect(run("receipt", "record", "--name", "check", "--command", "make check", "--exit-code", "0").status).toBe(0);
    write("coverage/source.json", { commit: "a".repeat(40), dirty: true, contentSha256: "c".repeat(64) });
    expect(run("receipt", "finish", "--status", "passed").status).not.toBe(0);
    expect(JSON.parse(readFileSync(join(root, "coverage/ci-local.json"))).status).toBe("failed");
  });
  it("never converts a failed check to a successful receipt", () => {
    expect(run("receipt", "init").status).toBe(0);
    expect(run("receipt", "record", "--name", "check", "--command", "make check", "--exit-code", "1").status).toBe(0);
    expect(run("receipt", "finish", "--status", "passed").status).not.toBe(0);
  });
  it("rejects a successful prefix with missing required checks", () => {
    expect(run("receipt", "init").status).toBe(0);
    expect(run("receipt", "record", "--name", "check", "--command", "make check", "--exit-code", "0").status).toBe(0);
    expect(run("receipt", "finish", "--status", "passed").status).not.toBe(0);
    expect(JSON.parse(readFileSync(join(root, "coverage/ci-local.json"))).status).toBe("failed");
  });
  it("requires all built artifacts even after the complete check graph", () => {
    expect(run("receipt", "init").status).toBe(0);
    for (const name of ["check", "coverage", "build", "chart", "verify", "release-check"]) expect(run("receipt", "record", "--name", name, "--command", `make ${name}`, "--exit-code", "0").status).toBe(0);
    expect(run("receipt", "finish", "--status", "passed").status).not.toBe(0);
  });
  it("rejects duplicate checks, missing options and invalid status", () => {
    expect(run("receipt", "init").status).toBe(0);
    expect(run("receipt", "record", "--name", "check", "--command", "make check").status).not.toBe(0);
    expect(run("receipt", "record", "--name", "check", "--command", "make check", "--exit-code", "0").status).toBe(0);
    expect(run("receipt", "record", "--name", "check", "--command", "make check", "--exit-code", "0").status).not.toBe(0);
    expect(run("receipt", "finish", "--status", "success").status).not.toBe(0);
  });
  it("rejects changes to a finished or malformed receipt", () => {
    expect(run("receipt", "init").status).toBe(0);
    expect(run("receipt", "finish", "--status", "failed").status).toBe(0);
    expect(run("receipt", "record", "--name", "check", "--command", "make check", "--exit-code", "0").status).not.toBe(0);
    write("coverage/ci-local.json", { schemaVersion: 1, source: {}, status: "running", checks: [] });
    expect(run("receipt", "finish", "--status", "passed").status).not.toBe(0);
  });
  it("records exit 3 as blocked and does not convert it to PASS", () => {
    expect(run("receipt", "init").status).toBe(0);
    expect(run("receipt", "record", "--name", "check", "--command", "make check", "--exit-code", "3").status).toBe(0);
    expect(run("receipt", "finish", "--status", "passed").status).not.toBe(0);
    expect(JSON.parse(readFileSync(join(root, "coverage/ci-local.json"))).status).toBe("blocked");
  });
  it("labels an explicit scoped plan without claiming full artifact acceptance", () => {
    write("coverage/ci-plan.json", { scope: "scoped", checks: ["check"] });
    expect(run("receipt", "init").status).toBe(0);
    expect(run("receipt", "record", "--name", "check", "--command", "make check", "--exit-code", "0").status).toBe(0);
    expect(run("receipt", "finish", "--status", "passed").status).toBe(0);
    const receipt = JSON.parse(readFileSync(join(root, "coverage/ci-local.json")));
    expect(receipt).toMatchObject({ scope: "scoped", status: "passed", artifacts: [] });
  });
  it("treats source corruption as failure even in a blocked run", () => {
    expect(run("receipt", "init").status).toBe(0);
    expect(run("receipt", "record", "--name", "check", "--command", "make check", "--exit-code", "3").status).toBe(0);
    write("coverage/source.json", { commit: "a".repeat(40), dirty: true, contentSha256: "c".repeat(64) });
    expect(run("receipt", "finish", "--status", "blocked").status).not.toBe(0);
    expect(JSON.parse(readFileSync(join(root, "coverage/ci-local.json"))).status).toBe("failed");
  });
});
