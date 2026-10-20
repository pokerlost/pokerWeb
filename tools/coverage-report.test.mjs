import { mkdtempSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { coverageSummary } from "./coverage-report.mjs";

describe("coverage evidence policy", () => {
  let directory;
  let file;
  let started;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "coverage-policy-"));
    file = join(directory, "summary.json");
    started = join(directory, "started");
    writeFileSync(started, "");
    const metric = { covered: 7, total: 10 };
    writeFileSync(
      file,
      JSON.stringify({
        "total": { statements: metric, lines: metric, functions: metric, branches: metric },
        "src/example.ts": {},
      }),
    );
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));
  it("returns advisory counts below 100 without rejecting the report", () => {
    expect(coverageSummary(file, started).warnings).toHaveLength(4);
    expect(coverageSummary(file, started).markdown).toContain("70.00%");
  });
  it("rejects missing, corrupt and invalid required evidence", () => {
    expect(() => coverageSummary(join(directory, "missing"), started)).toThrow(Error);
    for (const value of ["{broken", "{}", "{\"total\":{}}"]) {
      writeFileSync(file, value);
      expect(() => coverageSummary(file, started)).toThrow(Error);
    }
  });
  it("rejects stale reports", () => {
    utimesSync(file, 1, 1);
    expect(() => coverageSummary(file, started)).toThrow("Stale");
  });
});
