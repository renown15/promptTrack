import { prisma } from "@/config/prisma.js";

export type ChainRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tags: string[];
  currentVersion: number;
  isArchived: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type CreateChainData = {
  name: string;
  slug: string;
  description?: string;
  tags?: string[];
  createdBy: string;
};

type UpdateChainData = {
  name?: string;
  description?: string | null;
  tags?: string[];
};

export const chainRepository = {
  async findAll(filters?: {
    isArchived?: boolean | undefined;
  }): Promise<ChainRecord[]> {
    return prisma.chain.findMany({
      where: { isArchived: filters?.isArchived ?? false },
      orderBy: { updatedAt: "desc" },
    });
  },

  async findById(id: string): Promise<ChainRecord | null> {
    return prisma.chain.findUnique({ where: { id } });
  },

  async findBySlug(slug: string): Promise<ChainRecord | null> {
    return prisma.chain.findUnique({ where: { slug } });
  },

  async create(data: CreateChainData): Promise<ChainRecord> {
    return prisma.chain.create({ data });
  },

  async update(id: string, data: UpdateChainData): Promise<ChainRecord> {
    return prisma.chain.update({ where: { id }, data });
  },

  async incrementVersion(id: string): Promise<ChainRecord> {
    return prisma.chain.update({
      where: { id },
      data: { currentVersion: { increment: 1 } },
    });
  },

  async archive(id: string): Promise<ChainRecord> {
    return prisma.chain.update({ where: { id }, data: { isArchived: true } });
  },
};
