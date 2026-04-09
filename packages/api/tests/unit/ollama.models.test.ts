import { beforeEach, describe, expect, it, vi } from "vitest";

global.fetch = vi.fn();

import {
  RECOMMENDED_MODELS,
  getModelStatuses,
  pullModel,
} from "@/services/ollama.models.js";

describe("ollama.models", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("RECOMMENDED_MODELS", () => {
    it("includes qwen models", () => {
      expect(RECOMMENDED_MODELS.some((m) => m.name.startsWith("qwen"))).toBe(
        true
      );
    });

    it("includes deepseek models", () => {
      expect(RECOMMENDED_MODELS.some((m) => m.name.includes("deepseek"))).toBe(
        true
      );
    });

    it("includes codellama", () => {
      expect(RECOMMENDED_MODELS.some((m) => m.name.includes("codellama"))).toBe(
        true
      );
    });

    it("has rank ordering", () => {
      const ranks = RECOMMENDED_MODELS.map((m) => m.rank);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    });

    it("all models have required fields", () => {
      RECOMMENDED_MODELS.forEach((m) => {
        expect(m.name).toBeDefined();
        expect(m.label).toBeDefined();
        expect(m.sizeGb).toBeGreaterThan(0);
        expect(m.rank).toBeGreaterThan(0);
      });
    });
  });

  describe("getModelStatuses", () => {
    it("marks installed models correctly", () => {
      const installed = ["qwen2.5-coder:7b"];
      const statuses = getModelStatuses(installed, "");

      const qwen7b = statuses.find((s) => s.name === "qwen2.5-coder:7b");
      expect(qwen7b?.installed).toBe(true);

      const deepseek = statuses.find((s) => s.name.includes("deepseek"));
      expect(deepseek?.installed).toBe(false);
    });

    it("handles tag variants of installed models", () => {
      const installed = ["qwen2.5-coder:7b:latest"];
      const statuses = getModelStatuses(installed, "");

      const qwen7b = statuses.find((s) => s.name === "qwen2.5-coder:7b");
      expect(qwen7b?.installed).toBe(true);
    });

    it("marks current model", () => {
      const statuses = getModelStatuses([], "qwen2.5-coder:32b");

      const qwen32b = statuses.find((s) => s.name === "qwen2.5-coder:32b");
      expect(qwen32b?.isCurrent).toBe(true);

      const qwen7b = statuses.find((s) => s.name === "qwen2.5-coder:7b");
      expect(qwen7b?.isCurrent).toBe(false);
    });

    it("flags better models when current is lower ranked", () => {
      const statuses = getModelStatuses([], "qwen2.5-coder:7b"); // rank 3

      const qwen32b = statuses.find((s) => s.name === "qwen2.5-coder:32b"); // rank 1
      expect(qwen32b?.isBetter).toBe(true);

      const qwen3b = statuses.find((s) => s.name === "qwen2.5-coder:3b"); // rank 6
      expect(qwen3b?.isBetter).toBe(false);
    });

    it("treats unknown current model as infinitely ranked", () => {
      const statuses = getModelStatuses([], "unknown-model");

      // All known models should be "better"
      statuses.forEach((s) => {
        expect(s.isBetter).toBe(true);
      });
    });

    it("returns all recommended models in statuses", () => {
      const statuses = getModelStatuses([], "");
      expect(statuses).toHaveLength(RECOMMENDED_MODELS.length);
    });

    it("preserves model properties in status", () => {
      const statuses = getModelStatuses([], "");
      const qwen32b = statuses.find((s) => s.name === "qwen2.5-coder:32b");

      expect(qwen32b?.name).toBe("qwen2.5-coder:32b");
      expect(qwen32b?.label).toBe("Qwen 2.5 Coder 32B");
      expect(qwen32b?.sizeGb).toBe(19.0);
      expect(qwen32b?.rank).toBe(1);
    });
  });

  describe("pullModel", () => {
    it("calls ollama pull endpoint", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as any);

      await pullModel("http://ollama:11434", "qwen2.5-coder:7b", () => {});

      expect(global.fetch).toHaveBeenCalledWith(
        "http://ollama:11434/api/pull",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("sends model name in request body", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as any);

      await pullModel("http://ollama:11434", "qwen2.5-coder:7b", () => {});

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((call[1]?.body ?? "") as string);
      expect(body.name).toBe("qwen2.5-coder:7b");
      expect(body.stream).toBe(true);
    });

    it("throws on HTTP error", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      await expect(
        pullModel("http://ollama:11434", "qwen2.5-coder:7b", () => {})
      ).rejects.toThrow("Ollama pull HTTP 500");
    });

    it("throws when response has no body", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: null,
      } as any);

      await expect(
        pullModel("http://ollama:11434", "qwen2.5-coder:7b", () => {})
      ).rejects.toThrow("No response body");
    });

    it("parses streaming JSON chunks", async () => {
      const chunks = [
        { status: "pulling manifest" },
        { status: "verifying sha256 digest", total: 6000, completed: 3000 },
        { status: "verifying sha256 digest", total: 6000, completed: 6000 },
        { status: "writing manifest" },
        { status: "removing any unused layers" },
        { status: "success" },
      ];

      const responses: Array<{ status: string; progress?: number }> = [];
      const encoder = new TextEncoder();
      const values: Uint8Array[] = chunks.map((c) =>
        encoder.encode(JSON.stringify(c) + "\n")
      );

      let valueIndex = 0;
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (valueIndex < values.length) {
                return {
                  done: false,
                  value: values[valueIndex++],
                };
              }
              return { done: true, value: undefined };
            },
          }),
        },
      } as any);

      await pullModel("http://ollama:11434", "qwen2.5-coder:7b", (s, p) => {
        responses.push({ status: s, progress: p });
      });

      expect(responses).toHaveLength(6);
      expect(responses[0].status).toBe("pulling manifest");
      expect(responses[1].status).toBe("verifying sha256 digest");
      expect(responses[1].progress).toBe(50); // 3000/6000 = 50%
      expect(responses[2].progress).toBe(100); // 6000/6000 = 100%
      expect(responses[5].status).toBe("success");
    });

    it("ignores malformed JSON lines", async () => {
      const encoder = new TextEncoder();
      const values = [
        encoder.encode('{"status":"pulling"}\n'),
        encoder.encode("garbage data\n"),
        encoder.encode('{"status":"done"}\n'),
      ];

      let valueIndex = 0;
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (valueIndex < values.length) {
                return {
                  done: false,
                  value: values[valueIndex++],
                };
              }
              return { done: true, value: undefined };
            },
          }),
        },
      } as any);

      const responses: string[] = [];
      await pullModel("http://ollama:11434", "qwen2.5-coder:7b", (s) => {
        responses.push(s);
      });

      expect(responses).toEqual(["pulling", "done"]);
    });
  });
});
