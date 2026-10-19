// @vitest-environment node
import assert from "node:assert/strict";
import { test } from "vitest";
import { ESLint } from "eslint";

test("native formatting preserves strings, interpolation and statement boundaries", async () => {
  const source = [
    "const quoted = 'a \"quote\" and \\n newline'",
    "const name = 'Ada'",
    "const label = `Player: ${name}`",
    "function value() {\n  return [quoted, label]\n}",
    "value()",
  ].join("\n");
  const eslint = new ESLint({ fix: true });
  const [result] = await eslint.lintText(source, { filePath: "src/style-fixture.ts" });
  assert.ok(result?.output);
  assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
  const formatted = result.output;
  const values = new Function(`${formatted}\nreturn value();`)();
  assert.deepEqual(values, ["a \"quote\" and \n newline", "Player: Ada"]);
  const [second] = await eslint.lintText(formatted, { filePath: "src/style-fixture.ts" });
  assert.equal(second?.output, undefined);
  assert.equal(second?.errorCount, 0);
});

test("Vue script and attributes use their native syntax-aware rules", async () => {
  const source = "<script setup lang=\"ts\">\nconst title = 'say \"hello\"'\n</script>\n<template><button type='button' :title=\"title\">Hello</button></template>\n";
  const eslint = new ESLint({ fix: true });
  const [result] = await eslint.lintText(source, { filePath: "src/StyleFixture.vue" });
  assert.ok(result?.output);
  assert.equal(result.errorCount, 0);
  assert.ok(result.output.includes("type=\"button\""));
  const [second] = await eslint.lintText(result.output, { filePath: "src/StyleFixture.vue" });
  assert.equal(second?.output, undefined);
  assert.equal(second?.errorCount, 0);
});
