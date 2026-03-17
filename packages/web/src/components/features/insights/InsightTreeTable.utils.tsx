import type { FileSnapshotDTO } from "@/api/endpoints/insights";
import "@/components/features/insights/InsightTreeTable.css";

export interface FolderNode {
  kind: "folder";
  name: string;
  path: string;
  childFolders: FolderNode[];
  files: FileSnapshotDTO[];
}

export interface FolderStats {
  fileCount: number;
  totalLines: number;
  metricCounts: Record<
    string,
    {
      green: number;
      amber: number;
      red: number;
      error: number;
      pending: number;
      unrun: number;
    }
  >;
}

export interface FolderRow {
  kind: "folder";
  node: FolderNode;
  stats: FolderStats;
  depth: number;
  expanded: boolean;
}

export interface FileRow {
  kind: "file";
  file: FileSnapshotDTO;
  depth: number;
}

export type DisplayRow = FolderRow | FileRow;

function getOrCreateFolder(
  parent: FolderNode,
  name: string,
  path: string
): FolderNode {
  const existing = parent.childFolders.find((f) => f.path === path);
  if (existing) return existing;
  const folder: FolderNode = {
    kind: "folder",
    name,
    path,
    childFolders: [],
    files: [],
  };
  parent.childFolders.push(folder);
  return folder;
}

function sortFolder(node: FolderNode): void {
  node.childFolders.sort((a, b) => a.name.localeCompare(b.name));
  node.files.sort((a, b) => a.name.localeCompare(b.name));
  for (const child of node.childFolders) sortFolder(child);
}

export function buildTree(files: FileSnapshotDTO[]): FolderNode {
  const root: FolderNode = {
    kind: "folder",
    name: "",
    path: "",
    childFolders: [],
    files: [],
  };
  for (const file of files) {
    const parts = file.relativePath.split("/");
    const dirParts = parts.slice(0, -1);
    let current = root;
    let accPath = "";
    for (const segment of dirParts) {
      accPath = accPath ? `${accPath}/${segment}` : segment;
      current = getOrCreateFolder(current, segment, accPath);
    }
    current.files.push(file);
  }
  sortFolder(root);
  return root;
}

export function collectFiles(node: FolderNode): FileSnapshotDTO[] {
  const result: FileSnapshotDTO[] = [...node.files];
  for (const child of node.childFolders) result.push(...collectFiles(child));
  return result;
}

export function collectAllFolderPaths(node: FolderNode): string[] {
  const paths: string[] = [];
  if (node.path) paths.push(node.path);
  for (const child of node.childFolders)
    paths.push(...collectAllFolderPaths(child));
  return paths;
}

function computeStats(node: FolderNode, metricNames: string[]): FolderStats {
  const allFiles = collectFiles(node);
  const totalLines = allFiles.reduce((s, f) => s + f.lineCount, 0);
  const metricCounts: FolderStats["metricCounts"] = {};
  for (const name of metricNames) {
    const counts = {
      green: 0,
      amber: 0,
      red: 0,
      error: 0,
      pending: 0,
      unrun: 0,
    };
    for (const file of allFiles) {
      const v = file.metrics[name];
      if (v === "pending") counts.pending++;
      else if (v === undefined) counts.unrun++;
      else if (
        v === null ||
        (typeof v === "object" && v !== null && "error" in v)
      )
        counts.error++;
      else if (typeof v === "object" && v !== null && "status" in v)
        counts[v.status]++;
    }
    metricCounts[name] = counts;
  }
  return { fileCount: allFiles.length, totalLines, metricCounts };
}

export function flattenVisible(
  node: FolderNode,
  depth: number,
  expanded: Set<string>,
  metricNames: string[],
  isRoot: boolean
): DisplayRow[] {
  const rows: DisplayRow[] = [];
  if (!isRoot) {
    const stats = computeStats(node, metricNames);
    rows.push({
      kind: "folder",
      node,
      stats,
      depth,
      expanded: expanded.has(node.path),
    });
    if (!expanded.has(node.path)) return rows;
  }
  for (const child of node.childFolders) {
    rows.push(
      ...flattenVisible(
        child,
        isRoot ? 0 : depth + 1,
        expanded,
        metricNames,
        false
      )
    );
  }
  for (const file of node.files) {
    rows.push({ kind: "file", file, depth: isRoot ? 0 : depth + 1 });
  }
  return rows;
}

export function rowId(relativePath: string): string {
  return "insight-row-" + relativePath.replace(/[^a-zA-Z0-9]/g, "-");
}

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
