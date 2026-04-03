import { apiClient } from "@/api/client";

export interface FileMetric {
  status: "green" | "amber" | "red";
  summary: string;
}

export interface FileMetricError {
  error: string;
}

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
  problemScore: number;
}

export interface ActiveLlmCallDTO {
  file: string;
  metric: string;
  model: string;
  startedAt: string;
}

export interface InsightStateDTO {
  files: FileSnapshotDTO[];
  lastScan: string | null;
  scanning: boolean;
  gitignoreWarnings: string[];
  activeLlmCall: ActiveLlmCallDTO | null;
}

export interface MetricDefinition {
  name: string;
  label: string;
  description: string;
}

export interface CoverageDetailDTO {
  lines: { pct: number; covered: number; total: number };
  branches: { pct: number; covered: number; total: number };
  functions: { pct: number; covered: number; total: number };
  statements: { pct: number; covered: number; total: number };
  reportedAt: string;
}

export interface LintMessageDTO {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
}

export interface LintDetailDTO {
  errors: number;
  warnings: number;
  messages: LintMessageDTO[];
  reportedAt: string;
}

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
  | { type: "security-refs"; paths: string[] };

export interface CIStepDTO {
  number: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CIJobDTO {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  steps: CIStepDTO[];
}

export interface CIRunDTO {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  htmlUrl: string;
}

export interface CIStatusDTO {
  run: CIRunDTO | null;
  jobs: CIJobDTO[];
  error: "no_remote" | "not_github" | "api_error" | null;
}

export interface AggregateStatsDTO {
  coverage: { linesPct: number; reportedAt: string } | null;
  lint: { errors: number; warnings: number; reportedAt: string } | null;
}

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
};
