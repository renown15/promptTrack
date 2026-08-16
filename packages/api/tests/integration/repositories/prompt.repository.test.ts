import { describe, it, expect, beforeEach } from "vitest";
import { prisma, truncateAll } from "../setup.js";
import { promptRepository } from "@/repositories/prompt.repository.js";

async function createUser() {
  return prisma.user.create({
    data: { email: "test@example.com", passwordHash: "hash", name: "Tester" },
  });
}

describe("promptRepository", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe("create + findById", () => {
    it("creates a prompt and retrieves it by id", async () => {
      const user = await createUser();
      const prompt = await promptRepository.create({
        name: "My Prompt",
        slug: "my-prompt",
        createdBy: user.id,
      });

      expect(prompt.id).toBeDefined();
      expect(prompt.name).toBe("My Prompt");
      expect(prompt.slug).toBe("my-prompt");
      expect(prompt.isArchived).toBe(false);

      const found = await promptRepository.findById(prompt.id);
      expect(found?.name).toBe("My Prompt");
    });
  });

  describe("findBySlug", () => {
    it("returns null for unknown slug", async () => {
      const result = await promptRepository.findBySlug("does-not-exist");
      expect(result).toBeNull();
    });

    it("returns the prompt for a known slug", async () => {
      const user = await createUser();
      await promptRepository.create({
        name: "Slug Test",
        slug: "slug-test",
        createdBy: user.id,
      });

      const found = await promptRepository.findBySlug("slug-test");
      expect(found?.name).toBe("Slug Test");
    });
  });

  describe("findAll", () => {
    it("returns only non-archived prompts by default", async () => {
      const user = await createUser();
      const p1 = await promptRepository.create({
        name: "Active",
        slug: "active",
        createdBy: user.id,
      });
      const p2 = await promptRepository.create({
        name: "Archived",
        slug: "archived",
        createdBy: user.id,
      });
      await promptRepository.archive(p2.id);

      const results = await promptRepository.findAll();
      const ids = results.map((p) => p.id);
      expect(ids).toContain(p1.id);
      expect(ids).not.toContain(p2.id);
    });

    it("returns archived prompts when filter is set", async () => {
      const user = await createUser();
      const p = await promptRepository.create({
        name: "Archived",
        slug: "archived",
        createdBy: user.id,
      });
      await promptRepository.archive(p.id);

      const results = await promptRepository.findAll({ isArchived: true });
      expect(results.map((r) => r.id)).toContain(p.id);
    });
  });

  describe("update", () => {
    it("updates the name field", async () => {
      const user = await createUser();
      const p = await promptRepository.create({
        name: "Old Name",
        slug: "old-name",
        createdBy: user.id,
      });

      const updated = await promptRepository.update(p.id, { name: "New Name" });
      expect(updated.name).toBe("New Name");
    });
  });

  describe("incrementVersion", () => {
    it("increments currentVersion by 1", async () => {
      const user = await createUser();
      const p = await promptRepository.create({
        name: "Versioned",
        slug: "versioned",
        createdBy: user.id,
      });
      expect(p.currentVersion).toBe(1);

      const updated = await promptRepository.incrementVersion(p.id);
      expect(updated.currentVersion).toBe(2);
    });
  });

  describe("archive", () => {
    it("sets isArchived to true", async () => {
      const user = await createUser();
      const p = await promptRepository.create({
        name: "ToArchive",
        slug: "to-archive",
        createdBy: user.id,
      });

      const archived = await promptRepository.archive(p.id);
      expect(archived.isArchived).toBe(true);
    });
  });
});
