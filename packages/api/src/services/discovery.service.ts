import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";

export interface AggregateStatsDTO {
  coverage: { linesPct: number; reportedAt: string } | null;
  lint: { errors: number; warnings: number; reportedAt: string } | null;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readPackageJson(
  dir: string
): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(join(dir, "package.json"), "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const discoveryService = {
  async findCoverageReport(dir: string): Promise<string | null> {
    const pkg = await readPackageJson(dir);

    if (pkg) {
      // Jest config inline in package.json
      const jest = pkg.jest as Record<string, unknown> | undefined;
      if (typeof jest?.coverageDirectory === "string") {
        const candidate = join(
          dir,
          jest.coverageDirectory,
          "coverage-summary.json"
        );
        if (await fileExists(candidate)) return candidate;
      }

      // Vitest/Jest via scripts — look for --coverage.reportsDirectory or --coverageDirectory
      const scripts = pkg.scripts as Record<string, string> | undefined;
      if (scripts) {
        for (const script of Object.values(scripts)) {
          const match =
            script.match(/--coverage\.reportsDirectory[=\s]+([^\s]+)/) ??
            script.match(/--coverageDirectory[=\s]+([^\s]+)/);
          if (match?.[1]) {
            const candidate = join(dir, match[1], "coverage-summary.json");
            if (await fileExists(candidate)) return candidate;
          }
        }
      }
    }

    // Conventional default paths
    for (const rel of [
      "coverage/coverage-summary.json",
      ".coverage/coverage-summary.json",
      "test-results/coverage-summary.json",
    ]) {
      const full = join(dir, rel);
      if (await fileExists(full)) return full;
    }

    return null;
  },

  async getAggregateStats(rootDir: string): Promise<AggregateStatsDTO> {
    // Collect candidate directories: root + all immediate subdirs + their subdirs (depth 2)
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
          /* skip unreadable dirs */
        }
      }
    } catch {
      /* skip if rootDir unreadable */
    }

    // Aggregate coverage across all found reports
    let covLines = 0,
      covCovered = 0;
    let covReportedAt: Date | null = null;

    for (const d of dirs) {
      const p = await this.findCoverageReport(d);
      if (!p) continue;
      try {
        type Summary = Record<
          string,
          { lines: { total: number; covered: number } }
        >;
        const raw = JSON.parse(await readFile(p, "utf-8")) as Summary;
        const total = raw["total"];
        if (total) {
          covLines += total.lines.total;
          covCovered += total.lines.covered;
          const mtime = new Date((await stat(p)).mtime);
          if (!covReportedAt || mtime > covReportedAt) covReportedAt = mtime;
        }
      } catch {
        /* skip unreadable */
      }
    }

    const coverage =
      covLines > 0 && covReportedAt
        ? {
            linesPct: Math.round((covCovered / covLines) * 100),
            reportedAt: covReportedAt.toISOString(),
          }
        : null;

    // Aggregate lint across all found reports
    type EslintFile = { errorCount: number; warningCount: number };
    let lintErrors = 0,
      lintWarnings = 0;
    let lintReportedAt: Date | null = null;
    const seenLint = new Set<string>();

    for (const d of dirs) {
      const p = await this.findLintReport(d);
      if (!p || seenLint.has(p)) continue;
      seenLint.add(p);
      try {
        const report = JSON.parse(await readFile(p, "utf-8")) as EslintFile[];
        for (const r of report) {
          lintErrors += r.errorCount;
          lintWarnings += r.warningCount;
        }
        const mtime = new Date((await stat(p)).mtime);
        if (!lintReportedAt || mtime > lintReportedAt) lintReportedAt = mtime;
      } catch {
        /* skip unreadable */
      }
    }

    const lint = lintReportedAt
      ? {
          errors: lintErrors,
          warnings: lintWarnings,
          reportedAt: lintReportedAt.toISOString(),
        }
      : null;

    return { coverage, lint };
  },

  async findLintReport(dir: string): Promise<string | null> {
    const pkg = await readPackageJson(dir);

    if (pkg) {
      const scripts = pkg.scripts as Record<string, string> | undefined;
      if (scripts) {
        for (const script of Object.values(scripts)) {
          // eslint ... --output-file path.json
          const match = script.match(/eslint\b.*?--output-file[=\s]+([^\s]+)/);
          if (match?.[1]) {
            const candidate = join(dir, match[1]);
            if (await fileExists(candidate)) return candidate;
          }
        }
      }
    }

    // Conventional paths
    for (const rel of [
      ".eslint-report.json",
      "eslint-report.json",
      "reports/eslint.json",
      ".reports/eslint.json",
    ]) {
      const full = join(dir, rel);
      if (await fileExists(full)) return full;
    }

    return null;
  },
};
