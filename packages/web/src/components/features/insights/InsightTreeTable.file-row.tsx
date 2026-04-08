import type { InsightFilter } from "@/api/endpoints/insights";
import { fileMatchesFilter } from "@/components/features/insights/InsightSummaryPanel.utils";
import "@/components/features/insights/InsightTreeTable.css";
import type { FileRow } from "@/components/features/insights/InsightTreeTable.utils";
import { MetricBadge } from "@/components/features/insights/MetricBadge";

type FileRowProps = {
  row: FileRow;
  flashPath: string | null;
  selectedPath: string | null;
  activeFilter: InsightFilter | null;
  metricEntries: [string, string][];
  onSelect: (path: string) => void;
  onInspect: (path: string) => void;
  onDiscuss: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onOverride: (metric: string) => void;
};

export function FileTableRow({
  row,
  flashPath,
  selectedPath,
  activeFilter,
  metricEntries,
  onSelect,
  onInspect,
  onDiscuss,
  onOverride,
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
        <button
          className="insight-tree-table__inspect-btn"
          title="Inspect file"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(row.file.relativePath);
          }}
        >
          👓
        </button>
        <button
          className="file-discuss-btn insight-tree-table__discuss-btn"
          title="Discuss with LLM"
          onClick={(e) => {
            e.stopPropagation();
            onDiscuss(e);
          }}
        >
          💬
        </button>
      </div>
      <div className="insight-tree-table__col insight-tree-table__col--lines">
        {row.file.lineCount}
      </div>
      <div className="insight-tree-table__col insight-tree-table__col--score">
        {row.file.problemScore > 0 && (
          <span
            className={`insight-tree-table__score insight-tree-table__score--${row.file.problemScore >= 10 ? "high" : row.file.problemScore >= 5 ? "mid" : "low"}`}
          >
            {row.file.problemScore}
          </span>
        )}
      </div>
      {metricEntries.map(([name, label]) => {
        const override = row.file.overrides?.[name];
        return (
          <div
            key={name}
            className="insight-tree-table__col insight-tree-table__col--metric insight-tree-table__metric-cell"
          >
            <MetricBadge
              label={label}
              value={row.file.metrics[name]}
              {...(override !== undefined && { override })}
            />
            <button
              className="insight-tree-table__override-btn"
              title={
                override
                  ? `Override: ${override.status} — ${override.comment}`
                  : "Set override"
              }
              onClick={(e) => {
                e.stopPropagation();
                onOverride(name);
              }}
            >
              {override ? "✎" : "⊘"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
