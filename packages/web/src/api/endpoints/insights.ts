import { apiClient } from "@/api/client";
import type { MetricOverrideDTO } from "@/api/endpoints/insights.overrides";
import { overridesApi } from "@/api/endpoints/insights.overrides";
import type {
  AggregateStatsDTO,
  CIStatusDTO,
  CoverageDetailDTO,
  LintDetailDTO,
  LlmCallLogEntryDTO,
} from "@/api/endpoints/insights.types";

export interface FileMetric {
  status: "green" | "amber" | "red";
  summary: string;
}

export interface FileMetricError {
  error: string;
}

export type {
  FileStatusOverrideDTO,
  MetricOverrideDTO,
} from "@/api/endpoints/insights.overrides";

export interface FileSnapshotDTO {
  relativePath: string;
  name: string;
  fileType: string;
  lineCount: number;
  lineDelta: number | null;
  updatedAt: string;
  coverage: number | null;
  lintErrors: number | null;
  gitStatus: "untracked" | "modified" | "clean" | null;
  metrics: Record<string, FileMetric | FileMetricError | "pending" | null>;
  overrides: Record<string, MetricOverrideDTO>;
  problemScore: number;
}

export interface ActiveLlmCallDTO {
  file: string;
  metric: string;
  model: string;
  startedAt: string;
  queueDepth: number;
}

export interface InsightStateDTO {
  files: FileSnapshotDTO[];
  lastScan: string | null;
  scanning: boolean;
  analysing: boolean;
  gitignoreWarnings: string[];
  activeLlmCall: ActiveLlmCallDTO | null;
}

export type {
  AggregateStatsDTO,
  CIJobDTO,
  CIRunDTO,
  CIStatusDTO,
  CIStepDTO,
  CoverageDetailDTO,
  LintDetailDTO,
  LintMessageDTO,
  LlmCallLogEntryDTO,
  MetricDefinition,
} from "@/api/endpoints/insights.types";

export interface FileDetailDTO {
  relativePath: string;
  metrics: Record<string, FileMetric | FileMetricError | "pending" | null>;
  coverage: CoverageDetailDTO | null;
  lint: LintDetailDTO | null;
}

export type InsightFilter =
  | { type: "git"; status: "modified" | "untracked" }
  | {
      type: "metric";
      name: string;
      status: "red" | "amber" | "green" | "error";
    }
  | { type: "coverage" }
  | { type: "lint" }
  | { type: "near-blank" }
  | { type: "security-refs"; paths: string[] };

export const insightsApi = {
  getState: async (collectionId: string): Promise<InsightStateDTO> => {
    const r = await apiClient.get<InsightStateDTO>(
      `/collections/${collectionId}/insights`
    );
    return r.data;
  },

  scan: async (collectionId: string): Promise<void> => {
    await apiClient.post(`/collections/${collectionId}/insights/scan`);
  },

  retryFile: async (
    collectionId: string,
    relativePath: string
  ): Promise<void> => {
    await apiClient.post(`/collections/${collectionId}/insights/retry`, {
      relativePath,
    });
  },

  getFileDetail: async (
    collectionId: string,
    relativePath: string
  ): Promise<FileDetailDTO> => {
    const r = await apiClient.get<FileDetailDTO>(
      `/collections/${collectionId}/insights/detail?path=${encodeURIComponent(relativePath)}`
    );
    return r.data;
  },

  streamUrl: (collectionId: string, token: string): string => {
    const base =
      import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3051/api";
    return `${base}/collections/${collectionId}/insights/stream?token=${encodeURIComponent(token)}`;
  },

  getAggregateStats: async (
    collectionId: string
  ): Promise<AggregateStatsDTO> => {
    const r = await apiClient.get<AggregateStatsDTO>(
      `/collections/${collectionId}/insights/aggregate`
    );
    return r.data;
  },

  generateRepoSummary: async (collectionId: string): Promise<string> => {
    const r = await apiClient.post<{ summary: string }>(
      `/collections/${collectionId}/insights/repo-summary`
    );
    return r.data.summary;
  },

  getCIStatus: async (collectionId: string): Promise<CIStatusDTO> => {
    const r = await apiClient.get<CIStatusDTO>(
      `/collections/${collectionId}/insights/ci`
    );
    return r.data;
  },

  getLlmLog: async (
    collectionId: string,
    limit = 200
  ): Promise<LlmCallLogEntryDTO[]> => {
    const r = await apiClient.get<LlmCallLogEntryDTO[]>(
      `/collections/${collectionId}/llm-log?limit=${limit}`
    );
    return r.data;
  },

  clearLlmLog: async (collectionId: string): Promise<void> => {
    await apiClient.delete(`/collections/${collectionId}/llm-log`);
  },

  upsertOverride: (
    collectionId: string,
    relativePath: string,
    metric: string,
    status: string,
    comment: string,
    source: "human" | "agent"
  ) =>
    overridesApi.upsert(
      collectionId,
      relativePath,
      metric,
      status,
      comment,
      source
    ),

  deleteOverride: (
    collectionId: string,
    relativePath: string,
    metric: string
  ) => overridesApi.delete(collectionId, relativePath, metric),

  listOverrides: (collectionId: string) => overridesApi.list(collectionId),
  overrideHistory: (collectionId: string, relativePath: string) =>
    overridesApi.history(collectionId, relativePath),
};
