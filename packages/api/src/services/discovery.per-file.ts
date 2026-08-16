import { relative } from "path";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { discoveryService } from "@/services/discovery.service.js";

async function collectDirs(rootDir: string): Promise<string[]> {
  const dirs: string[] = [rootDir];
  try {
    const level1 = await readdir(rootDir, { withFileTypes: true });
    for (const e of level1) {
      if (
        !e.isDirectory() ||
        e.name.startsWith(".") ||
        e.name === "node_modules"
      )
        continue;
      const d1 = join(rootDir, e.name);
      dirs.push(d1);
      try {
        const level2 = await readdir(d1, { withFileTypes: true });
        for (const e2 of level2) {
          if (
            !e2.isDirectory() ||
            e2.name.startsWith(".") ||
            e2.name === "node_modules"
          )
            continue;
          dirs.push(join(d1, e2.name));
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return dirs;
}

/**
 * Extract per-file coverage percentages from a coverage report.
 *
 * Supported formats:
 *   - Jest/Vitest: keys are absolute paths, value has `lines.pct`
 *   - Python coverage.py JSON: has `files` property, keys are relative paths,
 *     value has `summary.percent_covered`
 */
function parseCoveragePerFile(
  raw: unknown,
  rootDir: string
): Map<string, number> {
  const result = new Map<string, number>();
  if (typeof raw !== "object" || raw === null) return result;
  const obj = raw as Record<string, unknown>;

  // Python coverage.py JSON: { "files": { "src/foo.py": { "summary": { "percent_covered": N } } } }
  if ("files" in obj) {
    type PythonFiles = Record<
      string,
      { summary?: { percent_covered?: number } }
    >;
    const files = obj["files"] as PythonFiles | undefined;
    if (files) {
      for (const [path, data] of Object.entries(files)) {
        const pct = data.summary?.percent_covered;
        if (pct !== undefined) {
          // Paths may be relative or absolute
          const rel = path.startsWith("/") ? relative(rootDir, path) : path;
          if (!rel.startsWith("..")) result.set(rel, Math.round(pct));
        }
      }
      return result;
    }
  }

  // Jest/Vitest: { "total": {...}, "/abs/src/foo.ts": { "lines": { "pct": N } } }
  type JestEntry = { lines?: { pct?: number } };
  for (const [absPath, data] of Object.entries(obj)) {
    if (absPath === "total") continue;
    const d = data as JestEntry | undefined;
    if (d?.lines?.pct !== undefined) {
      const rel = relative(rootDir, absPath);
      if (!rel.startsWith("..")) result.set(rel, Math.round(d.lines.pct));
    }
  }

  return result;
}

/**
 * Extract per-file error counts from a lint report.
 *
 * Supported formats:
 *   - ESLint JSON: [{ filePath: "/abs/path", errorCount: N }]
 *   - Ruff JSON:   [{ filename: "rel/path", ... }] — one entry per violation
 */
function parseLintPerFile(
  arr: unknown[],
  rootDir: string
): Map<string, number> {
  const result = new Map<string, number>();
  if (arr.length === 0) return result;
  const first = arr[0];
  if (typeof first !== "object" || first === null) return result;

  // ESLint format
  if ("errorCount" in first) {
    type EslintFile = { filePath: string; errorCount: number };
    for (const r of arr as EslintFile[]) {
      const rel = relative(rootDir, r.filePath);
      if (!rel.startsWith(".."))
        result.set(rel, (result.get(rel) ?? 0) + r.errorCount);
    }
    return result;
  }

  // Ruff format — each entry is one violation
  if ("filename" in first) {
    type RuffViolation = { filename: string };
    for (const v of arr as RuffViolation[]) {
      const rel = v.filename.startsWith("/")
        ? relative(rootDir, v.filename)
        : v.filename;
      if (!rel.startsWith("..")) result.set(rel, (result.get(rel) ?? 0) + 1);
    }
    return result;
  }

  return result;
}

export async function getPerFileMaps(rootDir: string): Promise<{
  coveragePct: Map<string, number>;
  lintErrors: Map<string, number>;
}> {
  const coveragePct = new Map<string, number>();
  const lintErrors = new Map<string, number>();
  const dirs = await collectDirs(rootDir);

  // Per-file coverage
  const seenCov = new Set<string>();
  for (const d of dirs) {
    const p = await discoveryService.findCoverageReport(d);
    if (!p || seenCov.has(p)) continue;
    seenCov.add(p);
    try {
      const raw = JSON.parse(await readFile(p, "utf-8")) as unknown;
      for (const [rel, pct] of parseCoveragePerFile(raw, rootDir)) {
        coveragePct.set(rel, pct);
      }
    } catch {
      /* skip */
    }
  }

  // Per-file lint errors
  const seenLint = new Set<string>();
  for (const d of dirs) {
    const p = await discoveryService.findLintReport(d);
    if (!p || seenLint.has(p)) continue;
    seenLint.add(p);
    try {
      const report = JSON.parse(await readFile(p, "utf-8")) as unknown[];
      for (const [rel, count] of parseLintPerFile(report, rootDir)) {
        lintErrors.set(rel, (lintErrors.get(rel) ?? 0) + count);
      }
    } catch {
      /* skip */
    }
  }

  return { coveragePct, lintErrors };
}
