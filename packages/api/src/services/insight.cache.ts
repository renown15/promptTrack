export type MetricStatus = "green" | "amber" | "red";

export interface MetricResult {
  status: MetricStatus;
  summary: string;
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
  gitStatus: GitFileStatus | null;
  metrics: Record<string, MetricValue>;
}

export interface CollectionInsightState {
  files: Map<string, FileSnapshot>;
  lastScan: Date | null;
  scanning: boolean;
}

export const insightCache = new Map<string, CollectionInsightState>();

export function getOrCreateState(collectionId: string): CollectionInsightState {
  if (!insightCache.has(collectionId)) {
    insightCache.set(collectionId, {
      files: new Map(),
      lastScan: null,
      scanning: false,
    });
  }
  return insightCache.get(collectionId)!;
}

export function serializeState(state: CollectionInsightState) {
  return {
    files: Array.from(state.files.values()).map((f) => ({
      ...f,
      updatedAt: f.updatedAt.toISOString(),
    })),
    lastScan: state.lastScan?.toISOString() ?? null,
    scanning: state.scanning,
  };
}
