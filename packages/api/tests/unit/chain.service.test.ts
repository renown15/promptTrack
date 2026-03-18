import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChainError } from "@/services/chain.service.js";

vi.mock("@/repositories/chain.repository.js", () => ({
  chainRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    incrementVersion: vi.fn(),
    archive: vi.fn(),
    findByPromptId: vi.fn(),
  },
}));

vi.mock("@/repositories/chain-version.repository.js", () => ({
  chainVersionRepository: {
    findCurrent: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/repositories/prompt-version.repository.js", () => ({
  promptVersionRepository: {
    findByPromptId: vi.fn(),
    findByVersion: vi.fn(),
    create: vi.fn(),
  },
}));

import { chainRepository } from "@/repositories/chain.repository.js";
import { chainVersionRepository } from "@/repositories/chain-version.repository.js";
import { promptVersionRepository } from "@/repositories/prompt-version.repository.js";
import { chainService } from "@/services/chain.service.js";

const baseChain = {
  id: "c1",
  name: "Test Chain",
  slug: "test-chain",
  description: null,
  tags: [],
  currentVersion: 1,
  isArchived: false,
  createdBy: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseVersion = {
  id: "cv1",
  chainId: "c1",
  versionNumber: 1,
  changelog: null,
  createdBy: "u1",
  createdAt: new Date(),
  nodes: [],
  edges: [],
};

describe("chainService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("list", () => {
    it("delegates to repository", async () => {
      vi.mocked(chainRepository.findAll).mockResolvedValue([baseChain]);
      const result = await chainService.list();
      expect(chainRepository.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(1);
    });

    it("passes filters through", async () => {
      vi.mocked(chainRepository.findAll).mockResolvedValue([]);
      await chainService.list({ isArchived: true });
      expect(chainRepository.findAll).toHaveBeenCalledWith({
        isArchived: true,
      });
    });
  });

  describe("getById", () => {
    it("throws 404 when chain not found", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(null);
      await expect(chainService.getById("bad-id")).rejects.toThrow(ChainError);
      await expect(chainService.getById("bad-id")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("returns chain with currentVersionData", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(
        baseVersion
      );
      const result = await chainService.getById("c1");
      expect(result.id).toBe("c1");
      expect(result.currentVersionData).toEqual(baseVersion);
    });
  });

  describe("create", () => {
    it("generates slug from name", async () => {
      vi.mocked(chainRepository.findBySlug).mockResolvedValue(null);
      vi.mocked(chainRepository.create).mockResolvedValue(baseChain);
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(null);

      await chainService.create("u1", { name: "My Chain", tags: [] });

      expect(chainRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "my-chain" })
      );
    });

    it("appends suffix for duplicate slugs", async () => {
      vi.mocked(chainRepository.findBySlug)
        .mockResolvedValueOnce(baseChain)
        .mockResolvedValue(null);
      vi.mocked(chainRepository.create).mockResolvedValue(baseChain);
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(null);

      await chainService.create("u1", { name: "Test Chain", tags: [] });

      expect(chainRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "test-chain-1" })
      );
    });

    it("includes description when provided", async () => {
      vi.mocked(chainRepository.findBySlug).mockResolvedValue(null);
      vi.mocked(chainRepository.create).mockResolvedValue({
        ...baseChain,
        description: "A desc",
      });
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(null);

      await chainService.create("u1", {
        name: "My Chain",
        description: "A desc",
        tags: [],
      });

      expect(chainRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: "A desc" })
      );
    });
  });

  describe("update", () => {
    it("throws 404 when chain not found", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(null);
      await expect(chainService.update("bad", { name: "X" })).rejects.toThrow(
        ChainError
      );
    });

    it("throws when chain is archived", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue({
        ...baseChain,
        isArchived: true,
      });
      await expect(chainService.update("c1", { name: "X" })).rejects.toThrow(
        ChainError
      );
    });

    it("calls repository update with provided fields", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(chainRepository.update).mockResolvedValue({
        ...baseChain,
        name: "Updated",
      });

      await chainService.update("c1", { name: "Updated" });

      expect(chainRepository.update).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({ name: "Updated" })
      );
    });

    it("includes description when provided", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(chainRepository.update).mockResolvedValue({
        ...baseChain,
        description: "New desc",
      });

      await chainService.update("c1", { description: "New desc" });

      expect(chainRepository.update).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({ description: "New desc" })
      );
    });
  });

  describe("createVersion", () => {
    it("throws 404 when chain not found", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(null);
      await expect(
        chainService.createVersion("bad", "u1", { nodes: [], edges: [] })
      ).rejects.toThrow(ChainError);
    });

    it("throws when chain is archived", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue({
        ...baseChain,
        isArchived: true,
      });
      await expect(
        chainService.createVersion("c1", "u1", { nodes: [], edges: [] })
      ).rejects.toThrow(ChainError);
    });

    it("creates version and increments chain version counter", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(chainVersionRepository.create).mockResolvedValue(baseVersion);
      vi.mocked(chainRepository.incrementVersion).mockResolvedValue({
        ...baseChain,
        currentVersion: 2,
      });

      await chainService.createVersion("c1", "u1", { nodes: [], edges: [] });

      expect(chainVersionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ chainId: "c1", versionNumber: 2 })
      );
      expect(chainRepository.incrementVersion).toHaveBeenCalledWith("c1");
    });

    it("maps edges including optional label", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(chainVersionRepository.create).mockResolvedValue(baseVersion);
      vi.mocked(chainRepository.incrementVersion).mockResolvedValue({
        ...baseChain,
        currentVersion: 2,
      });

      await chainService.createVersion("c1", "u1", {
        nodes: [],
        edges: [
          {
            edgeId: "e1",
            sourceNodeId: "n1",
            targetNodeId: "n2",
            label: "yes",
          },
          { edgeId: "e2", sourceNodeId: "n2", targetNodeId: "n3" },
        ],
      });

      expect(chainVersionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          edges: expect.arrayContaining([
            expect.objectContaining({ edgeId: "e1", label: "yes" }),
            expect.objectContaining({ edgeId: "e2" }),
          ]),
        })
      );
    });

    it("resolves snapshot content for copy nodes", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(promptVersionRepository.findByVersion).mockResolvedValue({
        id: "pv1",
        versionNumber: 1,
        content: "snapshot text",
        role: "user",
        changelog: null,
        modelParameters: {},
        promptId: "p1",
        createdBy: "u1",
        createdAt: new Date(),
        variables: [],
      });
      vi.mocked(chainVersionRepository.create).mockResolvedValue(baseVersion);
      vi.mocked(chainRepository.incrementVersion).mockResolvedValue({
        ...baseChain,
        currentVersion: 2,
      });

      await chainService.createVersion("c1", "u1", {
        nodes: [
          {
            nodeId: "n1",
            promptId: "p1",
            promptVersionNumber: 1,
            refType: "copy",
            positionX: 0,
            positionY: 0,
          },
        ],
        edges: [],
      });

      expect(chainVersionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({ snapshotContent: "snapshot text" }),
          ]),
        })
      );
    });

    it("throws 404 when copy node prompt version not found", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(promptVersionRepository.findByVersion).mockResolvedValue(null);

      await expect(
        chainService.createVersion("c1", "u1", {
          nodes: [
            {
              nodeId: "n1",
              promptId: "p1",
              promptVersionNumber: 1,
              refType: "copy",
              positionX: 0,
              positionY: 0,
            },
          ],
          edges: [],
        })
      ).rejects.toThrow(ChainError);
    });
  });

  describe("archive", () => {
    it("throws 404 when chain not found", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(null);
      await expect(chainService.archive("bad")).rejects.toThrow(ChainError);
    });

    it("calls repository archive", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      vi.mocked(chainRepository.archive).mockResolvedValue({
        ...baseChain,
        isArchived: true,
      });

      await chainService.archive("c1");

      expect(chainRepository.archive).toHaveBeenCalledWith("c1");
    });
  });

  describe("getVariables", () => {
    it("throws 404 when chain not found", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(null);
      await expect(chainService.getVariables("bad")).rejects.toThrow(
        ChainError
      );
    });

    it("returns chain data", async () => {
      vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
      const result = await chainService.getVariables("c1");
      expect(result.id).toBe("c1");
    });
  });
});
