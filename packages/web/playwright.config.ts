import { defineConfig } from "@playwright/test";

// Scoped to tests/e2e so Playwright does not collect the Vitest suites, which
// clash over the jest-matchers symbol. The directory is currently empty; specs
// added there will be picked up automatically.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.VITE_API_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
  },
});
