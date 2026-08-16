import { beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://prompttrack:prompttrack_test@localhost:5453/prompttrack_test";

export const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DATABASE_URL } },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Truncate all application tables between tests.
 * Call this in a beforeEach inside test files that need a clean slate.
 */
export async function truncateAll() {
  // Order respects FK constraints — children before parents
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      audit_logs,
      chain_edges,
      chain_nodes,
      chain_versions,
      chain_collections,
      prompt_collections,
      prompt_versions,
      template_variables,
      collections,
      prompts,
      chains,
      refresh_tokens,
      users
    RESTART IDENTITY CASCADE
  `);
}
