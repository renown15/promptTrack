import type { InsightFilter } from "@/api/endpoints/insights";
import "@/components/features/insights/InsightTreeTable.css";
import type { FolderRow } from "@/components/features/insights/InsightTreeTable.utils";
import { MetricCountCell } from "@/components/features/insights/InsightTreeTable.utils";

export { FileTableRow } from "@/components/features/insights/InsightTreeTable.file-row";
export type { InsightFilter };

type FolderRowProps = {
  row: FolderRow;
  metricNames: string[];
  onToggle: (path: string) => void;
  isExcluded: boolean;
  onExclude: (path: string) => void;
};

export function FolderTableRow({
  row,
  metricNames,
  onToggle,
  isExcluded,
  onExclude,
}: FolderRowProps) {
  const folderRowClass = [
    "insight-tree-table__folder-row",
    isExcluded ? "insight-tree-table__folder-row--excluded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      key={row.node.path}
      className={folderRowClass}
      onClick={() => onToggle(row.node.path)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onToggle(row.node.path)}
    >
      <div
        className="insight-tree-table__col insight-tree-table__col--name"
        style={{ "--indent": `${row.depth}rem` } as React.CSSProperties}
      >
        <span className="insight-tree-table__chevron">
          {row.expanded ? "▾" : "▸"}
        </span>
        <span className="insight-tree-table__folder-name">
          {row.node.name}/
        </span>
        <span className="insight-tree-table__folder-count">
          {row.stats.fileCount}f
        </span>
        <button
          className={`insight-tree-table__exclude-btn ${
            isExcluded ? "insight-tree-table__exclude-btn--active" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onExclude(row.node.path);
          }}
          title={isExcluded ? "Include in analysis" : "Exclude from analysis"}
          aria-label={isExcluded ? "Include" : "Exclude"}
        >
          {isExcluded ? "Include" : "Exclude"}
        </button>
      </div>
      <div className="insight-tree-table__col insight-tree-table__col--lines">
        {row.stats.totalLines.toLocaleString()}
      </div>
      <div className="insight-tree-table__col insight-tree-table__col--score">
        {row.stats.maxProblemScore > 0 && (
          <span
            className={`insight-tree-table__score insight-tree-table__score--${row.stats.maxProblemScore >= 10 ? "high" : row.stats.maxProblemScore >= 5 ? "mid" : "low"}`}
          >
            {row.stats.maxProblemScore}
          </span>
        )}
      </div>
      {metricNames.map((name) => {
        const counts = row.stats.metricCounts[name];
        return (
          <div
            key={name}
            className="insight-tree-table__col insight-tree-table__col--metric"
          >
            {counts && <MetricCountCell counts={counts} />}
          </div>
        );
      })}
    </div>
  );
}
