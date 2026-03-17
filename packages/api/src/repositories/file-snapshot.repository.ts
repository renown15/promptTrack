import type { Prisma } from "@prisma/client";
import { prisma } from "@/config/prisma.js";
import type { MetricResult, MetricError } from "@/services/insight.cache.js";

export const fileSnapshotRepository = {
  async insert(data: {
    collectionId: string;
    relativePath: string;
    name: string;
    fileType: string;
    lineCount: number;
    coverage: number | null;
    metrics: Record<string, MetricResult | MetricError | null>;
  }): Promise<void> {
    await prisma.fileSnapshotRecord.create({
      data: {
        ...data,
        metrics: data.metrics as unknown as Prisma.InputJsonValue,
      },
    });
  },

  async getLatestPerFile(collectionId: string) {
    const records = await prisma.fileSnapshotRecord.findMany({
      where: { collectionId },
      orderBy: { scannedAt: "desc" },
    });
    const seen = new Set<string>();
    return records.filter((r) => {
      if (seen.has(r.relativePath)) return false;
      seen.add(r.relativePath);
      return true;
    });
  },

  async getHistory(collectionId: string, relativePath: string) {
    return prisma.fileSnapshotRecord.findMany({
      where: { collectionId, relativePath },
      orderBy: { scannedAt: "desc" },
      take: 50,
    });
  },

  /** Returns the lineCount from the most recent snapshot before today's midnight for each file. */
  async getBaselineLineCounts(
    collectionId: string
  ): Promise<Map<string, number>> {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const records = await prisma.fileSnapshotRecord.findMany({
      where: { collectionId, scannedAt: { lt: midnight } },
      orderBy: { scannedAt: "desc" },
      select: { relativePath: true, lineCount: true },
    });
    const seen = new Set<string>();
    const result = new Map<string, number>();
    for (const r of records) {
      if (!seen.has(r.relativePath)) {
        seen.add(r.relativePath);
        result.set(r.relativePath, r.lineCount);
      }
    }
    return result;
  },

  /** Returns the baseline lineCount for a single file (most recent snapshot before today). */
  async getBaselineLineCount(
    collectionId: string,
    relativePath: string
  ): Promise<number | null> {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const record = await prisma.fileSnapshotRecord.findFirst({
      where: { collectionId, relativePath, scannedAt: { lt: midnight } },
      orderBy: { scannedAt: "desc" },
      select: { lineCount: true },
    });
    return record?.lineCount ?? null;
  },
};
