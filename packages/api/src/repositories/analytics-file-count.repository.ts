import { prisma } from "@/config/prisma.js";

export const analyticsFileCountRepository = {
  async getFileCountTimeseries(
    collectionId: string,
    days: number = 30
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

    if (allRecords.length === 0) {
      return [];
    }

    // Find first appearance date for each unique file
    const fileFirstAppearance = new Map<
      string,
      { date: string; fileType: string }
    >();

    allRecords.forEach((record) => {
      const fileKey = `${record.relativePath}:${record.fileType}`;
      if (!fileFirstAppearance.has(fileKey)) {
        const dateKey = new Date(record.scannedAt)
          .toISOString()
          .substring(0, 10);
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
      allDatesArray.push(currentDate.toISOString().substring(0, 10));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // For each date, count cumulative files (created by that date)
    const displayStartStr = displayStartDate.toISOString().substring(0, 10);
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
