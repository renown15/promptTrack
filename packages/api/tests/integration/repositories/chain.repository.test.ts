import { describe, it, expect, beforeEach } from "vitest";
import { prisma, truncateAll } from "../setup.js";
import { chainRepository } from "@/repositories/chain.repository.js";

async function createUser() {
  return prisma.user.create({
    data: { email: "test@example.com", passwordHash: "hash", name: "Tester" },
  });
}

describe("chainRepository", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe("create + findById", () => {
    it("creates a chain and retrieves it", async () => {
      const user = await createUser();
      const chain = await chainRepository.create({
        name: "My Chain",
        slug: "my-chain",
        createdBy: user.id,
      });

      expect(chain.id).toBeDefined();
      expect(chain.name).toBe("My Chain");
      expect(chain.isArchived).toBe(false);
      expect(chain.currentVersion).toBe(1);

      const found = await chainRepository.findById(chain.id);
      expect(found?.name).toBe("My Chain");
    });

    it("returns null for unknown id", async () => {
      expect(await chainRepository.findById("nope")).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("returns null for unknown slug", async () => {
      expect(await chainRepository.findBySlug("nope")).toBeNull();
    });

    it("returns chain for known slug", async () => {
      const user = await createUser();
      await chainRepository.create({
        name: "Slug Chain",
        slug: "slug-chain",
        createdBy: user.id,
      });
      const found = await chainRepository.findBySlug("slug-chain");
      expect(found?.name).toBe("Slug Chain");
    });
  });

  describe("findAll", () => {
    it("excludes archived chains by default", async () => {
      const user = await createUser();
      const active = await chainRepository.create({
        name: "Active",
        slug: "active",
        createdBy: user.id,
      });
      const archived = await chainRepository.create({
        name: "Archived",
        slug: "archived",
        createdBy: user.id,
      });
      await chainRepository.archive(archived.id);

      const results = await chainRepository.findAll();
      const ids = results.map((c) => c.id);
      expect(ids).toContain(active.id);
      expect(ids).not.toContain(archived.id);
    });
  });

  describe("update", () => {
    it("updates name and tags", async () => {
      const user = await createUser();
      const chain = await chainRepository.create({
        name: "Old",
        slug: "old",
        createdBy: user.id,
      });
      const updated = await chainRepository.update(chain.id, {
        name: "New",
        tags: ["ai", "coding"],
      });
      expect(updated.name).toBe("New");
      expect(updated.tags).toEqual(["ai", "coding"]);
    });
  });

  describe("incrementVersion", () => {
    it("bumps currentVersion by 1", async () => {
      const user = await createUser();
      const chain = await chainRepository.create({
        name: "Versioned",
        slug: "versioned",
        createdBy: user.id,
      });
      const updated = await chainRepository.incrementVersion(chain.id);
      expect(updated.currentVersion).toBe(2);
    });
  });

  describe("archive", () => {
    it("sets isArchived to true", async () => {
      const user = await createUser();
      const chain = await chainRepository.create({
        name: "ToArchive",
        slug: "to-archive",
        createdBy: user.id,
      });
      const archived = await chainRepository.archive(chain.id);
      expect(archived.isArchived).toBe(true);
    });
  });
});
