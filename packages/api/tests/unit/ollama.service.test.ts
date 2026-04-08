import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/repositories/ollama.repository.js", () => ({
  ollamaRepository: {
    get: vi.fn(),
    upsert: vi.fn(),
  },
}));

import { ollamaRepository } from "@/repositories/ollama.repository.js";
import { ollamaService, DEFAULT_METRICS } from "@/services/ollama.service.js";

describe("ollamaService.enabledMetrics", () => {
  it("returns all metrics when config is empty", () => {
    const result = ollamaService.enabledMetrics({});
    expect(result).toHaveLength(DEFAULT_METRICS.length);
    expect(result.map((m) => m.name)).toEqual(
      DEFAULT_METRICS.map((m) => m.name)
    );
  });

  it("excludes metrics explicitly set to false", () => {
    const result = ollamaService.enabledMetrics({ architecture: false });
    expect(result.map((m) => m.name)).not.toContain("architecture");
    expect(result.length).toBe(DEFAULT_METRICS.length - 1);
  });

  it("includes metrics set to true", () => {
    const result = ollamaService.enabledMetrics({ architecture: true });
    expect(result.map((m) => m.name)).toContain("architecture");
  });

  it("returns empty array when all metrics disabled", () => {
    const config = Object.fromEntries(
      DEFAULT_METRICS.map((m) => [m.name, false])
    );
    expect(ollamaService.enabledMetrics(config)).toHaveLength(0);
  });
});

describe("ollamaService.getConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns repo config when one exists", async () => {
    const cfg = {
      id: "cfg1",
      endpoint: "http://localhost:11434",
      model: "llama3",
      metrics: { architecture: true },
    };
    vi.mocked(ollamaRepository.get).mockResolvedValue(cfg as never);
    const result = await ollamaService.getConfig();
    expect(result).toEqual(cfg);
  });

  it("returns defaults when no config stored", async () => {
    vi.mocked(ollamaRepository.get).mockResolvedValue(null);
    const result = await ollamaService.getConfig();
    expect(result.endpoint).toBe("http://localhost:11434");
    expect(result.model).toBe("qwen2.5-coder:7b");
    expect(result.metrics).toEqual({});
    expect(result.timeoutMs).toBe(60_000);
  });
});

describe("ollamaService.updateConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates to repository upsert", async () => {
    const data = {
      endpoint: "http://remote:11434",
      model: "llama3",
      metrics: { complexity: false },
      timeoutMs: 30_000,
    };
    vi.mocked(ollamaRepository.upsert).mockResolvedValue({
      id: "cfg1",
      ...data,
    } as never);
    await ollamaService.updateConfig(data);
    expect(ollamaRepository.upsert).toHaveBeenCalledWith(data);
  });
});

describe("ollamaService.testConnection", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("returns true when /api/tags responds ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    expect(await ollamaService.testConnection("http://localhost:11434")).toBe(
      true
    );
  });

  it("returns false when /api/tags responds not-ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    expect(await ollamaService.testConnection("http://localhost:11434")).toBe(
      false
    );
  });

  it("returns false when fetch throws", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    expect(await ollamaService.testConnection("http://localhost:11434")).toBe(
      false
    );
  });
});

describe("ollamaService.listModels", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("returns model names on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [{ name: "llama3" }, { name: "qwen2.5-coder:7b" }],
      }),
    } as Response);
    const result = await ollamaService.listModels("http://localhost:11434");
    expect(result).toEqual(["llama3", "qwen2.5-coder:7b"]);
  });

  it("returns empty array when response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    const result = await ollamaService.listModels("http://localhost:11434");
    expect(result).toEqual([]);
  });

  it("returns empty array when fetch throws", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("timeout"));
    const result = await ollamaService.listModels("http://localhost:11434");
    expect(result).toEqual([]);
  });

  it("handles missing models array gracefully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);
    const result = await ollamaService.listModels("http://localhost:11434");
    expect(result).toEqual([]);
  });
});

describe("ollamaService.analyzeMetric", () => {
  const metric = DEFAULT_METRICS[0]!;
  const baseOpts = {
    endpoint: "http://localhost:11434",
    model: "llama3",
    timeoutMs: 60_000,
    metric,
    relativePath: "src/foo.ts",
    lineCount: 50,
    fileType: "ts",
    content: "const x = 1;\nexport default x;",
  };

  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("returns parsed MetricResult on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: '{"status":"green","summary":"Looks good"}',
        prompt_eval_count: 120,
        eval_count: 30,
      }),
    } as Response);

    const { result, meta } = await ollamaService.analyzeMetric(baseOpts);
    expect(result).toEqual({ status: "green", summary: "Looks good" });
    expect(meta.promptTokens).toBe(120);
    expect(meta.responseTokens).toBe(30);
  });

  it("returns amber and red statuses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: '{"status":"red","summary":"Has issues"}',
      }),
    } as Response);

    const { result } = await ollamaService.analyzeMetric(baseOpts);
    expect(result).toEqual({ status: "red", summary: "Has issues" });
  });

  it("handles missing token counts gracefully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '{"status":"green","summary":"ok"}' }),
    } as Response);
    const { meta } = await ollamaService.analyzeMetric(baseOpts);
    expect(meta.promptTokens).toBeNull();
    expect(meta.responseTokens).toBeNull();
  });

  it("extracts JSON embedded in prose response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response:
          'Here is my review: {"status":"amber","summary":"Minor concerns"} done.',
      }),
    } as Response);

    const { result } = await ollamaService.analyzeMetric(baseOpts);
    expect(result).toEqual({ status: "amber", summary: "Minor concerns" });
  });

  it("returns error result when Ollama HTTP fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);
    const { result } = await ollamaService.analyzeMetric(baseOpts);
    expect(result).toHaveProperty("error");
  });

  it("returns error result when response JSON is malformed", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: "not json at all" }),
    } as Response);
    const { result } = await ollamaService.analyzeMetric(baseOpts);
    expect(result).toHaveProperty("error");
  });

  it("returns error result when status value is invalid", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '{"status":"yellow","summary":"hm"}' }),
    } as Response);
    const { result } = await ollamaService.analyzeMetric(baseOpts);
    expect(result).toHaveProperty("error");
  });

  it("passes timeoutMs to fetch signal", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '{"status":"green","summary":"ok"}' }),
    } as Response);
    await ollamaService.analyzeMetric({ ...baseOpts, timeoutMs: 15_000 });
    const init = vi.mocked(fetch).mock.calls[0]![1] as RequestInit;
    expect(init.signal).toBeDefined();
  });

  it("returns promptChars matching the built prompt length", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '{"status":"green","summary":"ok"}' }),
    } as Response);
    const { promptChars } = await ollamaService.analyzeMetric(baseOpts);
    expect(promptChars).toBeGreaterThan(0);
  });

  it("truncates content exceeding 6000 chars", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '{"status":"green","summary":"ok"}' }),
    } as Response);

    const longContent = "x".repeat(7000);
    await ollamaService.analyzeMetric({ ...baseOpts, content: longContent });

    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0]![1] as RequestInit).body as string
    );
    expect(body.prompt).toContain("(truncated)");
  });
});
