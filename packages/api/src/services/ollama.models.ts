export interface RecommendedModel {
  name: string;
  label: string;
  sizeGb: number;
  rank: number; // lower = better
}

export interface ModelStatus extends RecommendedModel {
  installed: boolean;
  isCurrent: boolean;
  isBetter: boolean;
}

export const RECOMMENDED_MODELS: RecommendedModel[] = [
  {
    name: "qwen2.5-coder:32b",
    label: "Qwen 2.5 Coder 32B",
    sizeGb: 19.0,
    rank: 1,
  },
  {
    name: "qwen2.5-coder:14b",
    label: "Qwen 2.5 Coder 14B",
    sizeGb: 9.0,
    rank: 2,
  },
  {
    name: "qwen2.5-coder:7b",
    label: "Qwen 2.5 Coder 7B",
    sizeGb: 4.7,
    rank: 3,
  },
  {
    name: "deepseek-coder-v2:16b",
    label: "DeepSeek Coder V2 16B",
    sizeGb: 9.0,
    rank: 4,
  },
  { name: "codellama:13b", label: "CodeLlama 13B", sizeGb: 7.4, rank: 5 },
  {
    name: "qwen2.5-coder:3b",
    label: "Qwen 2.5 Coder 3B",
    sizeGb: 1.9,
    rank: 6,
  },
];

export function getModelStatuses(
  installedModels: string[],
  currentModel: string
): ModelStatus[] {
  const currentRank =
    RECOMMENDED_MODELS.find((m) => m.name === currentModel)?.rank ?? Infinity;
  return RECOMMENDED_MODELS.map((m) => ({
    ...m,
    installed: installedModels.some(
      (n) => n === m.name || n.startsWith(`${m.name}:`)
    ),
    isCurrent: m.name === currentModel,
    isBetter: m.rank < currentRank,
  }));
}

type PullChunk = { status: string; total?: number; completed?: number };

export async function pullModel(
  endpoint: string,
  model: string,
  onChunk: (status: string, progress?: number) => void
): Promise<void> {
  const res = await fetch(`${endpoint}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: model, stream: true }),
    signal: AbortSignal.timeout(30 * 60_000),
  });
  if (!res.ok) throw new Error(`Ollama pull HTTP ${res.status}`);
  if (!res.body) throw new Error("No response body from Ollama");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const chunk = JSON.parse(trimmed) as PullChunk;
        const progress =
          chunk.total && chunk.completed
            ? Math.round((chunk.completed / chunk.total) * 100)
            : undefined;
        onChunk(chunk.status, progress);
      } catch {
        // ignore malformed lines
      }
    }
  }
}
