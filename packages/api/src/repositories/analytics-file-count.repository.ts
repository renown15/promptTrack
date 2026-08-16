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

export const analyticsFileCountRepository = {
  async getFileCountTimeseries(
    collectionId: string,
    days: number = 30,
    excludedDirs: string[] = []
  ): Promise<
    Array<{
      date: string;
      byFileType: Array<{ fileType: string; fileCount: number }>;
    }>
  > {
    const displayEndDate = new Date();
    const displayStartDate = new Date();
    displayStartDate.setDate(displayStartDate.getDate() - days);

    // Query ALL snapshots to find when each unique file first appeared
    const allRecords = await prisma.fileSnapshotRecord.findMany({
      where: {
        collectionId,
      },
      select: {
        scannedAt: true,
        fileType: true,
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

    // Find first appearance date for each unique file
    const fileFirstAppearance = new Map<
      string,
      { date: string; fileType: string }
    >();

    filteredRecords.forEach((record) => {
      const fileKey = `${record.relativePath}:${record.fileType}`;
      if (!fileFirstAppearance.has(fileKey)) {
        const dateKey = toLocalDateString(new Date(record.scannedAt));
        fileFirstAppearance.set(fileKey, {
          date: dateKey,
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

    // For each date, count cumulative files (created by that date)
    const displayStartStr = toLocalDateString(displayStartDate);
    const result: Array<{
      date: string;
      byFileType: Array<{ fileType: string; fileCount: number }>;
    }> = [];

    allDatesArray.forEach((date) => {
      // Only include dates within display range
      if (date < displayStartStr) {
        return;
      }

      const byType = new Map<string, number>();

      // Count files that were created on or before this date
      fileFirstAppearance.forEach((file) => {
        if (file.date <= date) {
          const count = byType.get(file.fileType) || 0;
          byType.set(file.fileType, count + 1);
        }
      });

      result.push({
        date,
        byFileType: Array.from(byType.entries())
          .map(([fileType, fileCount]) => ({
            fileType,
            fileCount,
          }))
          .sort((a, b) => b.fileCount - a.fileCount),
      });
    });

    return result;
  },
};
