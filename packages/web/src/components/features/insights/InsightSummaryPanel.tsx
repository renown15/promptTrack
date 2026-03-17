import type {
  FileSnapshotDTO,
  AggregateStatsDTO,
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
  lastScan: string | null;
  scanning: boolean;
  onScan: () => void;
  onConfig: () => void;
  modelLabel: string | null;
  aggregate: AggregateStatsDTO | null;
  activeFilter: InsightFilter | null;
  onFilterToggle: (filter: InsightFilter) => void;
};

export function InsightSummaryPanel({
  files,
  metricLabels,
  lastScan,
  scanning,
  onScan,
  onConfig,
  modelLabel,
  aggregate,
  activeFilter,
  onFilterToggle,
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
    const key = `${filter.type}-${filter.type === "git" ? filter.status : `${filter.name}-${filter.status}`}`;
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
        {files.length > 0 && metricNames.length > 0 && (
          <span className="insight-summary-panel__progress">
            <span className="insight-summary-panel__progress-bar">
              <span
                className="insight-summary-panel__progress-fill"
                style={{ width: `${(analyzed / files.length) * 100}%` }}
              />
            </span>
            <span className="insight-summary-panel__progress-label">
              {analyzed} / {files.length}
            </span>
          </span>
        )}

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
              <span
                className={`insight-summary-panel__rag insight-summary-panel__rag--${ragCoverage(aggregate.coverage.linesPct)}`}
              >
                {aggregate.coverage.linesPct}%
              </span>
              <span className="insight-summary-panel__age">
                {timeAgo(aggregate.coverage.reportedAt)}
              </span>
            </span>
          </>
        )}
        {aggregate?.lint && (
          <span className="insight-summary-panel__aggregate">
            <span className="insight-summary-panel__metric-label">lint</span>
            <span
              className={`insight-summary-panel__rag insight-summary-panel__rag--${ragLint(aggregate.lint.errors)}`}
            >
              {aggregate.lint.errors === 0
                ? "clean"
                : `${aggregate.lint.errors} err`}
            </span>
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

        <InsightMetricPills
          metricEntries={metricEntries}
          health={health}
          activeFilter={activeFilter}
          onFilterToggle={onFilterToggle}
        />
      </div>
      <div className="insight-summary-panel__actions">
        {lastScan && (
          <span className="insight-summary-panel__last-scan">
            {timeAgo(lastScan)}
          </span>
        )}
        {scanning && (
          <span className="insight-summary-panel__scanning">Scanning…</span>
        )}
        <button
          className="insight-summary-panel__scan-btn"
          onClick={onScan}
          disabled={scanning}
        >
          ↻ Scan
        </button>
        <button
          className="insight-summary-panel__config-btn"
          onClick={onConfig}
          title={modelLabel ?? "Configure Ollama"}
        >
          ⚙ {modelLabel ?? "Ollama"}
        </button>
      </div>
    </div>
  );
}
