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

export async function getPerFileMaps(rootDir: string): Promise<{
  coveragePct: Map<string, number>;
  lintErrors: Map<string, number>;
}> {
  const coveragePct = new Map<string, number>();
  const lintErrors = new Map<string, number>();
  const dirs = await collectDirs(rootDir);

  // Per-file coverage from coverage-summary.json
  const seenCov = new Set<string>();
  for (const d of dirs) {
    const p = await discoveryService.findCoverageReport(d);
    if (!p || seenCov.has(p)) continue;
    seenCov.add(p);
    try {
      type Summary = Record<string, { lines: { pct: number } }>;
      const raw = JSON.parse(await readFile(p, "utf-8")) as Summary;
      for (const [absPath, data] of Object.entries(raw)) {
        if (absPath === "total") continue;
        const rel = relative(rootDir, absPath);
        if (!rel.startsWith(".."))
          coveragePct.set(rel, Math.round(data.lines.pct));
      }
    } catch {
      /* skip */
    }
  }

  // Per-file lint errors from ESLint JSON report
  const seenLint = new Set<string>();
  for (const d of dirs) {
    const p = await discoveryService.findLintReport(d);
    if (!p || seenLint.has(p)) continue;
    seenLint.add(p);
    try {
      type EslintFile = { filePath: string; errorCount: number };
      const report = JSON.parse(await readFile(p, "utf-8")) as EslintFile[];
      for (const r of report) {
        const rel = relative(rootDir, r.filePath);
        if (!rel.startsWith(".."))
          lintErrors.set(rel, (lintErrors.get(rel) ?? 0) + r.errorCount);
      }
    } catch {
      /* skip */
    }
  }

  return { coveragePct, lintErrors };
}
