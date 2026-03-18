import type { InsightFilter } from "@/api/endpoints/insights";
import { MetricBadge } from "@/components/features/insights/MetricBadge";
import { MetricCountCell } from "@/components/features/insights/InsightTreeTable.utils";
import { fileMatchesFilter } from "@/components/features/insights/InsightSummaryPanel.utils";
import type {
  FolderRow,
  FileRow,
} from "@/components/features/insights/InsightTreeTable.utils";
import "@/components/features/insights/InsightTreeTable.css";

type FolderRowProps = {
  row: FolderRow;
  metricNames: string[];
  onToggle: (path: string) => void;
};

export function FolderTableRow({ row, metricNames, onToggle }: FolderRowProps) {
  return (
    <div
      key={row.node.path}
      className="insight-tree-table__folder-row"
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
      </div>
      <div className="insight-tree-table__col insight-tree-table__col--lines">
        {row.stats.totalLines.toLocaleString()}
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

type FileRowProps = {
  row: FileRow;
  flashPath: string | null;
  selectedPath: string | null;
  activeFilter: InsightFilter | null;
  metricEntries: [string, string][];
  onSelect: (path: string) => void;
};

export function FileTableRow({
  row,
  flashPath,
  selectedPath,
  activeFilter,
  metricEntries,
  onSelect,
}: FileRowProps) {
  const isFlashing = row.file.relativePath === flashPath;
  const isSelected = row.file.relativePath === selectedPath;
  const isHighlighted =
    activeFilter !== null && fileMatchesFilter(row.file, activeFilter);
  const rowClass = [
    "insight-tree-table__file-row",
    isFlashing ? "insight-tree-table__file-row--flash" : "",
    isSelected ? "insight-tree-table__file-row--selected" : "",
    isHighlighted ? "insight-tree-table__file-row--highlighted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      key={row.file.relativePath}
      className={rowClass}
      onClick={() => onSelect(row.file.relativePath)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(row.file.relativePath)}
    >
      <div
        className="insight-tree-table__col insight-tree-table__col--name"
        style={{ "--indent": `${row.depth}rem` } as React.CSSProperties}
      >
        <span
          className={`insight-tree-table__file-name${row.file.gitStatus && row.file.gitStatus !== "clean" ? ` insight-tree-table__file-name--${row.file.gitStatus}` : ""}`}
        >
          {row.file.name}
        </span>
        {row.file.gitStatus === "modified" && (
          <span className="insight-tree-table__git-badge insight-tree-table__git-badge--modified">
            M
          </span>
        )}
        {row.file.gitStatus === "untracked" && (
          <span className="insight-tree-table__git-badge insight-tree-table__git-badge--untracked">
            U
          </span>
        )}
      </div>
      <div className="insight-tree-table__col insight-tree-table__col--lines">
        {row.file.lineCount}
      </div>
      {metricEntries.map(([name, label]) => (
        <div
          key={name}
          className="insight-tree-table__col insight-tree-table__col--metric"
        >
          <MetricBadge label={label} value={row.file.metrics[name]} />
        </div>
      ))}
    </div>
  );
}

export type { InsightFilter };
