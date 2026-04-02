import type { FolderStats } from "@/components/features/insights/InsightTreeTable.core";

type Counts = FolderStats["metricCounts"][string];

export function MetricCountCell({ counts }: { counts: Counts }) {
  const analyzed = counts.green + counts.amber + counts.red + counts.error;
  if (analyzed === 0) {
    return (
      <span className="insight-tree-table__count insight-tree-table__count--unrun">
        —
      </span>
    );
  }
  return (
    <span className="insight-tree-table__counts">
      {counts.red > 0 && (
        <span className="insight-tree-table__count insight-tree-table__count--red">
          {counts.red}
        </span>
      )}
      {counts.amber > 0 && (
        <span className="insight-tree-table__count insight-tree-table__count--amber">
          {counts.amber}
        </span>
      )}
      {counts.green > 0 && (
        <span className="insight-tree-table__count insight-tree-table__count--green">
          {counts.green}
        </span>
      )}
      {counts.error > 0 && (
        <span className="insight-tree-table__count insight-tree-table__count--error">
          {counts.error}
        </span>
      )}
    </span>
  );
}
