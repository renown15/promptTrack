import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "tests/",
        "prisma/",
        "*.config.ts",
        "src/server.ts",
        "src/config/env.ts",
        "src/config/prisma.ts",
        "src/middleware/errorHandler.ts",
        "src/plugins/auth.plugin.ts",
        "src/routes/**",
        "src/services/insight.emitter.ts",
        "src/services/watcher.service.ts",
        "src/repositories/**",
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
