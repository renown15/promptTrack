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

export interface LlmCallLogEntryDTO {
  id: string;
  collectionId: string;
  relativePath: string;
  metric: string;
  model: string;
  startedAt: string;
  durationMs: number;
  promptChars: number;
  promptTokens: number | null;
  responseTokens: number | null;
  status: string;
  errorReason: string | null;
}

export interface AggregateStatsDTO {
  coverage: { linesPct: number; reportedAt: string } | null;
  lint: { errors: number; warnings: number; reportedAt: string } | null;
}
