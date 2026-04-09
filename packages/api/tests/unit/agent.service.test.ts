import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/agent-tool-handlers.js", () => ({
  agentToolHandlers: {
    list_collections: vi.fn(),
    list_prompts: vi.fn(),
    get_prompt: vi.fn(),
    list_chains: vi.fn(),
    get_chain: vi.fn(),
    serialise_chain: vi.fn(),
    get_repo_status: vi.fn(),
    list_problem_files: vi.fn(),
  },
}));

import { agentToolHandlers } from "@/services/agent-tool-handlers.js";
import { agentService } from "@/services/agent.service.js";

describe("agentService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getToolDefinitions", () => {
    it("returns array of tool definitions", () => {
      const tools = agentService.getToolDefinitions();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it("each tool has name, description, and inputSchema", () => {
      const tools = agentService.getToolDefinitions();
      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe("string");
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe("string");
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      }
    });

    it("includes all expected core tools", () => {
      const tools = agentService.getToolDefinitions();
      const names = tools.map((t) => t.name);
      expect(names).toContain("list_collections");
      expect(names).toContain("list_prompts");
      expect(names).toContain("get_prompt");
      expect(names).toContain("list_chains");
      expect(names).toContain("get_chain");
      expect(names).toContain("serialise_chain");
      expect(names).toContain("get_repo_status");
      expect(names).toContain("list_problem_files");
    });

    it("have meaningful required fields where needed", () => {
      const tools = agentService.getToolDefinitions();
      const getPrompt = tools.find((t) => t.name === "get_prompt");
      expect(getPrompt?.inputSchema.required).toContain("id");

      const getChain = tools.find((t) => t.name === "get_chain");
      expect(getChain?.inputSchema.required).toContain("id");

      const serialiseChain = tools.find((t) => t.name === "serialise_chain");
      expect(serialiseChain?.inputSchema.required).toContain("id");
    });

    it("list_prompts has environment enum", () => {
      const tools = agentService.getToolDefinitions();
      const listPrompts = tools.find((t) => t.name === "list_prompts");
      const envProp = listPrompts?.inputSchema.properties.environment as {
        enum?: string[];
      };
      expect(envProp?.enum).toEqual([
        "draft",
        "review",
        "staging",
        "production",
      ]);
    });

    it("schema tools have no required fields", () => {
      const tools = agentService.getToolDefinitions();
      const listCollections = tools.find((t) => t.name === "list_collections");
      const listChains = tools.find((t) => t.name === "list_chains");
      expect(listCollections?.inputSchema.required).toBeUndefined();
      expect(listChains?.inputSchema.required).toBeUndefined();
    });
  });

  describe("invokeTool", () => {
    const collectionId = "coll-123";

    it("invokes handler for known tool", async () => {
      const mockResult = { hello: "world" };
      vi.mocked(agentToolHandlers.list_collections).mockResolvedValue(
        mockResult
      );

      const result = await agentService.invokeTool(
        "list_collections",
        {},
        collectionId
      );

      expect(agentToolHandlers.list_collections).toHaveBeenCalledWith(
        {},
        collectionId
      );
      expect(result).toEqual(mockResult);
    });

    it("passes input and collectionId to handler", async () => {
      const input = { environment: "production" };
      vi.mocked(agentToolHandlers.list_prompts).mockResolvedValue([]);

      await agentService.invokeTool("list_prompts", input, collectionId);

      expect(agentToolHandlers.list_prompts).toHaveBeenCalledWith(
        input,
        collectionId
      );
    });

    it("throws error for unknown tool", async () => {
      await expect(
        agentService.invokeTool("unknown_tool", {}, collectionId)
      ).rejects.toThrow("Unknown tool: unknown_tool");
    });

    it("handles get_prompt with id", async () => {
      const prompt = { id: "p1", name: "System Prompt" };
      vi.mocked(agentToolHandlers.get_prompt).mockResolvedValue(prompt);

      const result = await agentService.invokeTool(
        "get_prompt",
        { id: "p1" },
        collectionId
      );

      expect(result).toEqual(prompt);
    });

    it("handles get_chain with id", async () => {
      const chain = { id: "ch1", name: "My Chain" };
      vi.mocked(agentToolHandlers.get_chain).mockResolvedValue(chain);

      const result = await agentService.invokeTool(
        "get_chain",
        { id: "ch1" },
        collectionId
      );

      expect(result).toEqual(chain);
    });

    it("handles serialise_chain with variables", async () => {
      const messages = [{ role: "system", content: "test" }];
      vi.mocked(agentToolHandlers.serialise_chain).mockResolvedValue(messages);

      const result = await agentService.invokeTool(
        "serialise_chain",
        { id: "ch1", variables: { lang: "python" } },
        collectionId
      );

      expect(result).toEqual(messages);
    });

    it("handles get_repo_status", async () => {
      const status = { coverage: 85, lint: 0 };
      vi.mocked(agentToolHandlers.get_repo_status).mockResolvedValue(status);

      const result = await agentService.invokeTool(
        "get_repo_status",
        { repo: "PromptTrack" },
        collectionId
      );

      expect(result).toEqual(status);
    });

    it("handles list_problem_files", async () => {
      const files = [{ path: "src/foo.ts", score: 8.5 }];
      vi.mocked(agentToolHandlers.list_problem_files).mockResolvedValue(files);

      const result = await agentService.invokeTool(
        "list_problem_files",
        { limit: 10 },
        collectionId
      );

      expect(result).toEqual(files);
    });

    it("propagates handler errors", async () => {
      vi.mocked(agentToolHandlers.list_collections).mockRejectedValue(
        new Error("Collection lookup failed")
      );

      await expect(
        agentService.invokeTool("list_collections", {}, collectionId)
      ).rejects.toThrow("Collection lookup failed");
    });
  });

  describe("tool definition validation", () => {
    it("repo_status tool has optional repo parameter", () => {
      const tools = agentService.getToolDefinitions();
      const repoStatus = tools.find((t) => t.name === "get_repo_status");
      const properties = repoStatus?.inputSchema.properties as Record<
        string,
        unknown
      >;
      expect(properties.repo).toBeDefined();
      expect(repoStatus?.inputSchema.required).toBeUndefined();
    });

    it("list_problem_files has optional limit parameter", () => {
      const tools = agentService.getToolDefinitions();
      const listProblems = tools.find((t) => t.name === "list_problem_files");
      const properties = listProblems?.inputSchema.properties as Record<
        string,
        unknown
      >;
      expect(properties.limit).toBeDefined();
    });

    it("serialise_chain has optional variables parameter", () => {
      const tools = agentService.getToolDefinitions();
      const serialise = tools.find((t) => t.name === "serialise_chain");
      const properties = serialise?.inputSchema.properties as Record<
        string,
        unknown
      >;
      expect(properties.variables).toBeDefined();
    });
  });
});
