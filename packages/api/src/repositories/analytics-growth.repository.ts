import { prisma } from "@/config/prisma.js";

export interface CodeMakeup {
  fileType: string;
  fileCount: number;
  lineCount: number;
  avgCoverage: number | null;
}

export const analyticsRepositoryGrowth = {
  async getGrowthMetrics(
    collectionId: string,
    days: number = 30
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
      select: { scannedAt: true, lineCount: true },
    });

    if (snapshots.length < 2) {
      return {
        startLines: 0,
        endLines: 0,
        growthPercent: 0,
        avgLineChange: 0,
      };
    }

    const startLines = snapshots
      .slice(0, Math.max(1, Math.floor(snapshots.length * 0.1)))
      .reduce((sum, s) => sum + s.lineCount, 0);

    const endLines = snapshots
      .slice(Math.floor(snapshots.length * 0.9))
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

  async getCurrentCodeMakeup(collectionId: string): Promise<CodeMakeup[]> {
    // Get latest snapshot per file
    const latestSnapshots = await prisma.fileSnapshotRecord.findMany({
      where: { collectionId },
      distinct: ["relativePath"],
      orderBy: { scannedAt: "desc" },
      select: {
        fileType: true,
        lineCount: true,
        coverage: true,
      },
    });

    // Group by file type
    const byType = new Map<
      string,
      { files: number; lines: number; coverage: number[] }
    >();
    latestSnapshots.forEach((snapshot) => {
      if (!byType.has(snapshot.fileType)) {
        byType.set(snapshot.fileType, { files: 0, lines: 0, coverage: [] });
      }
      const stats = byType.get(snapshot.fileType)!;
      stats.files += 1;
      stats.lines += snapshot.lineCount;
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
      }))
      .sort((a, b) => b.lineCount - a.lineCount);
  },
};
