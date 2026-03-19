import { useState, useEffect, useMemo } from "react";
import type { FileSnapshotDTO, InsightFilter } from "@/api/endpoints/insights";
import {
  buildTree,
  flattenVisible,
  collectAllFolderPaths,
  rowId,
} from "@/components/features/insights/InsightTreeTable.utils";
import {
  FolderTableRow,
  FileTableRow,
} from "@/components/features/insights/InsightTreeTable.rows";
import "@/components/features/insights/InsightTreeTable.css";

type Props = {
  files: FileSnapshotDTO[];
  metricLabels: Record<string, string>;
  highlightedPath: string | null;
  selectedPath: string | null;
  onFileSelect: (relativePath: string) => void;
  onInspect: (relativePath: string) => void;
  activeFilter: InsightFilter | null;
  onClearFilter: () => void;
};

function filterLabel(filter: InsightFilter): string {
  if (filter.type === "git")
    return filter.status === "modified" ? "Modified files" : "Untracked files";
  if (filter.type === "coverage") return "Files with coverage";
  if (filter.type === "lint") return "Files with lint errors";
  const statusLabels: Record<string, string> = {
    red: "critical",
    amber: "warn",
    green: "ok",
    error: "error",
  };
  return `${filter.name} — ${statusLabels[filter.status] ?? filter.status}`;
}

export function InsightTreeTable({
  files,
  metricLabels,
  highlightedPath,
  selectedPath,
  onFileSelect,
  onInspect,
  activeFilter,
  onClearFilter,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [flashPath, setFlashPath] = useState<string | null>(null);

  const metricNames = useMemo(() => Object.keys(metricLabels), [metricLabels]);
  const metricEntries = useMemo(
    () => Object.entries(metricLabels),
    [metricLabels]
  );

  const tree = useMemo(() => buildTree(files), [files]);
  const allFolderPaths = useMemo(
    () => new Set(collectAllFolderPaths(tree)),
    [tree]
  );
  const effectiveExpanded = activeFilter ? allFolderPaths : expanded;

  const rows = useMemo(
    () => flattenVisible(tree, 0, effectiveExpanded, metricNames, true),
    [tree, effectiveExpanded, metricNames]
  );

  useEffect(() => {
    if (!highlightedPath) return;
    const parts = highlightedPath.split("/");
    const ancestors = parts
      .slice(0, -1)
      .map((_, i) => parts.slice(0, i + 1).join("/"))
      .filter(Boolean);
    setExpanded((prev) => {
      const next = new Set(prev);
      ancestors.forEach((p) => next.add(p));
      return next;
    });
    setFlashPath(highlightedPath);
    setTimeout(() => {
      document
        .getElementById(rowId(highlightedPath))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    const timer = setTimeout(() => setFlashPath(null), 1800);
    return () => clearTimeout(timer);
  }, [highlightedPath]);

  function toggleFolder(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="insight-tree-table">
      <div className="insight-tree-table__toolbar">
        <button
          className="insight-tree-table__toolbar-btn"
          onClick={() => setExpanded(new Set(collectAllFolderPaths(tree)))}
        >
          Expand all
        </button>
        <button
          className="insight-tree-table__toolbar-btn"
          onClick={() => setExpanded(new Set())}
        >
          Collapse all
        </button>
        {activeFilter && (
          <span className="insight-tree-table__filter-banner">
            <span className="insight-tree-table__filter-label">
              {filterLabel(activeFilter)} ({files.length})
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

      <div className="insight-tree-table__header">
        <div className="insight-tree-table__col insight-tree-table__col--name">
          Name
        </div>
        <div className="insight-tree-table__col insight-tree-table__col--lines">
          Lines
        </div>
        {metricEntries.map(([name, label]) => (
          <div
            key={name}
            className="insight-tree-table__col insight-tree-table__col--metric"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="insight-tree-table__body">
        {rows.map((row) => {
          if (row.kind === "folder") {
            return (
              <FolderTableRow
                key={row.node.path}
                row={row}
                metricNames={metricNames}
                onToggle={toggleFolder}
              />
            );
          }
          return (
            <FileTableRow
              key={row.file.relativePath}
              row={row}
              flashPath={flashPath}
              selectedPath={selectedPath}
              activeFilter={activeFilter}
              metricEntries={metricEntries}
              onSelect={onFileSelect}
              onInspect={onInspect}
            />
          );
        })}
      </div>
    </div>
  );
}
