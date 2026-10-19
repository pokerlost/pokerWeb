import { readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function coverageSummary(
  file = "coverage/vitest/coverage-summary.json",
  after = "coverage/.started",
) {
  if (statSync(file).mtimeMs < statSync(after).mtimeMs) throw new Error("Stale coverage report");
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (!data.total || Object.keys(data).length < 2) throw new Error("Missing coverage inventory");
  const rows = ["| Metric | Covered / total | Missing | Coverage |", "| --- | --- | --- | --- |"];
  const warnings = [];
  for (const key of ["statements", "lines", "functions", "branches"]) {
    const { covered, total } = data.total[key];
    if (
      !Number.isSafeInteger(total)
      || !Number.isSafeInteger(covered)
      || covered < 0
      || covered > total
    )
      throw new Error("Invalid coverage counters");
    if (key === "lines" && total === 0) throw new Error("No executable lines measured");
    const percentage = total ? `${((100 * covered) / total).toFixed(2)}%` : "notApplicable";
    rows.push(`| ${key} | ${covered} / ${total} | ${total - covered} | ${percentage} |`);
    if (covered < total)
      warnings.push(
        `Coverage advisory: ${key} ${covered}/${total} (${percentage}); ${total - covered} missing.`,
      );
  }
  return { markdown: `${rows.join("\n")}\n\nCoverage percentages are advisory.\n`, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = coverageSummary();
  for (const warning of result.warnings) {
    console.log(`WARNING: ${warning}`);
    if (process.env.GITHUB_ACTIONS === "true")
      console.log(
        `::warning::${warning.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}`,
      );
  }
  mkdirSync("coverage", { recursive: true });
  writeFileSync("coverage/summary.md", result.markdown);
  console.log(result.markdown);
}
