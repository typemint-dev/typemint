import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.spec.ts", "**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.spec.ts", "**/*.test.ts", "**/index.ts"],
      reporter: ["text", "lcov"],
    },
  },
});
