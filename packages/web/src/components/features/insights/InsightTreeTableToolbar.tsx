import type { InsightFilter } from "@/api/endpoints/insights";
import "@/components/features/insights/InsightTreeTable.css";

function filterLabel(filter: InsightFilter): string {
  if (filter.type === "git")
    return filter.status === "modified" ? "Modified files" : "Untracked files";
  if (filter.type === "coverage") return "Files with coverage";
  if (filter.type === "lint") return "Files with lint errors";
  if (filter.type === "near-blank") return "Near-blank files (≤1 line)";
  if (filter.type === "security-refs")
    return `Referencing unignored: ${filter.paths.join(", ")}`;
  const statusLabels: Record<string, string> = {
    red: "critical",
    amber: "warn",
    green: "ok",
    error: "error",
  };
  return `${filter.name} — ${statusLabels[filter.status] ?? filter.status}`;
}

type Props = {
  viewMode: "tree" | "type" | "score" | "excluded";
  onViewMode: (mode: "tree" | "type" | "score" | "excluded") => void;
  activeFilter: InsightFilter | null;
  fileCount: number;
  excludedCount: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClearFilter: () => void;
};

export function InsightTreeTableToolbar({
  viewMode,
  onViewMode,
  activeFilter,
  fileCount,
  excludedCount,
  onExpandAll,
  onCollapseAll,
  onClearFilter,
}: Props) {
  function btn(
    mode: "tree" | "type" | "score" | "excluded",
    label: string,
    count?: number
  ) {
    return (
      <button
        className={`insight-tree-table__toolbar-btn${viewMode === mode ? " insight-tree-table__toolbar-btn--active" : ""}`}
        onClick={() => onViewMode(mode)}
      >
        {label}
        {count !== undefined && count > 0 && (
          <span className="insight-tree-table__toolbar-btn-count">{count}</span>
        )}
      </button>
    );
  }

  return (
    <div className="insight-tree-table__toolbar">
      {btn("tree", "Tree")}
      {btn("type", "By type")}
      {btn("score", "By score")}
      {btn("excluded", "Excluded", excludedCount)}
      <span className="insight-tree-table__toolbar-sep" />
      <button
        className="insight-tree-table__toolbar-btn"
        onClick={() => onExpandAll()}
      >
        Expand all
      </button>
      <button
        className="insight-tree-table__toolbar-btn"
        onClick={onCollapseAll}
      >
        Collapse all
      </button>
      {activeFilter && (
        <span className="insight-tree-table__filter-banner">
          <span className="insight-tree-table__filter-label">
            {filterLabel(activeFilter)} ({fileCount})
          </span>
          <button
            className="insight-tree-table__filter-clear"
            onClick={onClearFilter}
          >
            ✕ clear
          </button>
        </span>
      )}
    </div>
  );
}
