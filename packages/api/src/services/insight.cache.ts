export type MetricStatus = "green" | "amber" | "red";

export interface MetricResult {
  status: MetricStatus;
  summary: string;
  sensitiveRefs?: string[];
}

export interface MetricError {
  error: string;
}

export type MetricValue = MetricResult | MetricError | "pending" | null;

export type GitFileStatus = "untracked" | "modified" | "clean";

export interface FileSnapshot {
  relativePath: string;
  name: string;
  fileType: string;
  lineCount: number;
  lineDelta: number | null;
  updatedAt: Date;
  coverage: number | null;
  lintErrors: number | null;
  gitStatus: GitFileStatus | null;
  metrics: Record<string, MetricValue>;
}

export interface CollectionInsightState {
  files: Map<string, FileSnapshot>;
  lastScan: Date | null;
  scanning: boolean;
  gitignoreWarnings: string[];
}

export const insightCache = new Map<string, CollectionInsightState>();

export function getOrCreateState(collectionId: string): CollectionInsightState {
  if (!insightCache.has(collectionId)) {
    insightCache.set(collectionId, {
      files: new Map(),
      lastScan: null,
      scanning: false,
      gitignoreWarnings: [],
    });
  }
  return insightCache.get(collectionId)!;
}

/**
 * Canonical problem score for a file. Higher = more problematic.
 * Used by the UI, MCP tools, and REST agent handlers so ranking is consistent.
 *
 * Weights:
 *   untracked git file  +3
 *   metric null/error   +8  (analysis failed or errored)
 *   metric red          +5
 *   metric amber        +2
 *   metric pending       0  (not yet analysed — don't penalise)
 */
export function calculateProblemScore(
  metrics: Record<string, MetricValue>,
  gitStatus: GitFileStatus | null = null
): number {
  let score = 0;
  if (gitStatus === "untracked") score += 3;
  for (const value of Object.values(metrics)) {
    if (value === "pending") continue;
    if (value === null) {
      score += 8;
      continue;
    }
    if (typeof value !== "object") continue;
    if ("error" in value) {
      score += 8;
      continue;
    }
    if (value.status === "red") score += 5;
    else if (value.status === "amber") score += 2;
  }
  return score;
}

export function serializeState(state: CollectionInsightState) {
  return {
    files: Array.from(state.files.values()).map((f) => ({
      ...f,
      updatedAt: f.updatedAt.toISOString(),
      problemScore: calculateProblemScore(f.metrics, f.gitStatus),
    })),
    lastScan: state.lastScan?.toISOString() ?? null,
    scanning: state.scanning,
    gitignoreWarnings: state.gitignoreWarnings,
  };
}
