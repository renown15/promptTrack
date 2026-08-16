import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/chain.repository.js", () => ({
  chainRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/repositories/collection.repository.js", () => ({
  collectionRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/repositories/prompt.repository.js", () => ({
  promptService: {
    list: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock("@/services/chain-serialiser.service.js", () => ({
  chainSerialiserService: {
    serialise: vi.fn(),
  },
}));

vi.mock("@/services/discovery.service.js", () => ({
  discoveryService: {
    getAggregateStats: vi.fn(),
  },
}));

vi.mock("@/services/insight.service.js", () => ({
  insightService: {
    getState: vi.fn(),
  },
}));

vi.mock("@/services/prompt.service.js", () => ({
  promptService: {
    list: vi.fn(),
    getById: vi.fn(),
  },
}));

import { chainRepository } from "@/repositories/chain.repository.js";
import { collectionRepository } from "@/repositories/collection.repository.js";
import { agentToolHandlers } from "@/services/agent-tool-handlers.js";
import { chainSerialiserService } from "@/services/chain-serialiser.service.js";
import { discoveryService } from "@/services/discovery.service.js";
import { insightService } from "@/services/insight.service.js";
import { promptService } from "@/services/prompt.service.js";

describe("agentToolHandlers", () => {
  const collectionId = "coll-123";
  beforeEach(() => vi.clearAllMocks());

  describe("list_collections", () => {
    it("returns the collection", async () => {
      const collection = { id: collectionId, name: "Test" };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );

      const result = await agentToolHandlers.list_collections({}, collectionId);

      expect(result).toEqual([collection]);
      expect(collectionRepository.findById).toHaveBeenCalledWith(collectionId);
    });

    it("throws if collection not found", async () => {
      vi.mocked(collectionRepository.findById).mockResolvedValue(null);

      await expect(
        agentToolHandlers.list_collections({}, collectionId)
      ).rejects.toThrow("Collection not found");
    });
  });

  describe("list_prompts", () => {
    it("returns non-archived prompts", async () => {
      const prompts = [
        { id: "p1", name: "Draft", isArchived: false },
        { id: "p2", name: "Archived", isArchived: true },
      ];
      vi.mocked(promptService.list).mockResolvedValue(prompts as any);

      const result = await agentToolHandlers.list_prompts({}, collectionId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("p1");
    });

    it("filters by environment when provided", async () => {
      vi.mocked(promptService.list).mockResolvedValue([]);

      await agentToolHandlers.list_prompts(
        { environment: "production" },
        collectionId
      );

      expect(promptService.list).toHaveBeenCalledWith({
        collectionId,
        environment: "production",
      });
    });

    it("validates environment enum", async () => {
      await expect(
        agentToolHandlers.list_prompts({ environment: "invalid" }, collectionId)
      ).rejects.toThrow();
    });

    it("passes collectionId to service", async () => {
      vi.mocked(promptService.list).mockResolvedValue([]);

      await agentToolHandlers.list_prompts({}, collectionId);

      expect(promptService.list).toHaveBeenCalledWith({
        collectionId,
      });
    });
  });

  describe("get_prompt", () => {
    it("fetches prompt by ID", async () => {
      const prompt = {
        id: "p1",
        name: "Sys",
        slug: "sys",
        versions: [{ content: "content" }],
      };
      vi.mocked(promptService.getById).mockResolvedValue(prompt as any);
      vi.mocked(promptService.list).mockResolvedValue([]);

      const result = await agentToolHandlers.get_prompt(
        { id: "p1" },
        collectionId
      );

      expect(result.id).toBe("p1");
      expect(result.content).toBe("content");
    });

    it("falls back to slug if ID not found", async () => {
      const prompts = [{ id: "p1", slug: "my-prompt" }];
      vi.mocked(promptService.getById)
        .mockRejectedValueOnce(new Error("Not found"))
        .mockResolvedValueOnce({
          id: "p1",
          name: "Prompt",
          slug: "my-prompt",
          versions: [],
        } as any);
      vi.mocked(promptService.list).mockResolvedValue(prompts as any);

      const result = await agentToolHandlers.get_prompt(
        { id: "my-prompt" },
        collectionId
      );

      expect(result.id).toBe("p1");
    });

    it("throws if both ID and slug not found", async () => {
      vi.mocked(promptService.getById).mockRejectedValue(new Error());
      vi.mocked(promptService.list).mockResolvedValue([]);

      await expect(
        agentToolHandlers.get_prompt({ id: "nonexistent" }, collectionId)
      ).rejects.toThrow('No prompt found: "nonexistent"');
    });

    it("returns null version fields when not available", async () => {
      const prompt = {
        id: "p1",
        name: "Prompt",
        slug: "p",
        versions: [],
      };
      vi.mocked(promptService.getById).mockResolvedValue(prompt as any);
      vi.mocked(promptService.list).mockResolvedValue([]);

      const result = await agentToolHandlers.get_prompt(
        { id: "p1" },
        collectionId
      );

      expect(result.content).toBeNull();
      expect(result.role).toBeNull();
      expect(result.variables).toEqual([]);
      expect(result.modelParameters).toEqual({});
    });

    it("requires id parameter", async () => {
      await expect(
        agentToolHandlers.get_prompt({}, collectionId)
      ).rejects.toThrow();
    });
  });

  describe("list_chains", () => {
    it("returns non-archived chains", async () => {
      const chains = [
        { id: "ch1", name: "Active", isArchived: false },
        { id: "ch2", name: "Archived", isArchived: true },
      ];
      vi.mocked(chainRepository.findAll).mockResolvedValue(chains as any);

      const result = await agentToolHandlers.list_chains({}, collectionId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("ch1");
    });

    it("passes collectionId to repository", async () => {
      vi.mocked(chainRepository.findAll).mockResolvedValue([]);

      await agentToolHandlers.list_chains({}, collectionId);

      expect(chainRepository.findAll).toHaveBeenCalledWith({
        collectionId,
      });
    });
  });

  describe("get_chain", () => {
    it("fetches chain by ID", async () => {
      const chain = { id: "ch1", slug: "chain-1" };
      vi.mocked(chainRepository.findById).mockResolvedValue(chain as any);
      vi.mocked(chainRepository.findAll).mockResolvedValue([]);

      const result = await agentToolHandlers.get_chain(
        { id: "ch1" },
        collectionId
      );

      expect(result.id).toBe("ch1");
    });

    it("falls back to slug if ID not found", async () => {
      const chains = [{ id: "ch1", slug: "my-chain" }];
      vi.mocked(chainRepository.findById)
        .mockRejectedValueOnce(new Error())
        .mockResolvedValueOnce({ id: "ch1", slug: "my-chain" } as any);
      vi.mocked(chainRepository.findAll).mockResolvedValue(chains as any);

      const result = await agentToolHandlers.get_chain(
        { id: "my-chain" },
        collectionId
      );

      expect(result.id).toBe("ch1");
    });

    it("throws if chain not found by ID or slug", async () => {
      vi.mocked(chainRepository.findById).mockRejectedValue(new Error());
      vi.mocked(chainRepository.findAll).mockResolvedValue([]);

      await expect(
        agentToolHandlers.get_chain({ id: "nonexistent" }, collectionId)
      ).rejects.toThrow('No chain found: "nonexistent"');
    });

    it("requires id parameter", async () => {
      await expect(
        agentToolHandlers.get_chain({}, collectionId)
      ).rejects.toThrow();
    });
  });

  describe("serialise_chain", () => {
    it("serialises chain with variables", async () => {
      const messages = [{ role: "system", content: "test" }];
      vi.mocked(chainSerialiserService.serialise).mockResolvedValue(messages);

      const result = await agentToolHandlers.serialise_chain(
        { id: "ch1", variables: { lang: "python" } },
        collectionId
      );

      expect(result).toEqual(messages);
      expect(chainSerialiserService.serialise).toHaveBeenCalledWith("ch1", {
        lang: "python",
      });
    });

    it("defaults variables to empty object", async () => {
      vi.mocked(chainSerialiserService.serialise).mockResolvedValue([]);

      await agentToolHandlers.serialise_chain({ id: "ch1" }, collectionId);

      expect(chainSerialiserService.serialise).toHaveBeenCalledWith("ch1", {});
    });

    it("requires id parameter", async () => {
      await expect(
        agentToolHandlers.serialise_chain({}, collectionId)
      ).rejects.toThrow();
    });

    it("validates variables are strings", async () => {
      await expect(
        agentToolHandlers.serialise_chain(
          { id: "ch1", variables: { num: 123 } },
          collectionId
        )
      ).rejects.toThrow();
    });
  });

  describe("get_repo_status", () => {
    it("returns status with coverage and lint data", async () => {
      const collection = { id: collectionId, name: "Test", directory: "/repo" };
      const state = { scanning: false, lastScan: new Date(), files: [] };
      const aggregate = { coverage: { linesPct: 85 }, lint: { errors: 2 } };

      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );
      vi.mocked(insightService.getState).mockReturnValue(state as any);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );

      const result = await agentToolHandlers.get_repo_status({}, collectionId);

      expect(result).toHaveProperty("coverage", 85);
      expect(result).toHaveProperty("lintErrors", 2);
    });

    it("handles missing directory", async () => {
      const collection = { id: collectionId, name: "Test" };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );

      const result = await agentToolHandlers.get_repo_status({}, collectionId);

      expect(result).toHaveProperty("error");
    });

    it("validates repo name when provided", async () => {
      const collection = {
        id: collectionId,
        name: "OtherName",
        directory: "/",
      };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );

      await expect(
        agentToolHandlers.get_repo_status(
          { repo: "DifferentName" },
          collectionId
        )
      ).rejects.toThrow("Repo mismatch");
    });

    it("returns recommendations", async () => {
      const collection = { id: collectionId, name: "Test", directory: "/" };
      const state = {
        scanning: false,
        lastScan: new Date(),
        files: [
          {
            relativePath: "src/foo.ts",
            gitStatus: "untracked",
            coverage: 50,
            metrics: {},
          },
        ],
      };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );
      vi.mocked(insightService.getState).mockReturnValue(state as any);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue({
        coverage: { linesPct: 50 },
        lint: { errors: 0 },
      } as any);

      const result = await agentToolHandlers.get_repo_status({}, collectionId);

      expect(result).toHaveProperty("recommendations");
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("includes git status in response", async () => {
      const collection = { id: collectionId, name: "Test", directory: "/" };
      const state = {
        scanning: false,
        lastScan: new Date(),
        files: [
          {
            relativePath: "file1.ts",
            gitStatus: "untracked",
            coverage: null,
            metrics: {},
          },
          {
            relativePath: "file2.ts",
            gitStatus: "modified",
            coverage: null,
            metrics: {},
          },
        ],
      };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );
      vi.mocked(insightService.getState).mockReturnValue(state as any);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        {} as any
      );

      const result = await agentToolHandlers.get_repo_status({}, collectionId);

      expect(result.sourceControl.untracked).toBe(1);
      expect(result.sourceControl.modified).toBe(1);
      expect(result.sourceControl.untrackedFiles).toContain("file1.ts");
      expect(result.sourceControl.modifiedFiles).toContain("file2.ts");
    });
  });

  describe("list_problem_files", () => {
    it("returns files sorted by problem score", async () => {
      const collection = { id: collectionId, name: "Test", directory: "/" };
      const state = {
        scanning: false,
        lastScan: new Date(),
        files: [
          {
            relativePath: "src/low.ts",
            name: "low.ts",
            fileType: "ts",
            problemScore: 2,
            gitStatus: null,
            coverage: 80,
            lintErrors: 0,
            metrics: {},
          },
          {
            relativePath: "src/high.ts",
            name: "high.ts",
            fileType: "ts",
            problemScore: 9,
            gitStatus: null,
            coverage: 10,
            lintErrors: 5,
            metrics: { security: { status: "red" } },
          },
        ],
      };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );
      vi.mocked(insightService.getState).mockReturnValue(state as any);

      const result = await agentToolHandlers.list_problem_files(
        {},
        collectionId
      );

      expect(result.files[0].problemScore).toBe(9);
      expect(result.files[1].problemScore).toBe(2);
    });

    it("respects limit parameter", async () => {
      const collection = { id: collectionId, name: "Test", directory: "/" };
      const files = Array.from({ length: 50 }, (_, i) => ({
        relativePath: `src/file${i}.ts`,
        name: `file${i}.ts`,
        fileType: "ts",
        problemScore: 50 - i,
        gitStatus: null,
        coverage: null,
        lintErrors: 0,
        metrics: {},
      }));
      const state = { scanning: false, lastScan: new Date(), files };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );
      vi.mocked(insightService.getState).mockReturnValue(state as any);

      const result = await agentToolHandlers.list_problem_files(
        { limit: 10 },
        collectionId
      );

      expect(result.files).toHaveLength(10);
    });

    it("filters out files with zero problem score", async () => {
      const collection = { id: collectionId, name: "Test", directory: "/" };
      const state = {
        scanning: false,
        lastScan: new Date(),
        files: [
          {
            relativePath: "src/good.ts",
            name: "good.ts",
            fileType: "ts",
            problemScore: 0,
            gitStatus: null,
            coverage: 95,
            lintErrors: 0,
            metrics: {},
          },
          {
            relativePath: "src/bad.ts",
            name: "bad.ts",
            fileType: "ts",
            problemScore: 5,
            gitStatus: null,
            coverage: 10,
            lintErrors: 3,
            metrics: {},
          },
        ],
      };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );
      vi.mocked(insightService.getState).mockReturnValue(state as any);

      const result = await agentToolHandlers.list_problem_files(
        {},
        collectionId
      );

      expect(result.files).toHaveLength(1);
      expect(result.files[0].problemScore).toBe(5);
    });

    it("includes suggestedFix for each file", async () => {
      const collection = { id: collectionId, name: "Test", directory: "/" };
      const state = {
        scanning: false,
        lastScan: new Date(),
        files: [
          {
            relativePath: "src/file.ts",
            name: "file.ts",
            fileType: "ts",
            problemScore: 5,
            gitStatus: "untracked",
            coverage: null,
            lintErrors: 0,
            metrics: {},
          },
        ],
      };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );
      vi.mocked(insightService.getState).mockReturnValue(state as any);

      const result = await agentToolHandlers.list_problem_files(
        {},
        collectionId
      );

      expect(result.files[0]).toHaveProperty("suggestedFix");
      expect(typeof result.files[0].suggestedFix).toBe("string");
    });

    it("handles missing directory", async () => {
      const collection = { id: collectionId, name: "Test" };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );

      const result = await agentToolHandlers.list_problem_files(
        {},
        collectionId
      );

      expect(result).toHaveProperty("error");
      expect(result.files).toEqual([]);
    });

    it("validates limit is max 100", async () => {
      await expect(
        agentToolHandlers.list_problem_files({ limit: 101 }, collectionId)
      ).rejects.toThrow();
    });

    it("defaults limit to 20", async () => {
      const collection = { id: collectionId, name: "Test", directory: "/" };
      const files = Array.from({ length: 50 }, (_, i) => ({
        relativePath: `src/file${i}.ts`,
        name: `file${i}.ts`,
        fileType: "ts",
        problemScore: 1,
        gitStatus: null,
        coverage: null,
        lintErrors: 0,
        metrics: {},
      }));
      const state = { scanning: false, lastScan: new Date(), files };
      vi.mocked(collectionRepository.findById).mockResolvedValue(
        collection as any
      );
      vi.mocked(insightService.getState).mockReturnValue(state as any);

      const result = await agentToolHandlers.list_problem_files(
        {},
        collectionId
      );

      expect(result.files).toHaveLength(20);
    });
  });
});
