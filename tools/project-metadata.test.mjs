import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
    write("coverage/source.json", { commit: "a".repeat(40), dirty: false, contentSha256: "b".repeat(64) });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
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
});
