import { prisma } from "@/config/prisma.js";

function shouldExcludePath(path: string, excludedDirs: string[]): boolean {
  if (!excludedDirs || excludedDirs.length === 0) return false;
  const firstSegment = path.split("/")[0];
  return excludedDirs.some(
    (dir) => dir === firstSegment || path.startsWith(dir + "/")
  );
}

export interface CodeMakeup {
  fileType: string;
  fileCount: number;
  lineCount: number;
  avgCoverage: number | null;
  nearBlankCount: number;
}

export const analyticsRepositoryGrowth = {
  async getGrowthMetrics(
    collectionId: string,
    days: number = 30,
    excludedDirs: string[] = []
  ): Promise<{
    startLines: number;
    endLines: number;
    growthPercent: number;
    avgLineChange: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await prisma.fileSnapshotRecord.findMany({
      where: {
        collectionId,
        scannedAt: { gte: startDate },
      },
      orderBy: { scannedAt: "asc" },
      select: { scannedAt: true, lineCount: true, relativePath: true },
    });

    // Filter by excluded directories
    const filteredSnapshots = snapshots.filter(
      (s) => !shouldExcludePath(s.relativePath, excludedDirs)
    );

    if (filteredSnapshots.length < 2) {
      return {
        startLines: 0,
        endLines: 0,
        growthPercent: 0,
        avgLineChange: 0,
      };
    }

    const startLines = filteredSnapshots
      .slice(0, Math.max(1, Math.floor(filteredSnapshots.length * 0.1)))
      .reduce((sum, s) => sum + s.lineCount, 0);

    const endLines = filteredSnapshots
      .slice(Math.floor(filteredSnapshots.length * 0.9))
      .reduce((sum, s) => sum + s.lineCount, 0);

    const avgLineChange = endLines - startLines;
    const growthPercent =
      startLines > 0 ? ((endLines - startLines) / startLines) * 100 : 0;

    return {
      startLines,
      endLines,
      growthPercent,
      avgLineChange,
    };
  },

  async getCurrentCodeMakeup(
    collectionId: string,
    excludedDirs: string[] = []
  ): Promise<CodeMakeup[]> {
    // Get latest snapshot per file
    const latestSnapshots = await prisma.fileSnapshotRecord.findMany({
      where: { collectionId },
      distinct: ["relativePath"],
      orderBy: { scannedAt: "desc" },
      select: {
        fileType: true,
        lineCount: true,
        coverage: true,
        relativePath: true,
      },
    });

    // Filter by excluded directories
    const filteredSnapshots = latestSnapshots.filter(
      (s) => !shouldExcludePath(s.relativePath, excludedDirs)
    );

    // Group by file type
    const byType = new Map<
      string,
      { files: number; lines: number; coverage: number[]; nearBlank: number }
    >();
    filteredSnapshots.forEach((snapshot) => {
      if (!byType.has(snapshot.fileType)) {
        byType.set(snapshot.fileType, {
          files: 0,
          lines: 0,
          coverage: [],
          nearBlank: 0,
        });
      }
      const stats = byType.get(snapshot.fileType)!;
      stats.files += 1;
      stats.lines += snapshot.lineCount;
      if (snapshot.lineCount <= 1) {
        stats.nearBlank += 1;
      }
      if (snapshot.coverage !== null) {
        stats.coverage.push(snapshot.coverage);
      }
    });

    return Array.from(byType.entries())
      .map(([fileType, stats]) => ({
        fileType,
        fileCount: stats.files,
        lineCount: stats.lines,
        avgCoverage:
          stats.coverage.length > 0
            ? stats.coverage.reduce((a, b) => a + b, 0) / stats.coverage.length
            : null,
        nearBlankCount: stats.nearBlank,
      }))
      .sort((a, b) => b.lineCount - a.lineCount);
  },
};
