import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionError } from "@/services/collection.service.js";

vi.mock("@/repositories/collection.repository.js", () => ({
  collectionRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addPrompt: vi.fn(),
    removePrompt: vi.fn(),
    addChain: vi.fn(),
    removeChain: vi.fn(),
    getTree: vi.fn(),
  },
}));

import { collectionRepository } from "@/repositories/collection.repository.js";
import { collectionService } from "@/services/collection.service.js";

const baseCollection = {
  id: "col1",
  name: "My Collection",
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("collectionService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("list", () => {
    it("delegates to repository", async () => {
      vi.mocked(collectionRepository.findAll).mockResolvedValue([
        baseCollection,
      ]);
      const result = await collectionService.list();
      expect(collectionRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe("getById", () => {
    it("throws 404 when not found", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(null);
      await expect(collectionService.getById("bad")).rejects.toThrow(
        CollectionError
      );
      await expect(collectionService.getById("bad")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("returns collection when found", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        baseCollection
      );
      const result = await collectionService.getById("col1");
      expect(result.id).toBe("col1");
    });
  });

  describe("create", () => {
    it("delegates to repository with name", async () => {
      vi.mocked(collectionRepository.create).mockResolvedValue(baseCollection);
      await collectionService.create({ name: "My Collection" });
      expect(collectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "My Collection" })
      );
    });

    it("passes description when provided", async () => {
      vi.mocked(collectionRepository.create).mockResolvedValue(baseCollection);
      await collectionService.create({ name: "X", description: "desc" });
      expect(collectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: "desc" })
      );
    });
  });

  describe("update", () => {
    it("throws 404 when not found", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(null);
      await expect(
        collectionService.update("bad", { name: "X" })
      ).rejects.toThrow(CollectionError);
    });

    it("calls repository update", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        baseCollection
      );
      vi.mocked(collectionRepository.update).mockResolvedValue({
        ...baseCollection,
        name: "Updated",
      });

      await collectionService.update("col1", { name: "Updated" });

      expect(collectionRepository.update).toHaveBeenCalledWith(
        "col1",
        expect.objectContaining({ name: "Updated" })
      );
    });

    it("passes description and directory when provided", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        baseCollection
      );
      vi.mocked(collectionRepository.update).mockResolvedValue({
        ...baseCollection,
        description: "new desc",
        directory: "/some/dir",
      } as never);

      await collectionService.update("col1", {
        description: "new desc",
        directory: "/some/dir",
      });

      expect(collectionRepository.update).toHaveBeenCalledWith(
        "col1",
        expect.objectContaining({
          description: "new desc",
          directory: "/some/dir",
        })
      );
    });
  });

  describe("delete", () => {
    it("throws 404 when not found", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(null);
      await expect(collectionService.delete("bad")).rejects.toThrow(
        CollectionError
      );
    });

    it("calls repository delete", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        baseCollection
      );
      vi.mocked(collectionRepository.delete).mockResolvedValue(undefined);

      await collectionService.delete("col1");

      expect(collectionRepository.delete).toHaveBeenCalledWith("col1");
    });
  });

  describe("addPrompt", () => {
    it("throws 404 when collection not found", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(null);
      await expect(collectionService.addPrompt("bad", "p1")).rejects.toThrow(
        CollectionError
      );
    });

    it("calls repository addPrompt", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        baseCollection
      );
      vi.mocked(collectionRepository.addPrompt).mockResolvedValue(undefined);

      await collectionService.addPrompt("col1", "p1");

      expect(collectionRepository.addPrompt).toHaveBeenCalledWith("col1", "p1");
    });
  });

  describe("removePrompt", () => {
    it("calls repository removePrompt", async () => {
      vi.mocked(collectionRepository.removePrompt).mockResolvedValue(undefined);
      await collectionService.removePrompt("col1", "p1");
      expect(collectionRepository.removePrompt).toHaveBeenCalledWith(
        "col1",
        "p1"
      );
    });
  });

  describe("addChain", () => {
    it("throws 404 when collection not found", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(null);
      await expect(collectionService.addChain("bad", "c1")).rejects.toThrow(
        CollectionError
      );
    });

    it("calls repository addChain", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        baseCollection
      );
      vi.mocked(collectionRepository.addChain).mockResolvedValue(undefined);

      await collectionService.addChain("col1", "c1");

      expect(collectionRepository.addChain).toHaveBeenCalledWith("col1", "c1");
    });
  });

  describe("removeChain", () => {
    it("calls repository removeChain", async () => {
      vi.mocked(collectionRepository.removeChain).mockResolvedValue(undefined);
      await collectionService.removeChain("col1", "c1");
      expect(collectionRepository.removeChain).toHaveBeenCalledWith(
        "col1",
        "c1"
      );
    });
  });

  describe("getTree", () => {
    it("maps raw tree data to DTOs", async () => {
      vi.mocked(collectionRepository.getTree).mockResolvedValue({
        collections: [
          {
            id: "col1",
            name: "My Collection",
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            prompts: [
              {
                promptId: "p1",
                collectionId: "col1",
                prompt: { id: "p1", name: "Prompt 1", slug: "prompt-1" },
              },
            ],
            chains: [],
          },
        ],
        ungroupedPrompts: [{ id: "p2", name: "Ungrouped", slug: "ungrouped" }],
        ungroupedChains: [],
      });

      const tree = await collectionService.getTree();

      expect(tree.collections).toHaveLength(1);
      expect(tree.collections[0].prompts).toHaveLength(1);
      expect(tree.collections[0].prompts[0].id).toBe("p1");
      expect(tree.ungrouped.prompts).toHaveLength(1);
      expect(tree.ungrouped.prompts[0].id).toBe("p2");
    });

    it("maps chain prompts from latest version nodes", async () => {
      vi.mocked(collectionRepository.getTree).mockResolvedValue({
        collections: [],
        ungroupedPrompts: [],
        ungroupedChains: [
          {
            id: "chain1",
            name: "Chain 1",
            slug: "chain-1",
            versions: [
              {
                nodes: [
                  { prompt: { id: "p1", name: "Prompt 1", slug: "prompt-1" } },
                ],
              },
            ],
          },
        ],
      });

      const tree = await collectionService.getTree();

      expect(tree.ungrouped.chains).toHaveLength(1);
      expect(tree.ungrouped.chains[0].prompts).toHaveLength(1);
      expect(tree.ungrouped.chains[0].prompts[0].id).toBe("p1");
    });

    it("maps chain prompts from chains inside collections", async () => {
      vi.mocked(collectionRepository.getTree).mockResolvedValue({
        collections: [
          {
            id: "col1",
            name: "Col",
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            prompts: [],
            chains: [
              {
                chainId: "c1",
                collectionId: "col1",
                chain: {
                  id: "c1",
                  name: "Chain A",
                  slug: "chain-a",
                  versions: [
                    {
                      nodes: [
                        {
                          prompt: {
                            id: "p1",
                            name: "P1",
                            slug: "p-1",
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
        ungroupedPrompts: [],
        ungroupedChains: [],
      });

      const tree = await collectionService.getTree();

      expect(tree.collections[0].chains).toHaveLength(1);
      expect(tree.collections[0].chains[0].prompts).toHaveLength(1);
      expect(tree.collections[0].chains[0].prompts[0].id).toBe("p1");
    });

    it("returns empty prompts for chains with no versions", async () => {
      vi.mocked(collectionRepository.getTree).mockResolvedValue({
        collections: [],
        ungroupedPrompts: [],
        ungroupedChains: [
          {
            id: "c1",
            name: "Empty Chain",
            slug: "empty-chain",
            versions: [],
          },
        ],
      });

      const tree = await collectionService.getTree();
      expect(tree.ungrouped.chains[0].prompts).toEqual([]);
    });
  });
});
