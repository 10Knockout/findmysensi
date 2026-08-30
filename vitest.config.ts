import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@findmysensi/protocol": resolve(
        __dirname,
        "packages/protocol/src/index.ts",
      ),
      "@findmysensi/aim-core": resolve(
        __dirname,
        "packages/aim-core/src/index.ts",
      ),
      "@findmysensi/input-browser": resolve(
        __dirname,
        "packages/input-browser/src/index.ts",
      ),
      "@findmysensi/performance": resolve(
        __dirname,
        "packages/performance/src/index.ts",
      ),
      "@findmysensi/render-canvas": resolve(
        __dirname,
        "packages/render-canvas/src/index.ts",
      ),
      "@findmysensi/scenarios": resolve(
        __dirname,
        "packages/scenarios/src/index.ts",
      ),
      "@findmysensi/analytics": resolve(
        __dirname,
        "packages/analytics/src/index.ts",
      ),
      "@findmysensi/scoring": resolve(
        __dirname,
        "packages/scoring/src/index.ts",
      ),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
