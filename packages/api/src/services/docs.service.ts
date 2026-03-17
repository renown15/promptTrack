import { readdir, readFile, stat } from "fs/promises";
import { join, relative, resolve } from "path";

const SKIP_DIRS = new Set([
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

export interface DocFile {
  name: string;
  relativePath: string;
  lineCount: number;
  updatedAt: string;
}

async function walk(
  dir: string,
  root: string,
  depth: number
): Promise<DocFile[]> {
  if (depth > 4) return [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: DocFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        const sub = await walk(join(dir, entry.name), root, depth + 1);
        results.push(...sub);
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const abs = join(dir, entry.name);
      const [content, info] = await Promise.all([
        readFile(abs, "utf-8"),
        stat(abs),
      ]);
      const lineCount = content.split("\n").length;
      results.push({
        name: entry.name,
        relativePath: relative(root, abs),
        lineCount,
        updatedAt: info.mtime.toISOString(),
      });
    }
  }

  return results;
}

export const docsService = {
  async list(directory: string): Promise<DocFile[]> {
    const files = await walk(directory, directory, 0);
    return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  },

  async content(directory: string, filePath: string): Promise<string> {
    const abs = resolve(directory, filePath);
    if (
      !abs.startsWith(resolve(directory) + "/") &&
      abs !== resolve(directory)
    ) {
      throw new Error("Forbidden");
    }
    return readFile(abs, "utf-8");
  },
};
