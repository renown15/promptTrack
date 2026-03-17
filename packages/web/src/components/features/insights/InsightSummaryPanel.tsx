import type {
  FileSnapshotDTO,
  AggregateStatsDTO,
  CIStatusDTO,
  InsightFilter,
} from "@/api/endpoints/insights";
import {
  computeHealth,
  timeAgo,
  ragCoverage,
  ragLint,
  filterMatches,
} from "@/components/features/insights/InsightSummaryPanel.utils";
import { InsightMetricPills } from "@/components/features/insights/InsightMetricPills";
import "@/components/features/insights/InsightSummaryPanel.css";

type Props = {
  files: FileSnapshotDTO[];
  metricLabels: Record<string, string>;
  aggregate: AggregateStatsDTO | null;
  ciStatus: CIStatusDTO | null;
  activeFilter: InsightFilter | null;
  onFilterToggle: (filter: InsightFilter) => void;
  onCIClick: () => void;
};

function ciRag(
  conclusion: string | null,
  status: string
): "green" | "amber" | "red" {
  if (status === "in_progress" || status === "queued") return "amber";
  if (conclusion === "success") return "green";
  if (conclusion === "failure") return "red";
  return "amber";
}

export function InsightSummaryPanel({
  files,
  metricLabels,
  aggregate,
  ciStatus,
  activeFilter,
  onFilterToggle,
  onCIClick,
}: Props) {
  const totalLines = files.reduce((s, f) => s + f.lineCount, 0);
  const metricEntries = Object.entries(metricLabels);
  const metricNames = metricEntries.map(([n]) => n);
  const health = computeHealth(files, metricNames);
  const analyzed =
    metricNames.length > 0
      ? files.filter((f) =>
          metricNames.every((n) => {
            const v = f.metrics[n];
            return v !== undefined && v !== "pending";
          })
        ).length
      : 0;
  const modifiedCount = files.filter((f) => f.gitStatus === "modified").length;
  const untrackedCount = files.filter(
    (f) => f.gitStatus === "untracked"
  ).length;

  function pill(filter: InsightFilter, colorClass: string, label: string) {
    const active = activeFilter !== null && filterMatches(activeFilter, filter);
    const key =
      filter.type === "git"
        ? `git-${filter.status}`
        : filter.type === "metric"
          ? `metric-${filter.name}-${filter.status}`
          : filter.type;
    return (
      <button
        key={key}
        className={`insight-summary-panel__count insight-summary-panel__count--${colorClass}${active ? " insight-summary-panel__count--active" : ""}`}
        onClick={() => onFilterToggle(filter)}
        title={active ? "Clear filter" : `Filter: ${label}`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="insight-summary-panel">
      <div className="insight-summary-panel__stats">
        <span className="insight-summary-panel__stat">
          <span className="insight-summary-panel__stat-value">
            {files.length}
          </span>
          <span className="insight-summary-panel__stat-label">files</span>
        </span>
        <span className="insight-summary-panel__stat">
          <span className="insight-summary-panel__stat-value">
            {totalLines.toLocaleString()}
          </span>
          <span className="insight-summary-panel__stat-label">lines</span>
        </span>
        {(modifiedCount > 0 || untrackedCount > 0) && (
          <>
            <span className="insight-summary-panel__divider" />
            <span className="insight-summary-panel__metric">
              <span className="insight-summary-panel__metric-label">git</span>
              {modifiedCount > 0 &&
                pill(
                  { type: "git", status: "modified" },
                  "amber",
                  `${modifiedCount} M`
                )}
              {untrackedCount > 0 &&
                pill(
                  { type: "git", status: "untracked" },
                  "red",
                  `${untrackedCount} U`
                )}
            </span>
          </>
        )}

        {aggregate?.coverage && (
          <>
            <span className="insight-summary-panel__divider" />
            <span className="insight-summary-panel__aggregate">
              <span className="insight-summary-panel__metric-label">
                coverage
              </span>
              <button
                className={`insight-summary-panel__rag insight-summary-panel__rag--${ragCoverage(aggregate.coverage.linesPct)}${activeFilter?.type === "coverage" ? " insight-summary-panel__rag--active" : ""}`}
                onClick={() => onFilterToggle({ type: "coverage" })}
                title={
                  activeFilter?.type === "coverage"
                    ? "Clear filter"
                    : "Filter: files with coverage data"
                }
              >
                {aggregate.coverage.linesPct}%
              </button>
              <span className="insight-summary-panel__age">
                {timeAgo(aggregate.coverage.reportedAt)}
              </span>
            </span>
          </>
        )}
        {aggregate?.lint && (
          <span className="insight-summary-panel__aggregate">
            <span className="insight-summary-panel__metric-label">lint</span>
            <button
              className={`insight-summary-panel__rag insight-summary-panel__rag--${ragLint(aggregate.lint.errors)}${activeFilter?.type === "lint" ? " insight-summary-panel__rag--active" : ""}`}
              onClick={() => onFilterToggle({ type: "lint" })}
              title={
                activeFilter?.type === "lint"
                  ? "Clear filter"
                  : "Filter: files with lint errors"
              }
            >
              {aggregate.lint.errors === 0
                ? "clean"
                : `${aggregate.lint.errors} err`}
            </button>
            {aggregate.lint.warnings > 0 && (
              <span className="insight-summary-panel__rag insight-summary-panel__rag--amber">
                {aggregate.lint.warnings} warn
              </span>
            )}
            <span className="insight-summary-panel__age">
              {timeAgo(aggregate.lint.reportedAt)}
            </span>
          </span>
        )}

        {ciStatus?.run && (
          <span className="insight-summary-panel__aggregate">
            <span className="insight-summary-panel__metric-label">CI</span>
            <button
              className={`insight-summary-panel__rag insight-summary-panel__rag--${ciRag(ciStatus.run.conclusion, ciStatus.run.status)}`}
              onClick={onCIClick}
              title="View CI details"
            >
              {ciStatus.run.status !== "completed"
                ? "running"
                : (ciStatus.run.conclusion ?? "—")}
            </button>
            <span className="insight-summary-panel__age">
              {timeAgo(ciStatus.run.createdAt)}
            </span>
          </span>
        )}

        {files.length > 0 && metricNames.length > 0 && (
          <span className="insight-summary-panel__aggregate">
            <span className="insight-summary-panel__metric-label">
              analyzed
            </span>
            <span
              className={`insight-summary-panel__rag insight-summary-panel__rag--${analyzed === files.length ? "green" : analyzed > 0 ? "amber" : "red"}`}
            >
              {analyzed} / {files.length}
            </span>
          </span>
        )}

        <InsightMetricPills
          metricEntries={metricEntries}
          health={health}
          activeFilter={activeFilter}
          onFilterToggle={onFilterToggle}
        />
      </div>
    </div>
  );
}
