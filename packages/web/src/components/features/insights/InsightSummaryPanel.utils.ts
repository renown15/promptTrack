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

export function filterMatches(a: InsightFilter, b: InsightFilter): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "git" && b.type === "git") return a.status === b.status;
  if (a.type === "metric" && b.type === "metric")
    return a.name === b.name && a.status === b.status;
  return false;
}
