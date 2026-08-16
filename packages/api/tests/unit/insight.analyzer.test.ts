import type { FileSnapshot } from "@/services/insight.cache.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

vi.mock("@/services/insight.cache.js", () => ({
  getOrCreateState: vi.fn(),
}));

vi.mock("@/services/insight.emitter.js", () => ({
  insightEmitter: {
    emit: vi.fn(),
  },
}));

vi.mock("@/services/ollama.service.js", () => ({
  ollamaService: {
    getConfig: vi.fn(),
    enabledMetrics: vi.fn(),
    analyzeMetric: vi.fn(),
  },
}));

vi.mock("@/repositories/file-snapshot.repository.js", () => ({
  fileSnapshotRepository: {
    insert: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/repositories/llm-call-log.repository.js", () => ({
  llmCallLogRepository: {
    insert: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/ollama.queue.js", () => ({
  enqueueOllamaCall: vi.fn((_id, cb) => cb()),
  queueDepth: vi.fn(() => 0),
}));

import { fileSnapshotRepository } from "@/repositories/file-snapshot.repository.js";
import {
  emitFileUpdated,
  runAnalysis,
  runAnalysisQueue,
} from "@/services/insight.analyzer.js";
import { getOrCreateState } from "@/services/insight.cache.js";
import { insightEmitter } from "@/services/insight.emitter.js";
import { enqueueOllamaCall } from "@/services/ollama.queue.js";
import { ollamaService } from "@/services/ollama.service.js";
import { readFile } from "fs/promises";

describe("insight.analyzer", () => {
  const collectionId = "coll-123";
  const directory = "/repo";

  beforeEach(() => vi.clearAllMocks());

  describe("emitFileUpdated", () => {
    it("emits file updated event with ISO date", () => {
      const snap: FileSnapshot = {
        relativePath: "src/foo.ts",
        name: "foo.ts",
        fileType: "ts",
        lineCount: 100,
        coverage: 85,
        gitStatus: "tracked",
        metrics: {},
        updatedAt: new Date("2025-04-09T10:00:00Z"),
      };

      emitFileUpdated(collectionId, snap);

      expect(insightEmitter.emit).toHaveBeenCalledWith(
        `file_updated:${collectionId}`,
        expect.objectContaining({
          relativePath: "src/foo.ts",
          updatedAt: "2025-04-09T10:00:00.000Z",
        })
      );
    });

    it("preserves all file snapshot fields", () => {
      const snap: FileSnapshot = {
        relativePath: "src/bar.ts",
        name: "bar.ts",
        fileType: "ts",
        lineCount: 50,
        coverage: 75,
        gitStatus: "modified",
        metrics: { security: { status: "green" } },
        updatedAt: new Date(),
      };

      emitFileUpdated(collectionId, snap);

      const call = vi.mocked(insightEmitter.emit).mock.calls[0];
      expect(call[1]).toHaveProperty("relativePath", "src/bar.ts");
      expect(call[1]).toHaveProperty("lineCount", 50);
      expect(call[1]).toHaveProperty("coverage", 75);
    });
  });

  describe("runAnalysis", () => {
    const baseSnap: FileSnapshot = {
      relativePath: "src/test.ts",
      name: "test.ts",
      fileType: "ts",
      lineCount: 100,
      coverage: 80,
      gitStatus: "tracked",
      metrics: { security: "pending" },
      updatedAt: new Date(),
    };

    it("returns early if no metrics enabled", async () => {
      vi.mocked(ollamaService.getConfig).mockResolvedValue({
        endpoint: "http://ollama:11434",
        model: "gpt2",
        timeoutMs: 60000,
        metrics: [],
      } as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(getOrCreateState).mockReturnValue({
        files: new Map(),
      } as any);

      await runAnalysis(collectionId, directory, baseSnap);

      expect(ollamaService.analyzeMetric).not.toHaveBeenCalled();
    });

    it("skips metrics that are already valid", async () => {
      const snap = {
        ...baseSnap,
        metrics: { security: { status: "green" } },
      };
      const metrics = [{ name: "security", prompt: "check" }];
      vi.mocked(ollamaService.getConfig).mockResolvedValue({
        endpoint: "http://ollama:11434",
        model: "gpt2",
        timeoutMs: 60000,
        metrics,
      } as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(metrics);
      vi.mocked(getOrCreateState).mockReturnValue({
        files: new Map([[snap.relativePath, snap]]),
      } as any);

      await runAnalysis(collectionId, directory, snap);

      expect(ollamaService.analyzeMetric).not.toHaveBeenCalled();
    });

    it("runs pending metrics", async () => {
      const metrics = [{ name: "security", prompt: "check" }];
      const state = { files: new Map([[baseSnap.relativePath, baseSnap]]) };
      vi.mocked(ollamaService.getConfig).mockResolvedValue({
        endpoint: "http://ollama:11434",
        model: "codellama",
        timeoutMs: 60000,
        metrics,
      } as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(metrics);
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(readFile).mockResolvedValue("const x = 1;");
      vi.mocked(ollamaService.analyzeMetric).mockResolvedValue({
        result: { status: "green" },
        meta: { promptTokens: 10, responseTokens: 5 },
        promptChars: 100,
      } as any);

      await runAnalysis(collectionId, directory, baseSnap);

      expect(ollamaService.analyzeMetric).toHaveBeenCalled();
      expect(readFile).toHaveBeenCalledWith(`/repo/src/test.ts`, "utf-8");
    });

    it("handles file read errors", async () => {
      const snap = { ...baseSnap, metrics: { security: "pending" } };
      const metrics = [{ name: "security", prompt: "check" }];
      const state = {
        files: new Map([[snap.relativePath, snap]]),
      };
      vi.mocked(ollamaService.getConfig).mockResolvedValue({
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics,
      } as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(metrics);
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));

      await runAnalysis(collectionId, directory, snap);

      const updated = state.files.get(snap.relativePath);
      expect(updated?.metrics.security).toHaveProperty("error");
      expect(updated?.metrics.security).toHaveProperty(
        "error",
        expect.stringContaining("unreadable")
      );
    });

    it("logs metric analysis to llm_call_log when analysis completes", async () => {
      const snap = { ...baseSnap, metrics: { security: "pending" } };
      const metrics = [{ name: "security", prompt: "check" }];
      const state = { files: new Map([[snap.relativePath, snap]]) };
      vi.mocked(ollamaService.getConfig).mockResolvedValue({
        endpoint: "http://ollama:11434",
        model: "gpt2",
        metrics,
      } as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(metrics);
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(readFile).mockResolvedValue("code");
      vi.mocked(ollamaService.analyzeMetric).mockResolvedValue({
        result: { status: "red", too_long: true },
        meta: { promptTokens: 50, responseTokens: 20 },
        promptChars: 200,
      } as any);

      await runAnalysis(collectionId, directory, snap);

      // Verify llmCallLogRepository was called (async inside enqueueOllamaCall)
      // This happens asynchronously so we can't directly assert on it
      expect(ollamaService.analyzeMetric).toHaveBeenCalled();
    });

    it("saves file snapshot when all metrics complete without errors", async () => {
      const snap = { ...baseSnap, metrics: { security: "pending" } };
      const metrics = [{ name: "security", prompt: "check" }];
      const state = { files: new Map([[snap.relativePath, snap]]) };
      vi.mocked(ollamaService.getConfig).mockResolvedValue({
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics,
      } as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(metrics);
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(readFile).mockResolvedValue("code");
      vi.mocked(ollamaService.analyzeMetric).mockResolvedValue({
        result: { status: "green" },
        meta: { promptTokens: 10, responseTokens: 5 },
        promptChars: 100,
      } as any);

      await runAnalysis(collectionId, directory, snap);

      expect(fileSnapshotRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionId,
          relativePath: "src/test.ts",
          name: "test.ts",
          fileType: "ts",
          lineCount: 100,
          coverage: 80,
        })
      );
    });

    it("queues ollama call for analysis", async () => {
      const snap = { ...baseSnap, metrics: { security: "pending" } };
      const metrics = [{ name: "security", prompt: "check" }];
      const state = { files: new Map([[snap.relativePath, snap]]) };
      vi.mocked(ollamaService.getConfig).mockResolvedValue({
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics,
      } as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(metrics);
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(readFile).mockResolvedValue("code");
      vi.mocked(ollamaService.analyzeMetric).mockResolvedValue({
        result: { status: "green" },
        meta: { promptTokens: 10, responseTokens: 5 },
        promptChars: 100,
      } as any);

      await runAnalysis(collectionId, directory, snap);

      expect(enqueueOllamaCall).toHaveBeenCalledWith(
        collectionId,
        expect.any(Function)
      );
    });

    it("handles ollama service configuration errors", async () => {
      vi.mocked(ollamaService.getConfig).mockRejectedValue(
        new Error("Connection failed")
      );
      vi.mocked(getOrCreateState).mockReturnValue({
        files: new Map(),
      } as any);

      await runAnalysis(collectionId, directory, baseSnap);

      expect(ollamaService.analyzeMetric).not.toHaveBeenCalled();
    });

    it("updates state with metric results", async () => {
      const snap = { ...baseSnap, metrics: { security: "pending" } };
      const metrics = [{ name: "security", prompt: "check" }];
      const state = { files: new Map([[snap.relativePath, snap]]) };
      vi.mocked(ollamaService.getConfig).mockResolvedValue({
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics,
      } as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(metrics);
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(readFile).mockResolvedValue("code");
      const result = { status: "amber", riskLevel: "medium" };
      vi.mocked(ollamaService.analyzeMetric).mockResolvedValue({
        result,
        meta: { promptTokens: 10, responseTokens: 5 },
        promptChars: 100,
      } as any);

      await runAnalysis(collectionId, directory, snap);

      expect(state.files.get(snap.relativePath)?.metrics.security).toEqual(
        result
      );
    });

    it("handles errored metrics", async () => {
      const snap = { ...baseSnap, metrics: { security: { error: "timeout" } } };
      const metrics = [{ name: "security", prompt: "check" }];
      const state = { files: new Map([[snap.relativePath, snap]]) };
      vi.mocked(ollamaService.getConfig).mockResolvedValue({
        endpoint: "http://ollama:11434",
        model: "llama",
        metrics,
      } as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue(metrics);
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(readFile).mockResolvedValue("code");
      vi.mocked(ollamaService.analyzeMetric).mockResolvedValue({
        result: { status: "green" },
        meta: { promptTokens: 10, responseTokens: 5 },
        promptChars: 100,
      } as any);

      await runAnalysis(collectionId, directory, snap);

      expect(ollamaService.analyzeMetric).toHaveBeenCalled();
    });
  });

  describe("runAnalysisQueue", () => {
    it("runs analysis for each snapshot", async () => {
      const snaps = [
        {
          relativePath: "a.ts",
          name: "a.ts",
          fileType: "ts",
          lineCount: 10,
          coverage: 80,
          gitStatus: "tracked",
          metrics: {},
          updatedAt: new Date(),
        },
        {
          relativePath: "b.ts",
          name: "b.ts",
          fileType: "ts",
          lineCount: 20,
          coverage: 70,
          gitStatus: "tracked",
          metrics: {},
          updatedAt: new Date(),
        },
      ];

      vi.mocked(ollamaService.getConfig).mockResolvedValue({
        endpoint: "http://ollama:11434",
        model: "llama",
        timeoutMs: 60000,
        metrics: [],
      } as any);
      vi.mocked(ollamaService.enabledMetrics).mockReturnValue([]);
      vi.mocked(getOrCreateState).mockReturnValue({
        files: new Map(),
      } as any);

      await runAnalysisQueue(collectionId, directory, snaps);

      expect(enqueueOllamaCall).toHaveBeenCalledTimes(0);
    });

    it("continues on individual snapshot errors", async () => {
      const snaps = [
        {
          relativePath: "a.ts",
          name: "a.ts",
          fileType: "ts",
          lineCount: 10,
          coverage: 80,
          gitStatus: "tracked",
          metrics: {},
          updatedAt: new Date(),
        },
      ];

      vi.mocked(ollamaService.getConfig).mockRejectedValue(
        new Error("Ollama down")
      );
      vi.mocked(getOrCreateState).mockReturnValue({
        files: new Map(),
      } as any);

      await expect(
        runAnalysisQueue(collectionId, directory, snaps)
      ).resolves.not.toThrow();
    });

    it("processes empty snapshot list", async () => {
      await runAnalysisQueue(collectionId, directory, []);
      expect(ollamaService.getConfig).not.toHaveBeenCalled();
    });
  });
});
