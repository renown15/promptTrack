import type { Prisma } from "@prisma/client";
import { prisma } from "@/config/prisma.js";
import type { MetricResult } from "@/services/insight.cache.js";

export const fileSnapshotRepository = {
  async insert(data: {
    collectionId: string;
    relativePath: string;
    name: string;
    fileType: string;
    lineCount: number;
    coverage: number | null;
    metrics: Record<string, MetricResult | null>;
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
};
