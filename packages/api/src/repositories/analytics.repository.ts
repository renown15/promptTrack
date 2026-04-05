import { prisma } from "@/config/prisma.js";

export interface VolumeSnapshot {
  date: string;
  totalFiles: number;
  totalLines: number;
  byFileType: Array<{
    fileType: string;
    fileCount: number;
    lineCount: number;
  }>;
}

export interface CoverageSnapshot {
  date: string;
  avgCoverage: number;
  fileCount: number;
  coveredFiles: number;
}

export const analyticsRepository = {
  async getVolumeTimeseries(
    collectionId: string,
    days: number = 30
  ): Promise<VolumeSnapshot[]> {
    const displayEndDate = new Date();
    const displayStartDate = new Date();
    displayStartDate.setDate(displayStartDate.getDate() - days);

    // Query ALL snapshots to find when each file first appeared and line count
    const allRecords = await prisma.fileSnapshotRecord.findMany({
      where: {
        collectionId,
      },
      select: {
        scannedAt: true,
        fileType: true,
        lineCount: true,
        relativePath: true,
      },
      orderBy: { scannedAt: "asc" },
    });

    if (allRecords.length === 0) {
      return [];
    }

    // For each unique file, capture line count at first appearance
    const fileFirstAppearance = new Map<
      string,
      { date: string; lineCount: number; fileType: string }
    >();

    allRecords.forEach((record) => {
      const fileKey = `${record.relativePath}:${record.fileType}`;
      if (!fileFirstAppearance.has(fileKey)) {
        const dateKey = new Date(record.scannedAt)
          .toISOString()
          .substring(0, 10);
        fileFirstAppearance.set(fileKey, {
          date: dateKey,
          lineCount: record.lineCount,
          fileType: record.fileType,
        });
      }
    });

    // Get all unique creation dates
    const creationDates = Array.from(fileFirstAppearance.values())
      .map((f) => f.date)
      .sort();

    if (creationDates.length === 0) {
      return [];
    }

    // Generate all dates from first file creation to display end
    const allDatesArray: string[] = [];
    const firstCreationDate = new Date(creationDates[0]!);
    const currentDate = new Date(firstCreationDate);
    const endDate = new Date(displayEndDate);

    while (currentDate <= endDate) {
      allDatesArray.push(currentDate.toISOString().substring(0, 10));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // For each date, calculate cumulative lines and files
    const displayStartStr = displayStartDate.toISOString().substring(0, 10);
    const result: VolumeSnapshot[] = [];

    allDatesArray.forEach((date) => {
      // Only include dates within display range
      if (date < displayStartStr) {
        return;
      }

      const byType = new Map<string, { count: number; lines: number }>();
      let totalLines = 0;
      let totalFiles = 0;

      // Count files and lines created on or before this date
      fileFirstAppearance.forEach((file) => {
        if (file.date <= date) {
          totalFiles += 1;
          totalLines += file.lineCount;
          if (!byType.has(file.fileType)) {
            byType.set(file.fileType, { count: 0, lines: 0 });
          }
          const stats = byType.get(file.fileType);
          if (stats) {
            stats.count += 1;
            stats.lines += file.lineCount;
          }
        }
      });

      result.push({
        date,
        totalFiles,
        totalLines,
        byFileType: Array.from(byType.entries())
          .map(([type, stats]) => ({
            fileType: type,
            fileCount: stats.count,
            lineCount: stats.lines,
          }))
          .sort((a, b) => b.lineCount - a.lineCount),
      });
    });

    return result;
  },

  async getCoverageTimeseries(
    collectionId: string,
    days: number = 30
  ): Promise<CoverageSnapshot[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await prisma.fileSnapshotRecord.findMany({
      where: {
        collectionId,
        scannedAt: { gte: startDate },
        coverage: { not: null },
      },
      select: {
        scannedAt: true,
        coverage: true,
      },
      orderBy: { scannedAt: "asc" },
    });

    type Record = (typeof records)[0];
    const byDate = new Map<string, Record[]>();
    records.forEach((record) => {
      const dateKey = new Date(record.scannedAt).toISOString().substring(0, 10);
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, []);
      }
      const existing = byDate.get(dateKey);
      if (existing) {
        existing.push(record);
      }
    });

    return Array.from(byDate.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, dayRecords]) => {
        const validCoverage = dayRecords.filter((r) => r.coverage !== null);
        const avgCoverage =
          validCoverage.length > 0
            ? validCoverage.reduce((sum, r) => sum + (r.coverage || 0), 0) /
              validCoverage.length
            : 0;

        return {
          date,
          avgCoverage,
          fileCount: dayRecords.length,
          coveredFiles: validCoverage.length,
        };
      });
  },
};
