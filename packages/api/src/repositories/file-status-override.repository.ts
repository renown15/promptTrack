import { prisma } from "@/config/prisma.js";

export interface FileStatusOverrideRecord {
  id: string;
  collectionId: string;
  relativePath: string;
  metric: string;
  status: string;
  comment: string;
  source: string;
  supersededAt: Date | null;
  supersededBy: string | null;
  createdAt: Date;
}

type SupersededBy = "file_changed" | "user_update" | "user_delete";

async function supersedePrevious(
  collectionId: string,
  relativePath: string,
  metric: string,
  reason: SupersededBy
): Promise<void> {
  await prisma.fileStatusOverride.updateMany({
    where: { collectionId, relativePath, metric, supersededAt: null },
    data: { supersededAt: new Date(), supersededBy: reason },
  });
}

export const fileStatusOverrideRepository = {
  async upsert(
    collectionId: string,
    relativePath: string,
    metric: string,
    status: string,
    comment: string,
    source: "human" | "agent"
  ): Promise<FileStatusOverrideRecord> {
    await supersedePrevious(collectionId, relativePath, metric, "user_update");
    return prisma.fileStatusOverride.create({
      data: { collectionId, relativePath, metric, status, comment, source },
    });
  },

  async remove(
    collectionId: string,
    relativePath: string,
    metric: string
  ): Promise<void> {
    await supersedePrevious(collectionId, relativePath, metric, "user_delete");
  },

  async supersedeDueToFileChange(
    collectionId: string,
    relativePaths: string[]
  ): Promise<void> {
    if (relativePaths.length === 0) return;
    await prisma.fileStatusOverride.updateMany({
      where: {
        collectionId,
        relativePath: { in: relativePaths },
        supersededAt: null,
      },
      data: { supersededAt: new Date(), supersededBy: "file_changed" },
    });
  },

  /** Active overrides only (supersededAt IS NULL) */
  async listForCollection(
    collectionId: string
  ): Promise<FileStatusOverrideRecord[]> {
    return prisma.fileStatusOverride.findMany({
      where: { collectionId, supersededAt: null },
    });
  },

  /** Active overrides only for a single file */
  async listForFile(
    collectionId: string,
    relativePath: string
  ): Promise<FileStatusOverrideRecord[]> {
    return prisma.fileStatusOverride.findMany({
      where: { collectionId, relativePath, supersededAt: null },
    });
  },

  /** Full history (active + superseded) for a file, newest first */
  async historyForFile(
    collectionId: string,
    relativePath: string
  ): Promise<FileStatusOverrideRecord[]> {
    return prisma.fileStatusOverride.findMany({
      where: { collectionId, relativePath },
      orderBy: { createdAt: "desc" },
    });
  },
};
