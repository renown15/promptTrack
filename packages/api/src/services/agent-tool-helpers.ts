import type { MetricValue } from "@/services/insight.cache.js";
import type { insightService } from "@/services/insight.service.js";

export type MetricCounts = {
  green: number;
  amber: number;
  red: number;
  error: number;
  pending: number;
};

export type Recommendation = {
  priority: "high" | "medium" | "low" | "none";
  action: string;
  detail: string;
};

export function countMetrics(
  files: ReturnType<typeof insightService.getState>["files"]
): Record<string, MetricCounts> {
  const counts: Record<string, MetricCounts> = {};
  for (const file of files) {
    for (const [name, value] of Object.entries(file.metrics)) {
      const c = (counts[name] ??= {
        green: 0,
        amber: 0,
        red: 0,
        error: 0,
        pending: 0,
      });
      if (value === "pending") {
        c.pending++;
        continue;
      }
      if (!value || typeof value !== "object" || "error" in value) {
        c.error++;
        continue;
      }
      const s = (value as { status?: string }).status ?? "error";
      const key = (
        s === "green" || s === "amber" || s === "red" ? s : "error"
      ) as keyof MetricCounts;
      c[key]++;
    }
  }
  return counts;
}

export function buildRecommendations(
  files: ReturnType<typeof insightService.getState>["files"],
  coverage: number | null,
  lintErrors: number,
  counts: Record<string, MetricCounts>
): Recommendation[] {
  const recs: Recommendation[] = [];

  const untracked = files.filter((f) => f.gitStatus === "untracked").length;
  const modified = files.filter((f) => f.gitStatus === "modified").length;

  if (untracked > 0)
    recs.push({
      priority: "high",
      action: "track_or_ignore_files",
      detail: `${untracked} untracked file(s) — commit them or add to .gitignore.`,
    });
  if (modified > 0)
    recs.push({
      priority: "high",
      action: "commit_pending_work",
      detail: `${modified} modified file(s) with uncommitted changes.`,
    });
  if ((counts.security?.red ?? 0) > 0)
    recs.push({
      priority: "high",
      action: "fix_security_issues",
      detail: `${counts.security!.red} file(s) with security RED. Run list_problem_files to investigate.`,
    });
  if (lintErrors > 0)
    recs.push({
      priority: "high",
      action: "fix_lint_errors",
      detail: `${lintErrors} lint error(s) — run make lint-fix.`,
    });
  if (coverage !== null && coverage < 60)
    recs.push({
      priority: "high",
      action: "improve_test_coverage",
      detail: `Coverage is ${coverage}% — below 60% threshold. Run list_problem_files to find low-coverage files.`,
    });
  else if (coverage !== null && coverage < 80)
    recs.push({
      priority: "medium",
      action: "improve_test_coverage",
      detail: `Coverage is ${coverage}% — below 80% target.`,
    });
  if ((counts.eng_quality?.red ?? 0) > 3)
    recs.push({
      priority: "medium",
      action: "address_engineering_quality",
      detail: `${counts.eng_quality!.red} file(s) with eng_quality RED. Run list_problem_files for details.`,
    });
  if ((counts.dry?.red ?? 0) > 0)
    recs.push({
      priority: "low",
      action: "fix_dry_violations",
      detail: `${counts.dry!.red} file(s) with DRY RED — refactor repeated patterns.`,
    });

  return recs;
}

export function suggestFix(file: {
  gitStatus: string | null;
  coverage: number | null;
  metrics: Record<string, MetricValue>;
}): string {
  if (file.gitStatus === "untracked")
    return "Commit this file or add to .gitignore.";
  if (file.gitStatus === "modified") return "Commit pending changes.";

  const statusOf = (s: string) =>
    Object.entries(file.metrics)
      .filter(
        ([, v]) =>
          typeof v === "object" &&
          v !== null &&
          !("error" in v) &&
          (v as { status: string }).status === s
      )
      .map(([k]) => k);

  const red = statusOf("red");
  if (red.includes("security"))
    return "Fix security issue — check for hardcoded secrets or injection risks.";
  if (red.includes("dry")) return "Refactor to eliminate code duplication.";
  if (red.includes("eng_quality"))
    return "Add error handling and improve observability.";
  if (file.coverage !== null && file.coverage < 50)
    return `Add tests — coverage is ${file.coverage}%.`;

  const amber = statusOf("amber");
  if (amber.length > 0)
    return `Review ${amber.join(", ")} metrics — currently amber.`;

  return "Review file for potential improvements.";
}
