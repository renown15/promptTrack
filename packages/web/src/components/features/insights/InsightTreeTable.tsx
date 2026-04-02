import { useState, useEffect, useMemo } from "react";
import type { FileSnapshotDTO, InsightFilter } from "@/api/endpoints/insights";
import {
  buildTree,
  buildTypeTree,
  flattenVisible,
  collectAllFolderPaths,
  rowId,
} from "@/components/features/insights/InsightTreeTable.utils";
import {
  FolderTableRow,
  FileTableRow,
} from "@/components/features/insights/InsightTreeTable.rows";
import { InsightTreeTableToolbar } from "@/components/features/insights/InsightTreeTableToolbar";
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
  const [viewMode, setViewMode] = useState<"tree" | "type" | "score">("tree");

  const metricNames = useMemo(() => Object.keys(metricLabels), [metricLabels]);
  const metricEntries = useMemo(
    () => Object.entries(metricLabels),
    [metricLabels]
  );

  const tree = useMemo(() => buildTree(files), [files]);
  const typeTree = useMemo(() => buildTypeTree(files), [files]);
  const activeTree =
    viewMode === "tree" || viewMode === "score" ? tree : typeTree;
  const allFolderPaths = useMemo(
    () => new Set(collectAllFolderPaths(activeTree)),
    [activeTree]
  );
  const effectiveExpanded = activeFilter ? allFolderPaths : expanded;

  const scoreRows = useMemo(
    () =>
      [...files]
        .filter((f) => f.problemScore > 0)
        .sort((a, b) => b.problemScore - a.problemScore)
        .map((f) => ({ kind: "file" as const, file: f, depth: 0 })),
    [files]
  );

  const rows = useMemo(
    () =>
      viewMode === "score"
        ? scoreRows
        : flattenVisible(activeTree, 0, effectiveExpanded, metricNames, true),
    [viewMode, scoreRows, activeTree, effectiveExpanded, metricNames]
  );

  useEffect(() => {
    setExpanded(new Set());
  }, [viewMode]);

  useEffect(() => {
    if (!highlightedPath) return;
    if (viewMode === "type") {
      const file = files.find((f) => f.relativePath === highlightedPath);
      if (file) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.add(`__type__${file.fileType}`);
          return next;
        });
      }
    } else {
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
    }
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
      <InsightTreeTableToolbar
        viewMode={viewMode}
        onViewMode={setViewMode}
        activeFilter={activeFilter}
        fileCount={files.length}
        onExpandAll={() =>
          setExpanded(new Set(collectAllFolderPaths(activeTree)))
        }
        onCollapseAll={() => setExpanded(new Set())}
        onClearFilter={onClearFilter}
      />

      <div className="insight-tree-table__header">
        <div className="insight-tree-table__col insight-tree-table__col--name">
          Name
        </div>
        <div className="insight-tree-table__col insight-tree-table__col--lines">
          Lines
        </div>
        <div className="insight-tree-table__col insight-tree-table__col--score">
          Score
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
