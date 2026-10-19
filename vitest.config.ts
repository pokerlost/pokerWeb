import { fileURLToPath } from "node:url";
import { mergeConfig, defineConfig, configDefaults } from "vitest/config";
import viteConfig from "./vite.config";
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      exclude: [...configDefaults.exclude, "e2e/**"],
      root: fileURLToPath(new URL("./", import.meta.url)),
      coverage: {
        provider: "v8",
        reportsDirectory: "coverage/vitest",
        include: ["src/**/*.{ts,vue}", "tools/**/*.mjs"],
        exclude: ["src/**/__tests__/**", "tools/**/*.test.mjs"],
        reporter: ["text", "json", "json-summary", "lcov", "html"],
      },
    },
  }),
);
