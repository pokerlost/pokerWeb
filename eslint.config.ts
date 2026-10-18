import { defineConfig, globalIgnores } from 'eslint/config'
import typescriptEslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import pluginPlaywright from 'eslint-plugin-playwright'
import pluginVitest from '@vitest/eslint-plugin'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

export default defineConfig(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    'public/game/**',
    '.aws/**',
    '.agents/**',
    '.codex/**',
    '.local/**',
    'backups/**',
  ]),

  {
    files: ['**/*.{vue,ts,mts,tsx}'],
    extends: [typescriptEslint.configs.recommended, pluginVue.configs['flat/essential']],
    languageOptions: { parserOptions: { parser: typescriptEslint.parser } },
  },

  {
    ...pluginPlaywright.configs['flat/recommended'],
    files: ['e2e/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)
