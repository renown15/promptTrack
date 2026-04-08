import type { FileSnapshotDTO, InsightFilter } from "@/api/endpoints/insights";

export interface MetricHealth {
  green: number;
  amber: number;
  red: number;
  error: number;
  pending: number;
}

export function computeHealth(
  files: FileSnapshotDTO[],
  metricNames: string[]
): Record<string, MetricHealth> {
  const health: Record<string, MetricHealth> = {};
  for (const name of metricNames)
    health[name] = { green: 0, amber: 0, red: 0, error: 0, pending: 0 };
  for (const file of files) {
    for (const name of metricNames) {
      const h = health[name];
      if (!h) continue;
      const v = file.metrics[name];
      if (v === "pending") h.pending++;
      else if (
        v === null ||
        (typeof v === "object" && v !== null && "error" in v)
      )
        h.error++;
      else if (typeof v === "object" && v !== null && "status" in v)
        h[(v as { status: keyof MetricHealth }).status]++;
    }
  }
  return health;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ragCoverage(pct: number): "green" | "amber" | "red" {
  return pct >= 80 ? "green" : pct >= 50 ? "amber" : "red";
}

export function ragLint(errors: number): "green" | "amber" | "red" {
  return errors === 0 ? "green" : errors <= 5 ? "amber" : "red";
}

export function ciRag(
  conclusion: string | null,
  status: string
): "green" | "amber" | "red" {
  if (status === "in_progress" || status === "queued") return "amber";
  if (conclusion === "success") return "green";
  if (conclusion === "failure") return "red";
  return "amber";
}

export function fileMatchesFilter(
  file: {
    gitStatus?: string | null;
    coverage?: number | null;
    lintErrors?: number | null;
    lineCount?: number;
    metrics: Record<string, unknown>;
  },
  filter: InsightFilter
): boolean {
  if (filter.type === "git") return file.gitStatus === filter.status;
  if (filter.type === "coverage")
    return file.coverage !== null && file.coverage !== undefined;
  if (filter.type === "lint") return (file.lintErrors ?? 0) > 0;
  if (filter.type === "near-blank")
    return file.lineCount !== undefined && file.lineCount <= 1;
  if (filter.type === "security-refs") {
    const sec = file.metrics["security"];
    if (!sec || typeof sec !== "object" || "error" in sec) return false;
    const refs = (sec as { sensitiveRefs?: string[] }).sensitiveRefs ?? [];
    return filter.paths.some((p) => refs.includes(p));
  }
  const v = file.metrics[filter.name];
  if (filter.status === "error")
    return v === null || (typeof v === "object" && v !== null && "error" in v);
  return (
    typeof v === "object" &&
    v !== null &&
    "status" in v &&
    (v as { status: string }).status === filter.status
  );
}

export function filterMatches(a: InsightFilter, b: InsightFilter): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "git" && b.type === "git") return a.status === b.status;
  if (a.type === "metric" && b.type === "metric")
    return a.name === b.name && a.status === b.status;
  if (a.type === "security-refs" && b.type === "security-refs") return true;
  // coverage and lint filters have no additional discriminators
  return a.type === b.type;
}
