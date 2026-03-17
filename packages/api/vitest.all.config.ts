import { defineConfig } from "vitest/config";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, ".env.test"), override: true });

// Combined config: runs unit + integration tests together for coverage measurement.
// Requires DATABASE_URL and JWT_SECRET env vars (same as test-integration).
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "tests/",
        "prisma/",
        "src/server.ts",
        "src/config/env.ts",
        "src/config/prisma.ts",
        "src/middleware/errorHandler.ts",
        "src/plugins/auth.plugin.ts",
        "vitest.*.config.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@prompttrack/shared": path.resolve(__dirname, "../shared/src"),
    },
  },
});
