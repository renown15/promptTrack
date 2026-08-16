import { insightEmitter } from "@/services/insight.emitter.js";
import { docsService } from "@/services/docs.service.js";
import { ollamaService } from "@/services/ollama.service.js";

export interface DocAnalysisResult {
  status: "adequate" | "needs_work" | "sparse";
  summary: string;
  suggestions: string[];
  analyzedAt: string;
}

const cache = new Map<string, DocAnalysisResult>();

function buildPrompt(
  files: { relativePath: string; lineCount: number; updatedAt: string }[]
): string {
  const now = new Date();
  const fileList = files
    .map((f) => {
      const ageMs = now.getTime() - new Date(f.updatedAt).getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      return `  ${f.relativePath} (${f.lineCount} lines, ${ageDays}d ago)`;
    })
    .join("\n");

  return `You are reviewing the documentation coverage of a software project.

Here are all the markdown files found in the repo:
${fileList}

Based ONLY on the file names, paths, line counts, and ages:
1. Does the repo appear to be adequately documented?
2. What important documentation appears to be missing or outdated?

Respond with ONLY this JSON, no other text:
{"status":"adequate","summary":"one sentence assessment","suggestions":["suggestion 1","suggestion 2"]}

status must be:
- "adequate" — core docs present and reasonably up to date
- "needs_work" — some important docs missing or significantly stale
- "sparse" — very little documentation present

suggestions must be an array of specific, actionable strings (max 5). If adequate, use [].`;
}

function parseResponse(raw: string): Omit<DocAnalysisResult, "analyzedAt"> {
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
  const parsed = obj as {
    status?: string;
    summary?: string;
    suggestions?: unknown;
  };
  const status = parsed.status as DocAnalysisResult["status"];
  if (!["adequate", "needs_work", "sparse"].includes(status)) {
    throw new Error(`Unexpected status: ${JSON.stringify(status)}`);
  }
  return {
    status,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    suggestions: Array.isArray(parsed.suggestions)
      ? (parsed.suggestions as unknown[]).filter(
          (s): s is string => typeof s === "string"
        )
      : [],
  };
}

export const docsAnalyzerService = {
  getResult(collectionId: string): DocAnalysisResult | null {
    return cache.get(collectionId) ?? null;
  },

  async analyze(collectionId: string, directory: string): Promise<void> {
    const [files, cfg] = await Promise.all([
      docsService.list(directory),
      ollamaService.getConfig(),
    ]);

    if (files.length === 0) return;

    const prompt = buildPrompt(files);
    try {
      const res = await fetch(`${cfg.endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.model,
          prompt,
          stream: false,
          format: "json",
        }),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const data = (await res.json()) as { response: string };
      const parsed = parseResponse(data.response);
      const result: DocAnalysisResult = {
        ...parsed,
        analyzedAt: new Date().toISOString(),
      };
      cache.set(collectionId, result);
      insightEmitter.emit(`doc_analysis:${collectionId}`, result);
    } catch (err) {
      console.error(`[docs-analyzer] failed for ${collectionId}:`, err);
    }
  },
};
