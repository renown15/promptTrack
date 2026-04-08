import { prisma } from "@/config/prisma.js";

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shouldExcludePath(path: string, excludedDirs: string[]): boolean {
  if (!excludedDirs || excludedDirs.length === 0) return false;
  const firstSegment = path.split("/")[0];
  return excludedDirs.some(
    (dir) => dir === firstSegment || path.startsWith(dir + "/")
  );
}

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
    days: number = 30,
    excludedDirs: string[] = []
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

    // Filter by excluded directories
    const filteredRecords = allRecords.filter(
      (r) => !shouldExcludePath(r.relativePath, excludedDirs)
    );

    if (filteredRecords.length === 0) {
      return [];
    }

    // For each unique file, capture line count at first appearance
    const fileFirstAppearance = new Map<
      string,
      { date: string; lineCount: number; fileType: string }
    >();

    filteredRecords.forEach((record) => {
      const fileKey = `${record.relativePath}:${record.fileType}`;
      if (!fileFirstAppearance.has(fileKey)) {
        const dateKey = toLocalDateString(new Date(record.scannedAt));
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
      allDatesArray.push(toLocalDateString(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // For each date, calculate cumulative lines and files
    const displayStartStr = toLocalDateString(displayStartDate);
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
    days: number = 30,
    excludedDirs: string[] = []
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
        relativePath: true,
      },
      orderBy: { scannedAt: "asc" },
    });

    // Filter by excluded directories
    const filteredRecords = records.filter(
      (r) => !shouldExcludePath(r.relativePath, excludedDirs)
    );

    type Record = (typeof filteredRecords)[0];
    const byDate = new Map<string, Record[]>();
    filteredRecords.forEach((record) => {
      const dateKey = toLocalDateString(new Date(record.scannedAt));
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
