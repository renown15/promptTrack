import { ollamaRepository } from "@/repositories/ollama.repository.js";
import type { MetricResult, MetricError } from "@/services/insight.cache.js";

export interface MetricDefinition {
  name: string;
  label: string;
  description: string;
}

export const DEFAULT_METRICS: MetricDefinition[] = [
  {
    name: "architecture",
    label: "Arch",
    description:
      "Does this file respect layering and separation of concerns? Are there any boundary violations?",
  },
  {
    name: "complexity",
    label: "Cmplx",
    description:
      "Is this file overly complex, deeply nested, or hard to follow at a glance?",
  },
  {
    name: "naming",
    label: "Names",
    description:
      "Are identifiers (variables, functions, types) named clearly and consistently with the codebase conventions?",
  },
  {
    name: "security",
    label: "Sec",
    description:
      "Does this file contain security vulnerabilities or risky patterns? Look for injection risks, hardcoded secrets, insecure defaults, improper input validation, unsafe deserialization, or exposure of sensitive data.",
  },
  {
    name: "eng_quality",
    label: "EngQ",
    description:
      "Does this file adhere to industry-standard engineering practices that support DevSecOps? Consider: error handling, observability (logging/tracing), testability, immutability, principle of least privilege, secrets management, and absence of technical debt that would impede secure delivery.",
  },
  {
    name: "dry",
    label: "DRY",
    description:
      "Does this file repeat patterns that should be abstracted? Look for: copy-pasted blocks of near-identical code, boilerplate that could be a helper or factory, multiple functions with the same shape differing only in a parameter, and any logic duplicated from nearby files. Green = minimal repetition. Amber = some duplication worth noting. Red = significant repetition that should be refactored.",
  },
];

const MAX_CONTENT_CHARS = 6000;

function buildPrompt(
  metric: MetricDefinition,
  relativePath: string,
  lineCount: number,
  fileType: string,
  content: string
): string {
  const body =
    content.length > MAX_CONTENT_CHARS
      ? content.slice(0, MAX_CONTENT_CHARS) + "\n... (truncated)"
      : content;

  return `Review this file for: ${metric.description}

File: ${relativePath} (${lineCount} lines, type: .${fileType})

\`\`\`
${body}
\`\`\`

Respond with ONLY this JSON, no other text:
{"status":"green","summary":"one sentence"}

status must be "green" (good), "amber" (minor concerns), or "red" (significant issues).`;
}

async function callOllama(
  endpoint: string,
  model: string,
  prompt: string
): Promise<string> {
  const res = await fetch(`${endpoint}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = (await res.json()) as { response: string };
  return data.response;
}

function parseMetricResponse(raw: string): MetricResult {
  const trimmed = raw.trim();
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match)
      throw new Error(`No JSON in response: ${trimmed.slice(0, 120)}`);
    obj = JSON.parse(match[0]);
  }
  const parsed = obj as { status?: string; summary?: string };
  const status = parsed.status as "green" | "amber" | "red";
  if (!["green", "amber", "red"].includes(status))
    throw new Error(`Unexpected status value: ${JSON.stringify(status)}`);
  return { status, summary: parsed.summary ?? "" };
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
      }
    );
  },

  async updateConfig(data: {
    endpoint: string;
    model: string;
    metrics: Record<string, boolean>;
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
    metric: MetricDefinition;
    relativePath: string;
    lineCount: number;
    fileType: string;
    content: string;
  }): Promise<MetricResult | MetricError> {
    try {
      const prompt = buildPrompt(
        opts.metric,
        opts.relativePath,
        opts.lineCount,
        opts.fileType,
        opts.content
      );
      const raw = await callOllama(opts.endpoint, opts.model, prompt);
      return parseMetricResponse(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[ollama] ${opts.metric.name} failed for ${opts.relativePath}:`,
        msg
      );
      return { error: msg };
    }
  },
};
