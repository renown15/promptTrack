import type {
  AggregateStatsDTO,
  CIStatusDTO,
  FileSnapshotDTO,
  InsightFilter,
} from "@/api/endpoints/insights";
import { CodebaseTile } from "@/components/features/insights/CodebaseTile";
import { GitTile } from "@/components/features/insights/GitTile";
import { InsightMetricPills } from "@/components/features/insights/InsightMetricPills";
import "@/components/features/insights/InsightSummaryPanel.css";
import {
  Badge,
  Tile,
} from "@/components/features/insights/InsightSummaryPanel.helpers";
import { computeHealth } from "@/components/features/insights/InsightSummaryPanel.utils";
import { PipelineTile } from "@/components/features/insights/PipelineTile";

type Props = {
  files: FileSnapshotDTO[];
  metricLabels: Record<string, string>;
  aggregate: AggregateStatsDTO | null;
  ciStatus: CIStatusDTO | null;
  activeFilter: InsightFilter | null;
  gitignoreWarnings: string[];
  onFilterToggle: (filter: InsightFilter) => void;
  onCIClick: () => void;
};

export function InsightSummaryPanel({
  files,
  metricLabels,
  aggregate,
  ciStatus,
  activeFilter,
  gitignoreWarnings,
  onFilterToggle,
  onCIClick,
}: Props) {
  const metricEntries = Object.entries(metricLabels);
  const health = computeHealth(
    files,
    metricEntries.map(([n]) => n)
  );
  const modifiedCount = files.filter((f) => f.gitStatus === "modified").length;
  const untrackedCount = files.filter(
    (f) => f.gitStatus === "untracked"
  ).length;
  const noRemote = ciStatus !== null && ciStatus.error === "no_remote";
  const hasScanned = files.length > 0;

  return (
    <div className="insight-summary-panel">
      <div className="insight-summary-panel__grid">
        <Tile label="codebase">
          <CodebaseTile files={files} gitignoreWarnings={gitignoreWarnings} />
        </Tile>

        <Tile label="git">
          {noRemote && (
            <Badge colorClass="red" title="No git remote origin configured">
              no remote
            </Badge>
          )}
          {!noRemote && (
            <GitTile
              modifiedCount={modifiedCount}
              untrackedCount={untrackedCount}
              activeFilter={activeFilter}
              onFilterToggle={onFilterToggle}
            />
          )}
        </Tile>

        {hasScanned && (
          <Tile label="pipeline">
            <PipelineTile
              aggregate={aggregate}
              ciStatus={ciStatus}
              activeFilter={activeFilter}
              onFilterToggle={onFilterToggle}
              onCIClick={onCIClick}
            />
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
