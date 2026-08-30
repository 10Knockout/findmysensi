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
