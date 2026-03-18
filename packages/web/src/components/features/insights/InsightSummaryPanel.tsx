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
      <div className="insight-summary-panel__tile-title">
        <span className="insight-summary-panel__tile-label">{label}</span>
        {age && <span className="insight-summary-panel__tile-age">{age}</span>}
      </div>
      {children}
    </div>
  );
}

function Badge({
  children,
  colorClass,
  clickable,
  active,
  onClick,
  title,
}: {
  children: ReactNode;
  colorClass: string;
  clickable?: boolean;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const cls = [
    "insight-summary-panel__badge",
    `insight-summary-panel__badge--${colorClass}`,
    clickable ? "insight-summary-panel__badge--clickable" : "",
    active ? "insight-summary-panel__badge--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (clickable && onClick) {
    return (
      <button className={cls} onClick={onClick} title={title}>
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
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
  const health = computeHealth(
    files,
    metricEntries.map(([n]) => n)
  );
  const modifiedCount = files.filter((f) => f.gitStatus === "modified").length;
  const untrackedCount = files.filter(
    (f) => f.gitStatus === "untracked"
  ).length;
  const filteredCount = activeFilter
    ? files.filter((f) => fileMatchesFilter(f, activeFilter)).length
    : 0;

  function gitActive(status: "modified" | "untracked") {
    return (
      activeFilter !== null &&
      filterMatches(activeFilter, { type: "git", status })
    );
  }

  return (
    <div className="insight-summary-panel">
      <div className="insight-summary-panel__grid">
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
            <div className="insight-summary-panel__tile-badges">
              {modifiedCount > 0 && (
                <Badge
                  colorClass="amber"
                  clickable
                  active={gitActive("modified")}
                  onClick={() =>
                    onFilterToggle({ type: "git", status: "modified" })
                  }
                  title={
                    gitActive("modified")
                      ? "Clear filter"
                      : "Filter modified files"
                  }
                >
                  {modifiedCount} M
                </Badge>
              )}
              {untrackedCount > 0 && (
                <Badge
                  colorClass="red"
                  clickable
                  active={gitActive("untracked")}
                  onClick={() =>
                    onFilterToggle({ type: "git", status: "untracked" })
                  }
                  title={
                    gitActive("untracked")
                      ? "Clear filter"
                      : "Filter untracked files"
                  }
                >
                  {untrackedCount} U
                </Badge>
              )}
            </div>
          )}
        </Tile>

        {aggregate?.coverage && (
          <Tile label="coverage" age={timeAgo(aggregate.coverage.reportedAt)}>
            <Badge
              colorClass={ragCoverage(aggregate.coverage.linesPct)}
              clickable
              active={activeFilter?.type === "coverage"}
              onClick={() => onFilterToggle({ type: "coverage" })}
              title={
                activeFilter?.type === "coverage"
                  ? "Clear filter"
                  : "Filter by coverage"
              }
            >
              {aggregate.coverage.linesPct}%
            </Badge>
          </Tile>
        )}

        {aggregate?.lint && (
          <Tile label="lint" age={timeAgo(aggregate.lint.reportedAt)}>
            <div className="insight-summary-panel__tile-badges">
              <Badge
                colorClass={ragLint(aggregate.lint.errors)}
                clickable
                active={activeFilter?.type === "lint"}
                onClick={() => onFilterToggle({ type: "lint" })}
                title={
                  activeFilter?.type === "lint"
                    ? "Clear filter"
                    : "Filter files with lint errors"
                }
              >
                {aggregate.lint.errors === 0
                  ? "clean"
                  : `${aggregate.lint.errors} err`}
              </Badge>
              {aggregate.lint.warnings > 0 && (
                <Badge colorClass="amber">{aggregate.lint.warnings} warn</Badge>
              )}
            </div>
          </Tile>
        )}

        {ciStatus?.run && (
          <Tile label="CI" age={timeAgo(ciStatus.run.createdAt)}>
            <Badge
              colorClass={ciRag(ciStatus.run.conclusion, ciStatus.run.status)}
              clickable
              onClick={onCIClick}
              title="View CI details"
            >
              {ciStatus.run.status !== "completed"
                ? "running"
                : (ciStatus.run.conclusion ?? "—")}
            </Badge>
          </Tile>
        )}

        <InsightMetricPills
          metricEntries={metricEntries}
          health={health}
          activeFilter={activeFilter}
          onFilterToggle={onFilterToggle}
        />

        {activeFilter && (
          <span className="insight-summary-panel__filter-badge">
            ● {filteredCount} filtered
          </span>
        )}
      </div>
    </div>
  );
}
