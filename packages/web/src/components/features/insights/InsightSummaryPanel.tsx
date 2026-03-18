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
  ciRag,
  filterMatches,
  fileMatchesFilter,
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
  const avgLines = files.length > 0 ? Math.round(totalLines / files.length) : 0;
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
  const filteredCount = activeFilter
    ? files.filter((f) => fileMatchesFilter(f, activeFilter)).length
    : 0;

  function gitPill(filter: InsightFilter, colorClass: string, label: string) {
    const active = activeFilter !== null && filterMatches(activeFilter, filter);
    return (
      <button
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
      <div className="insight-summary-panel__row">
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
        {avgLines > 0 && (
          <span className="insight-summary-panel__stat">
            <span className="insight-summary-panel__stat-value">
              {avgLines}
            </span>
            <span className="insight-summary-panel__stat-label">
              avg lines/file
            </span>
          </span>
        )}
      </div>

      <div className="insight-summary-panel__row">
        {(modifiedCount > 0 || untrackedCount > 0) && (
          <>
            <span className="insight-summary-panel__metric">
              <span className="insight-summary-panel__metric-label">git</span>
              {modifiedCount > 0 &&
                gitPill(
                  { type: "git", status: "modified" },
                  "amber",
                  `${modifiedCount} M`
                )}
              {untrackedCount > 0 &&
                gitPill(
                  { type: "git", status: "untracked" },
                  "red",
                  `${untrackedCount} U`
                )}
            </span>
            <span className="insight-summary-panel__divider" />
          </>
        )}

        {aggregate?.coverage && (
          <span className="insight-summary-panel__aggregate">
            <span className="insight-summary-panel__metric-label">cov</span>
            <button
              className={`insight-summary-panel__rag insight-summary-panel__rag--${ragCoverage(aggregate.coverage.linesPct)}${activeFilter?.type === "coverage" ? " insight-summary-panel__rag--active" : ""}`}
              onClick={() => onFilterToggle({ type: "coverage" })}
              title={`${aggregate.coverage.linesPct}% line coverage · ${timeAgo(aggregate.coverage.reportedAt)} — ${activeFilter?.type === "coverage" ? "clear filter" : "filter by coverage"}`}
            >
              {aggregate.coverage.linesPct}%
            </button>
          </span>
        )}

        {aggregate?.lint && (
          <span className="insight-summary-panel__aggregate">
            <span className="insight-summary-panel__metric-label">lint</span>
            <button
              className={`insight-summary-panel__rag insight-summary-panel__rag--${ragLint(aggregate.lint.errors)}${activeFilter?.type === "lint" ? " insight-summary-panel__rag--active" : ""}`}
              onClick={() => onFilterToggle({ type: "lint" })}
              title={`${aggregate.lint.errors} errors · ${aggregate.lint.warnings} warnings · ${timeAgo(aggregate.lint.reportedAt)} — ${activeFilter?.type === "lint" ? "clear filter" : "filter files with errors"}`}
            >
              {aggregate.lint.errors === 0
                ? "clean"
                : `${aggregate.lint.errors} err`}
            </button>
          </span>
        )}

        {(aggregate?.coverage || aggregate?.lint) && ciStatus?.run && (
          <span className="insight-summary-panel__divider" />
        )}

        {ciStatus?.run && (
          <span className="insight-summary-panel__aggregate">
            <span className="insight-summary-panel__metric-label">CI</span>
            <button
              className={`insight-summary-panel__rag insight-summary-panel__rag--${ciRag(ciStatus.run.conclusion, ciStatus.run.status)}`}
              onClick={onCIClick}
              title={`CI ${ciStatus.run.conclusion ?? ciStatus.run.status} · ${timeAgo(ciStatus.run.createdAt)} — view details`}
            >
              {ciStatus.run.status !== "completed"
                ? "running"
                : (ciStatus.run.conclusion ?? "—")}
            </button>
          </span>
        )}

        <InsightMetricPills
          metricEntries={metricEntries}
          health={health}
          activeFilter={activeFilter}
          onFilterToggle={onFilterToggle}
        />

        {files.length > 0 && metricNames.length > 0 && (
          <span className="insight-summary-panel__analyzed">
            {analyzed}/{files.length}
          </span>
        )}

        {activeFilter && (
          <span className="insight-summary-panel__filter-badge">
            ● {filteredCount} filtered
          </span>
        )}
      </div>
    </div>
  );
}
