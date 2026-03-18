import type { ReactNode } from "react";
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

function Tile({
  label,
  age,
  children,
}: {
  label: string;
  age?: string;
  children: ReactNode;
}) {
  return (
    <div className="insight-summary-panel__tile">
      <div className="insight-summary-panel__tile-header">
        <span className="insight-summary-panel__tile-label">{label}</span>
        {age && <span className="insight-summary-panel__tile-age">{age}</span>}
      </div>
      <div className="insight-summary-panel__tile-body">{children}</div>
    </div>
  );
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
  const avgLines = files.length > 0 ? Math.round(totalLines / files.length) : 0;
  const metricEntries = Object.entries(metricLabels);
  const metricNames = metricEntries.map(([n]) => n);
  const health = computeHealth(files, metricNames);
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
        <Tile label="files">
          <span className="insight-summary-panel__tile-num">
            {files.length}
          </span>
        </Tile>

        <Tile label="lines">
          <span className="insight-summary-panel__tile-num">
            {totalLines.toLocaleString()}
          </span>
        </Tile>

        {avgLines > 0 && (
          <Tile label="avg / file">
            <span className="insight-summary-panel__tile-num">{avgLines}</span>
          </Tile>
        )}

        <Tile label="git">
          {modifiedCount === 0 && untrackedCount === 0 ? (
            <span className="insight-summary-panel__tile-clean">clean</span>
          ) : (
            <div className="insight-summary-panel__tile-body">
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
            </div>
          )}
        </Tile>

        {aggregate?.coverage && (
          <Tile label="coverage" age={timeAgo(aggregate.coverage.reportedAt)}>
            <button
              className={`insight-summary-panel__tile-rag insight-summary-panel__tile-rag--${ragCoverage(aggregate.coverage.linesPct)}${activeFilter?.type === "coverage" ? " insight-summary-panel__tile-rag--active" : ""}`}
              onClick={() => onFilterToggle({ type: "coverage" })}
              title={
                activeFilter?.type === "coverage"
                  ? "Clear filter"
                  : "Filter: files with coverage data"
              }
            >
              {aggregate.coverage.linesPct}%
            </button>
          </Tile>
        )}

        {aggregate?.lint && (
          <Tile label="lint" age={timeAgo(aggregate.lint.reportedAt)}>
            <div className="insight-summary-panel__tile-body">
              <button
                className={`insight-summary-panel__tile-rag insight-summary-panel__tile-rag--${ragLint(aggregate.lint.errors)}${activeFilter?.type === "lint" ? " insight-summary-panel__tile-rag--active" : ""}`}
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
                <span className="insight-summary-panel__tile-rag insight-summary-panel__tile-rag--amber">
                  {aggregate.lint.warnings} warn
                </span>
              )}
            </div>
          </Tile>
        )}

        {ciStatus?.run && (
          <Tile label="CI" age={timeAgo(ciStatus.run.createdAt)}>
            <button
              className={`insight-summary-panel__tile-rag insight-summary-panel__tile-rag--${ciRag(ciStatus.run.conclusion, ciStatus.run.status)}`}
              onClick={onCIClick}
              title="View CI details"
            >
              {ciStatus.run.status !== "completed"
                ? "running"
                : (ciStatus.run.conclusion ?? "—")}
            </button>
          </Tile>
        )}

        {activeFilter && (
          <span className="insight-summary-panel__filter-badge">
            ● {filteredCount} filtered
          </span>
        )}
      </div>

      {metricEntries.length > 0 && (
        <InsightMetricPills
          metricEntries={metricEntries}
          health={health}
          activeFilter={activeFilter}
          onFilterToggle={onFilterToggle}
        />
      )}
    </div>
  );
}
