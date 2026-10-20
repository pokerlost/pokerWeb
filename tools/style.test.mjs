// @vitest-environment node
import assert from "node:assert/strict";

import { beforeAll, test } from "vitest";
import { ESLint } from "eslint";

const eslint = new ESLint({ fix: true });

beforeAll(async () => {
  await eslint.calculateConfigForFile("src/style-fixture.ts");
  await eslint.calculateConfigForFile("src/StyleFixture.vue");
});

test("native formatting preserves strings, interpolation and statement boundaries", async () => {
  const source = [
    "const quoted = 'a \"quote\" and \\n newline'",
    "const name = 'Ada'",
    "const label = `Player: ${name}`",
    "function value() {\n  return [quoted, label]\n}",
    "value()",
  ].join("\n");
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
  const [result] = await eslint.lintText(source, { filePath: "src/StyleFixture.vue" });
  assert.ok(result?.output);
  assert.equal(result.errorCount, 0);
  assert.ok(result.output.includes("type=\"button\""));
  const [second] = await eslint.lintText(result.output, { filePath: "src/StyleFixture.vue" });
  assert.equal(second?.output, undefined);
  assert.equal(second?.errorCount, 0);
});

test("imports use origin groups, type-only declarations and exact spacing", async () => {
  const source = [
    "import { local } from './local'",
    "import type { GameTheme } from '@/game/bridge'",
    "import lock from '#game-artifact' with { type: 'json' }",
    "import { ref, Ref } from 'vue'",
    "import { resolve } from 'node:path'",
    "export function value(theme: GameTheme): Ref<string> {\n  return ref(resolve(local, theme, lock.image))\n}",
  ].join("\n");
  const [result] = await eslint.lintText(source, { filePath: "tools/import-fixture.ts" });
  assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
  assert.ok(result.output.includes("from \"node:path\";\n\nimport"));
  assert.ok(result.output.includes("from \"vue\";\n\nimport type { GameTheme }"));
  assert.ok(result.output.includes("import type { Ref } from \"vue\";"));
  assert.ok(result.output.includes("from \"@/game/bridge\";\nimport lock"));
  assert.ok(result.output.includes("with { type: \"json\" };\n\nimport { local }"));
  assert.ok(result.output.includes("from \"./local\";\n\nexport function"));
  const [second] = await eslint.lintText(result.output, { filePath: "tools/import-fixture.ts" });
  assert.equal(second.output, undefined);
  assert.equal(second.errorCount, 0);
});

test("Vue imports, props and SFC blocks have native idempotent spacing", async () => {
  const source = [
    "<script setup lang=\"ts\">",
    "import type { GameTheme } from '@/game/bridge'",
    "import { ref } from 'vue'",
    "const props = defineProps<{ theme: GameTheme }>()",
    "const theme = ref(props.theme)",
    "</script>",
    "<template><p>{{ theme }}</p></template>",
    "<style scoped>p { color: inherit; }</style>",
  ].join("\n");
  const [result] = await eslint.lintText(source, { filePath: "src/ImportFixture.vue" });
  assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
  assert.ok(result.output.includes("from \"vue\";\n\nimport type { GameTheme }"));
  assert.ok(result.output.includes("from \"@/game/bridge\";\n\nconst props"));
  assert.ok(result.output.includes("</script>\n\n<template>"));
  assert.ok(result.output.includes("</template>\n\n<style"));
  const [second] = await eslint.lintText(result.output, { filePath: "src/ImportFixture.vue" });
  assert.equal(second.output, undefined);
  assert.equal(second.errorCount, 0);
});

test("autofix preserves CSS and polyfill barriers instead of changing evaluation order", async () => {
  const source = [
    "import { local } from './local'",
    "import './first.css'",
    "import 'polyfill-package'",
    "import './second.css'",
    "import { ref } from 'vue'",
    "export const value = ref(local)",
  ].join("\n");
  const [result] = await eslint.lintText(source, { filePath: "src/side-effects-fixture.ts" });
  assert.deepEqual(result.messages.map(message => message.ruleId), ["import-x/order"]);
  const formatted = result.output;
  const specifiers = ["./local", "./first.css", "polyfill-package", "./second.css", "vue"];
  const positions = specifiers.map(specifier => formatted.indexOf(`"${specifier}"`));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  const [second] = await eslint.lintText(formatted, { filePath: "src/side-effects-fixture.ts" });
  assert.equal(second.output, undefined);
  assert.deepEqual(second.messages.map(message => message.ruleId), ["import-x/order"]);
});
