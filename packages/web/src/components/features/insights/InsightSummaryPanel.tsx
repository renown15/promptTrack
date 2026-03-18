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
} from "@/components/features/insights/InsightSummaryPanel.utils";
import { InsightMetricPills } from "@/components/features/insights/InsightMetricPills";
import {
  Tile,
  StatRow,
  PipelineRow,
  Badge,
} from "@/components/features/insights/InsightSummaryPanel.helpers";
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
  const health = computeHealth(
    files,
    metricEntries.map(([n]) => n)
  );
  const modifiedCount = files.filter((f) => f.gitStatus === "modified").length;
  const untrackedCount = files.filter(
    (f) => f.gitStatus === "untracked"
  ).length;

  function gitActive(status: "modified" | "untracked") {
    return (
      activeFilter !== null &&
      filterMatches(activeFilter, { type: "git", status })
    );
  }

  const hasPipeline = aggregate?.coverage || aggregate?.lint || ciStatus?.run;

  return (
    <div className="insight-summary-panel">
      <div className="insight-summary-panel__grid">
        <Tile label="codebase">
          <StatRow label="files" value={String(files.length)} />
          <StatRow label="lines" value={totalLines.toLocaleString()} />
          {avgLines > 0 && (
            <StatRow label="avg / file" value={String(avgLines)} />
          )}
        </Tile>

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
                  {modifiedCount} modified
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
                  {untrackedCount} untracked
                </Badge>
              )}
            </div>
          )}
        </Tile>

        {hasPipeline && (
          <Tile label="pipeline">
            {aggregate?.coverage && (
              <PipelineRow
                label="cov"
                age={timeAgo(aggregate.coverage.reportedAt)}
              >
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
              </PipelineRow>
            )}
            {aggregate?.lint && (
              <PipelineRow
                label="lint"
                age={timeAgo(aggregate.lint.reportedAt)}
              >
                <Badge
                  colorClass={ragLint(aggregate.lint.errors)}
                  clickable
                  active={activeFilter?.type === "lint"}
                  onClick={() => onFilterToggle({ type: "lint" })}
                  title={
                    activeFilter?.type === "lint"
                      ? "Clear filter"
                      : "Filter lint errors"
                  }
                >
                  {aggregate.lint.errors === 0
                    ? "clean"
                    : `${aggregate.lint.errors} err`}
                </Badge>
                {aggregate.lint.warnings > 0 && (
                  <Badge colorClass="amber">
                    {aggregate.lint.warnings} warn
                  </Badge>
                )}
              </PipelineRow>
            )}
            {ciStatus?.run && (
              <PipelineRow label="CI" age={timeAgo(ciStatus.run.createdAt)}>
                <Badge
                  colorClass={ciRag(
                    ciStatus.run.conclusion,
                    ciStatus.run.status
                  )}
                  clickable
                  onClick={onCIClick}
                  title="View CI details"
                >
                  {ciStatus.run.status !== "completed"
                    ? "running"
                    : (ciStatus.run.conclusion ?? "—")}
                </Badge>
              </PipelineRow>
            )}
          </Tile>
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
