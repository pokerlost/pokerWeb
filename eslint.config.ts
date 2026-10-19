import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import pluginPlaywright from "eslint-plugin-playwright";
import pluginVitest from "@vitest/eslint-plugin";
import pluginOxlint from "eslint-plugin-oxlint";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig(
  {
    name: "app/files-to-lint",
    files: ["**/*.{vue,js,mjs,cjs,ts,mts,cts,tsx}"],
  },

  globalIgnores([
    "**/dist/**",
    "**/dist-ssr/**",
    "**/coverage/**",
    "public/game/**",
    ".aws/**",
    ".agents/**",
    ".codex/**",
    ".local/**",
    "backups/**",
    ".vscode/**",
    ".serena/**",
  ]),

  {
    files: ["**/*.{vue,js,mjs,cjs,ts,mts,cts,tsx}"],
    extends: [typescriptEslint.configs.recommended, pluginVue.configs["flat/essential"]],
    languageOptions: { parserOptions: { parser: typescriptEslint.parser } },
  },

  {
    ...pluginPlaywright.configs["flat/recommended"],
    files: ["e2e/**/*.{test,spec}.{js,ts,jsx,tsx}"],
  },

  {
    ...pluginVitest.configs.recommended,
    files: ["src/**/__tests__/*"],
  },

  ...pluginOxlint.buildFromOxlintConfigFile(".oxlintrc.json"),

  stylistic.configs.customize({
    indent: 2,
    quotes: "double",
    semi: true,
    jsx: false,
    braceStyle: "1tbs",
  }),
  {
    rules: {
      "@stylistic/quotes": ["error", "double", { avoidEscape: false, allowTemplateLiterals: "never" }],
      "vue/html-quotes": ["error", "double"],
      "eqeqeq": ["error", "always"],
    },
  },
);
