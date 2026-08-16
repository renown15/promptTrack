import { prisma } from "@/config/prisma.js";

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  collectionId: string;
  createdAt: Date;
  revokedAt: Date | null;
};

export const apiKeyRepository = {
  async create(data: {
    name: string;
    keyHash: string;
    keyPrefix: string;
    key?: string;
    collectionId: string;
  }): Promise<ApiKeyRecord> {
    return prisma.apiKey.create({
      data,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        collectionId: true,
        createdAt: true,
        revokedAt: true,
      },
    });
  },

  async findById(id: string) {
    return prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        key: true,
        collectionId: true,
        revokedAt: true,
      },
    });
  },

  async findByCollection(collectionId: string): Promise<ApiKeyRecord[]> {
    return prisma.apiKey.findMany({
      where: { collectionId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        collectionId: true,
        createdAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findByHash(keyHash: string) {
    return prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        collectionId: true,
        revokedAt: true,
        collection: { select: { id: true, directory: true } },
      },
    });
  },

  async revoke(id: string, collectionId: string): Promise<void> {
    await prisma.apiKey.updateMany({
      where: { id, collectionId },
      data: { revokedAt: new Date() },
    });
  },
};
