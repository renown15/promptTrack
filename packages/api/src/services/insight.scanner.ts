import type { FileSnapshot, GitFileStatus } from "@/services/insight.cache.js";
import { execFile } from "child_process";
import { readdir, readFile, stat } from "fs/promises";
import { basename, extname, join, relative } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function getGitStatus(
  rootDir: string
): Promise<Map<string, GitFileStatus>> {
  const statusMap = new Map<string, GitFileStatus>();
  try {
    const { stdout: topRaw } = await execFileAsync(
      "git",
      ["-C", rootDir, "rev-parse", "--show-toplevel"],
      { timeout: 5000 }
    );
    const gitRoot = topRaw.trim();

    const { stdout } = await execFileAsync(
      "git",
      ["-C", rootDir, "status", "--porcelain", "-uall"],
      { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }
    );

    for (const line of stdout.split("\n")) {
      if (line.length < 4) continue;
      const xy = line.slice(0, 2);
      let filePath = line.slice(3);
      // Renames: "old -> new" — take the destination
      if (filePath.includes(" -> ")) filePath = filePath.split(" -> ")[1]!;
      const absPath = join(gitRoot, filePath.trim());
      const relPath = relative(rootDir, absPath);
      statusMap.set(relPath, xy === "??" ? "untracked" : "modified");
    }
  } catch {
    /* git unavailable or not a repo */
  }
  return statusMap;
}

export const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".css",
  ".md",
]);

export const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  "__pycache__",
  ".cache",
  "vendor",
]);

function fileTypeFromExt(ext: string): string {
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

export async function readSnapshot(
  abs: string,
  root: string
): Promise<FileSnapshot | null> {
  try {
    const ext = extname(abs).toLowerCase();
    const [info, content] = await Promise.all([
      stat(abs),
      readFile(abs, "utf-8"),
    ]);
    return {
      relativePath: relative(root, abs),
      name: basename(abs),
      fileType: fileTypeFromExt(ext),
      lineCount: content.split("\n").length,
      lineDelta: null,
      updatedAt: info.mtime,
      coverage: null,
      lintErrors: null,
      gitStatus: null,
      metrics: {},
    };
  } catch {
    return null;
  }
}

export async function* walkCode(
  dir: string,
  root: string,
  depth: number,
  excludedDirs: string[] = []
): AsyncGenerator<FileSnapshot> {
  if (depth > 6) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const dirs: string[] = [];
  const files: string[] = [];

  // Check if current directory is excluded
  const relDir = relative(root, dir);
  if (
    excludedDirs.includes(relDir) ||
    (relDir !== "." && excludedDirs.some((ex) => relDir.startsWith(ex + "/")))
  ) {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        const childPath = join(dir, entry.name);
        const childRel = relative(root, childPath);
        // Skip if child is excluded
        if (
          !excludedDirs.includes(childRel) &&
          !excludedDirs.some((ex) => childRel.startsWith(ex + "/"))
        ) {
          dirs.push(childPath);
        }
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (CODE_EXTENSIONS.has(ext)) files.push(join(dir, entry.name));
    }
  }

  const CONCURRENCY = 20;
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const snaps = await Promise.all(batch.map((f) => readSnapshot(f, root)));
    for (const s of snaps) if (s) yield s;
  }

  for (const d of dirs) {
    yield* walkCode(d, root, depth + 1, excludedDirs);
  }
}
