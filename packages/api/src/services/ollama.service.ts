import { ollamaRepository } from "@/repositories/ollama.repository.js";
import type { MetricResult, MetricError } from "@/services/insight.cache.js";
import { buildPrompt, parseMetricResponse } from "@/services/ollama.prompt.js";
export type { MetricDefinition } from "@/services/ollama.metrics.js";
export { DEFAULT_METRICS } from "@/services/ollama.metrics.js";
import {
  DEFAULT_METRICS,
  type MetricDefinition,
} from "@/services/ollama.metrics.js";

export interface OllamaCallMeta {
  promptTokens: number | null;
  responseTokens: number | null;
}

async function callOllama(
  endpoint: string,
  model: string,
  prompt: string,
  timeoutMs: number
): Promise<{ response: string; meta: OllamaCallMeta }> {
  const res = await fetch(`${endpoint}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = (await res.json()) as {
    response: string;
    prompt_eval_count?: number;
    eval_count?: number;
  };
  return {
    response: data.response,
    meta: {
      promptTokens: data.prompt_eval_count ?? null,
      responseTokens: data.eval_count ?? null,
    },
  };
}

export const ollamaService = {
  async getConfig() {
    const cfg = await ollamaRepository.get();
    return (
      cfg ?? {
        id: "",
        endpoint: "http://localhost:11434",
        model: "qwen2.5-coder:7b",
        metrics: {},
        timeoutMs: 60_000,
      }
    );
  },

  async updateConfig(data: {
    endpoint: string;
    model: string;
    metrics: Record<string, boolean>;
    timeoutMs: number;
  }) {
    return ollamaRepository.upsert(data);
  },

  async testConnection(endpoint: string): Promise<boolean> {
    try {
      const res = await fetch(`${endpoint}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async listModels(endpoint: string): Promise<string[]> {
    try {
      const res = await fetch(`${endpoint}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { models: { name: string }[] };
      return (data.models ?? []).map((m) => m.name);
    } catch {
      return [];
    }
  },

  enabledMetrics(metricsConfig: Record<string, boolean>): MetricDefinition[] {
    return DEFAULT_METRICS.filter((m) => metricsConfig[m.name] !== false);
  },

  async analyzeMetric(opts: {
    endpoint: string;
    model: string;
    timeoutMs: number;
    metric: MetricDefinition;
    relativePath: string;
    lineCount: number;
    fileType: string;
    content: string;
  }): Promise<{
    result: MetricResult | MetricError;
    meta: OllamaCallMeta;
    promptChars: number;
  }> {
    const prompt = buildPrompt(
      opts.metric,
      opts.relativePath,
      opts.lineCount,
      opts.fileType,
      opts.content
    );
    const promptChars = prompt.length;
    try {
      const { response, meta } = await callOllama(
        opts.endpoint,
        opts.model,
        prompt,
        opts.timeoutMs
      );
      return { result: parseMetricResponse(response), meta, promptChars };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[ollama] ${opts.metric.name} failed for ${opts.relativePath}:`,
        msg
      );
      return {
        result: { error: msg },
        meta: { promptTokens: null, responseTokens: null },
        promptChars,
      };
    }
  },
};
