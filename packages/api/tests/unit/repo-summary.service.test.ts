import type { FileSnapshot } from "@/services/insight.cache.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/insight.service.js", () => ({
  insightService: {
    getState: vi.fn(),
  },
}));

vi.mock("@/services/discovery.service.js", () => ({
  discoveryService: {
    getAggregateStats: vi.fn(),
  },
}));

vi.mock("@/services/ollama.service.js", () => ({
  ollamaService: {
    getConfig: vi.fn(),
    enabledMetrics: vi.fn(),
  },
}));

global.fetch = vi.fn();

import { discoveryService } from "@/services/discovery.service.js";
import { insightService } from "@/services/insight.service.js";
import { ollamaService } from "@/services/ollama.service.js";
import { repoSummaryService } from "@/services/repo-summary.service.js";

describe("repo-summary.service", () => {
  const collectionId = "coll-123";
  const directory = "/repo";

  beforeEach(() => vi.clearAllMocks());

  describe("generate", () => {
    it("fetches data from services", async () => {
      const state = { files: [] as FileSnapshot[] };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [],
      };

      vi.mocked(insightService.getState).mockReturnValue(state as any);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: "All good" }),
      } as any);

      await repoSummaryService.generate(collectionId, directory);

      expect(insightService.getState).toHaveBeenCalledWith(collectionId);
      expect(discoveryService.getAggregateStats).toHaveBeenCalledWith(
        directory
      );
      expect(ollamaService.getConfig).toHaveBeenCalled();
    });

    it("builds prompt with file count and coverage", async () => {
      const files = [
        {
          relativePath: "a.ts",
          lineCount: 100,
          gitStatus: null,
          metrics: {},
        },
        {
          relativePath: "b.ts",
          lineCount: 200,
          gitStatus: null,
          metrics: {},
        },
      ] as any[];
      const state = { files };
      const aggregate = {
        coverage: { linesPct: 85, reportedAt: "2025-04-09T10:00:00Z" },
        lint: null,
      };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [],
      };

      vi.mocked(insightService.getState).mockReturnValue(state);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: "Summary" }),
      } as any);

      await repoSummaryService.generate(collectionId, directory);

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((call[1]?.body ?? "") as string);
      expect(body.prompt).toContain("Files: 2");
      expect(body.prompt).toContain("300 lines"); // 100 + 200
      expect(body.prompt).toContain("Coverage: 85%");
    });

    it("counts analyzed files correctly", async () => {
      const files = [
        {
          relativePath: "a.ts",
          lineCount: 10,
          gitStatus: null,
          metrics: { security: { status: "green" } },
        },
        {
          relativePath: "b.ts",
          lineCount: 20,
          gitStatus: null,
          metrics: { security: "pending" },
        },
      ] as any[];
      const state = { files };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [{ name: "security" }],
      };

      vi.mocked(insightService.getState).mockReturnValue(state);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(
        config.metrics as any
      );
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: "Summary" }),
      } as any);

      await repoSummaryService.generate(collectionId, directory);

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((call[1]?.body ?? "") as string);
      expect(body.prompt).toContain("AI metrics analyzed: 1/2 files");
    });

    it("counts git status correctly", async () => {
      const files = [
        {
          relativePath: "a.ts",
          lineCount: 10,
          gitStatus: "modified",
          metrics: {},
        },
        {
          relativePath: "b.ts",
          lineCount: 10,
          gitStatus: "untracked",
          metrics: {},
        },
        {
          relativePath: "c.ts",
          lineCount: 10,
          gitStatus: null,
          metrics: {},
        },
      ] as any[];
      const state = { files };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [],
      };

      vi.mocked(insightService.getState).mockReturnValue(state);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: "Summary" }),
      } as any);

      await repoSummaryService.generate(collectionId, directory);

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((call[1]?.body ?? "") as string);
      expect(body.prompt).toContain("Git: 1 modified, 1 untracked");
    });

    it("identifies bad files (red metrics)", async () => {
      const files = [
        {
          relativePath: "src/bad.ts",
          lineCount: 10,
          gitStatus: null,
          metrics: { security: { status: "red" }, dry: { status: "red" } },
        },
      ] as any[];
      const state = { files };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [{ name: "security" }, { name: "dry" }],
      };

      vi.mocked(insightService.getState).mockReturnValue(state);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(
        config.metrics as any
      );
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: "Summary" }),
      } as any);

      await repoSummaryService.generate(collectionId, directory);

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((call[1]?.body ?? "") as string);
      expect(body.prompt).toContain("Files needing attention:");
      expect(body.prompt).toContain("src/bad.ts");
      expect(body.prompt).toContain("security:red");
      expect(body.prompt).toContain("dry:red");
    });

    it("identifies largest files", async () => {
      const files = [
        {
          relativePath: "normal.ts",
          lineCount: 50,
          gitStatus: null,
          metrics: {},
        },
        {
          relativePath: "huge.ts",
          lineCount: 500,
          gitStatus: null,
          metrics: {},
        },
        {
          relativePath: "tiny.ts",
          lineCount: 10,
          gitStatus: null,
          metrics: {},
        },
      ] as any[];
      const state = { files };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [],
      };

      vi.mocked(insightService.getState).mockReturnValue(state);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: "Summary" }),
      } as any);

      await repoSummaryService.generate(collectionId, directory);

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((call[1]?.body ?? "") as string);
      expect(body.prompt).toContain("Top 10 largest files");
      expect(body.prompt).toContain("huge.ts");
      // 500 / 186.67 avg ≈ 2.68x
      expect(body.prompt).toContain("×");
    });

    it("callsOllama with model parameter", async () => {
      const state = { files: [] as FileSnapshot[] };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "neural-chat",
        metrics: [],
      };

      vi.mocked(insightService.getState).mockReturnValue(state as any);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: "AI Response" }),
      } as any);

      await repoSummaryService.generate(collectionId, directory);

      const call = vi.mocked(global.fetch).mock.calls[0];
      expect(call[0]).toContain("/api/generate");
      const body = JSON.parse((call[1]?.body ?? "") as string);
      expect(body.model).toBe("neural-chat");
      expect(body.stream).toBe(false);
    });

    it("returns ollama response", async () => {
      const state = { files: [] as FileSnapshot[] };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [],
      };

      vi.mocked(insightService.getState).mockReturnValue(state as any);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ response: "  Clean repo  \n  with spaces  " }),
      } as any);

      const result = await repoSummaryService.generate(collectionId, directory);

      expect(result).toBe("Clean repo  \n  with spaces");
    });

    it("throws on ollama HTTP error", async () => {
      const state = { files: [] as FileSnapshot[] };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [],
      };

      vi.mocked(insightService.getState).mockReturnValue(state as any);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 503,
      } as any);

      await expect(
        repoSummaryService.generate(collectionId, directory)
      ).rejects.toThrow("Ollama HTTP 503");
    });

    it("uses 60s timeout for fetch", async () => {
      const state = { files: [] as FileSnapshot[] };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [],
      };

      vi.mocked(insightService.getState).mockReturnValue(state as any);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: "Response" }),
      } as any);

      await repoSummaryService.generate(collectionId, directory);

      const call = vi.mocked(global.fetch).mock.calls[0];
      expect(call[1]?.signal).toBeDefined();
    });

    it("limits bad files list to 6", async () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
        relativePath: `file${String(i).padStart(2, "0")}.ts`,
        lineCount: 10,
        gitStatus: null,
        metrics: { security: { status: "red" } },
      })) as any[];
      const state = { files };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [{ name: "security" }],
      };

      vi.mocked(insightService.getState).mockReturnValue(state);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(
        config.metrics as any
      );
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: "Summary" }),
      } as any);

      await repoSummaryService.generate(collectionId, directory);

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((call[1]?.body ?? "") as string);
      // Extract ONLY the "Files needing attention" section (before "Top")
      const attentionStart = body.prompt.indexOf("Files needing attention:");
      const topStart = body.prompt.indexOf("Top 10 largest");
      const attentionSection = body.prompt.substring(attentionStart, topStart);
      const matches = attentionSection.match(/file\d+\.ts/g);
      expect(matches?.length).toBe(6);
    });

    it("limits largest files to 10", async () => {
      const files = Array.from({ length: 20 }, (_, i) => ({
        relativePath: `file${i}.ts`,
        lineCount: 100 + i,
        gitStatus: null,
        metrics: {},
      })) as any[];
      const state = { files };
      const aggregate = { coverage: null, lint: null };
      const config = {
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics: [],
      };

      vi.mocked(insightService.getState).mockReturnValue(state);
      vi.mocked(discoveryService.getAggregateStats).mockResolvedValue(
        aggregate as any
      );
      vi.mocked(ollamaService.getConfig).mockResolvedValue(config as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: "Summary" }),
      } as any);

      await repoSummaryService.generate(collectionId, directory);

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((call[1]?.body ?? "") as string);
      const matches = body.prompt.match(/file\d+\.ts/g);
      expect(matches?.length).toBeLessThanOrEqual(10);
    });
  });
});
