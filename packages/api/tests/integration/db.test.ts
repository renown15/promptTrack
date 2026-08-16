import { describe, it, expect, beforeEach } from "vitest";
import { prisma, truncateAll } from "./setup";

describe("database connection", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("connects and can query", async () => {
    const result = await prisma.$queryRaw<[{ one: number }]>`SELECT 1 AS one`;
    expect(result[0]?.one).toBe(1);
  });

  it("starts each test with an empty users table", async () => {
    const count = await prisma.user.count();
    expect(count).toBe(0);
  });

  it("can create and retrieve a user", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        passwordHash: "hash",
        name: "Test User",
      },
    });
    expect(user.email).toBe("test@example.com");

    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.name).toBe("Test User");
  });
});
