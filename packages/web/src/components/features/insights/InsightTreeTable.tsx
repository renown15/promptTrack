import type { FileSnapshotDTO, InsightFilter } from "@/api/endpoints/insights";
import { FileDiscussionMenu } from "@/components/features/insights/FileDiscussionMenu";
import "@/components/features/insights/InsightTreeTable.css";
import { filterTreeTableFiles } from "@/components/features/insights/InsightTreeTable.filter";
import { useHighlightPath } from "@/components/features/insights/InsightTreeTable.hooks";
import { useOverrideDialog } from "@/components/features/insights/InsightTreeTable.override";
import {
  FileTableRow,
  FolderTableRow,
} from "@/components/features/insights/InsightTreeTable.rows";
import {
  buildTree,
  buildTypeTree,
  collectAllFolderPaths,
  flattenVisible,
} from "@/components/features/insights/InsightTreeTable.utils";
import { InsightTreeTableToolbar } from "@/components/features/insights/InsightTreeTableToolbar";
import { useEffect, useMemo, useState } from "react";

type Props = {
  collectionId: string;
  files: FileSnapshotDTO[];
  metricLabels: Record<string, string>;
  highlightedPath: string | null;
  selectedPath: string | null;
  onFileSelect: (relativePath: string) => void;
  onInspect: (relativePath: string) => void;
  activeFilter: InsightFilter | null;
  onClearFilter: () => void;
  excludedPaths: Set<string>;
  onExcludePath: (path: string) => void;
};

export function InsightTreeTable({
  collectionId,
  files,
  metricLabels,
  highlightedPath,
  selectedPath,
  onFileSelect,
  onInspect,
  activeFilter,
  onClearFilter,
  excludedPaths,
  onExcludePath,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [flashPath, setFlashPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    "tree" | "type" | "score" | "excluded"
  >("tree");
  const [discussionFile, setDiscussionFile] = useState<string | null>(null);
  const [discussionRect, setDiscussionRect] = useState<DOMRect | null>(null);
  const { openOverride, dialog: overrideDialog } = useOverrideDialog(
    collectionId,
    files,
    metricLabels
  );

  const metricNames = useMemo(() => Object.keys(metricLabels), [metricLabels]);
  const metricEntries = useMemo(
    () => Object.entries(metricLabels),
    [metricLabels]
  );

  // Filter files based on view mode, exclusions, and active filter
  const filteredFiles = useMemo(
    () => filterTreeTableFiles(files, viewMode, excludedPaths, activeFilter),
    [files, viewMode, excludedPaths, activeFilter]
  );

  const tree = useMemo(() => buildTree(filteredFiles), [filteredFiles]);
  const typeTree = useMemo(() => buildTypeTree(filteredFiles), [filteredFiles]);
  const activeTree =
    viewMode === "tree" || viewMode === "score" || viewMode === "excluded"
      ? tree
      : typeTree;
  const allFolderPaths = useMemo(
    () => new Set(collectAllFolderPaths(activeTree)),
    [activeTree]
  );
  const effectiveExpanded = activeFilter ? allFolderPaths : expanded;

  const scoreRows = useMemo(
    () =>
      [...filteredFiles]
        .filter((f) => f.problemScore > 0)
        .sort((a, b) => b.problemScore - a.problemScore)
        .map((f) => ({ kind: "file" as const, file: f, depth: 0 })),
    [filteredFiles]
  );

  const rows = useMemo(() => {
    if (viewMode === "score") return scoreRows;
    return flattenVisible(activeTree, 0, effectiveExpanded, metricNames, true);
  }, [viewMode, scoreRows, activeTree, effectiveExpanded, metricNames]);

  useEffect(() => {
    setExpanded(new Set());
  }, [viewMode]);

  useHighlightPath({
    highlightedPath,
    viewMode,
    files,
    onSetFlash: setFlashPath,
    onSetExpanded: setExpanded,
  });

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
        excludedCount={excludedPaths.size}
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
                isExcluded={excludedPaths.has(row.node.path)}
                onExclude={onExcludePath}
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
              onDiscuss={(e) => {
                setDiscussionFile(row.file.relativePath);
                setDiscussionRect(
                  (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                );
              }}
              onOverride={(metric) =>
                openOverride(row.file.relativePath, metric)
              }
            />
          );
        })}
      </div>

      {discussionFile && discussionRect && (
        <FileDiscussionMenu
          collectionId={collectionId}
          relativePath={discussionFile}
          triggerRect={discussionRect}
          onClose={() => {
            setDiscussionFile(null);
            setDiscussionRect(null);
          }}
        />
      )}

      {overrideDialog}
    </div>
  );
}
