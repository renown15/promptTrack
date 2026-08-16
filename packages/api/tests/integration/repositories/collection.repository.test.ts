import { describe, it, expect, beforeEach } from "vitest";
import { prisma, truncateAll } from "../setup.js";
import { collectionRepository } from "@/repositories/collection.repository.js";
import { promptRepository } from "@/repositories/prompt.repository.js";

async function createUser() {
  return prisma.user.create({
    data: { email: "test@example.com", passwordHash: "hash", name: "Tester" },
  });
}

describe("collectionRepository", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe("create + findById", () => {
    it("creates and retrieves a collection", async () => {
      const col = await collectionRepository.create({ name: "Project Alpha" });

      expect(col.id).toBeDefined();
      expect(col.name).toBe("Project Alpha");
      expect(col.description).toBeNull();

      const found = await collectionRepository.findById(col.id);
      expect(found?.name).toBe("Project Alpha");
    });

    it("returns null for unknown id", async () => {
      const found = await collectionRepository.findById("does-not-exist");
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    it("returns all collections ordered by name", async () => {
      await collectionRepository.create({ name: "Zebra" });
      await collectionRepository.create({ name: "Alpha" });

      const all = await collectionRepository.findAll();
      expect(all[0].name).toBe("Alpha");
      expect(all[1].name).toBe("Zebra");
    });
  });

  describe("update", () => {
    it("updates name and description", async () => {
      const col = await collectionRepository.create({ name: "Old" });
      const updated = await collectionRepository.update(col.id, {
        name: "New",
        description: "A description",
      });
      expect(updated.name).toBe("New");
      expect(updated.description).toBe("A description");
    });
  });

  describe("delete", () => {
    it("removes the collection", async () => {
      const col = await collectionRepository.create({ name: "Temp" });
      await collectionRepository.delete(col.id);
      const found = await collectionRepository.findById(col.id);
      expect(found).toBeNull();
    });
  });

  describe("addPrompt / removePrompt", () => {
    it("links and unlinks a prompt", async () => {
      const user = await createUser();
      const col = await collectionRepository.create({ name: "Col" });
      const prompt = await promptRepository.create({
        name: "P1",
        slug: "p1",
        createdBy: user.id,
      });

      await collectionRepository.addPrompt(col.id, prompt.id);
      let tree = await collectionRepository.getTree();
      const linked = tree.collections.find((c) => c.id === col.id);
      expect(linked?.prompts.map((p) => p.promptId)).toContain(prompt.id);

      await collectionRepository.removePrompt(col.id, prompt.id);
      tree = await collectionRepository.getTree();
      const unlinked = tree.collections.find((c) => c.id === col.id);
      expect(unlinked?.prompts).toHaveLength(0);
    });

    it("is idempotent — double-adding does not error", async () => {
      const user = await createUser();
      const col = await collectionRepository.create({ name: "Col" });
      const prompt = await promptRepository.create({
        name: "P1",
        slug: "p1",
        createdBy: user.id,
      });

      await expect(
        collectionRepository.addPrompt(col.id, prompt.id)
      ).resolves.toBeUndefined();
      await expect(
        collectionRepository.addPrompt(col.id, prompt.id)
      ).resolves.toBeUndefined();
    });
  });

  describe("getTree", () => {
    it("returns ungrouped prompts for prompts not in any collection", async () => {
      const user = await createUser();
      await promptRepository.create({
        name: "Lone Prompt",
        slug: "lone-prompt",
        createdBy: user.id,
      });

      const tree = await collectionRepository.getTree();
      const ids = tree.ungroupedPrompts.map((p) => p.slug);
      expect(ids).toContain("lone-prompt");
    });

    it("excludes archived prompts from ungrouped list", async () => {
      const user = await createUser();
      const p = await promptRepository.create({
        name: "Gone",
        slug: "gone",
        createdBy: user.id,
      });
      await promptRepository.archive(p.id);

      const tree = await collectionRepository.getTree();
      expect(tree.ungroupedPrompts.map((x) => x.slug)).not.toContain("gone");
    });
  });
});
