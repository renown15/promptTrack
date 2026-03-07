import { prisma } from "@/config/prisma.js";
import type { Environment } from "@prisma/client";

export type PromptRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tags: string[];
  environment: Environment;
  currentVersion: number;
  isArchived: boolean;
  parentId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type CreatePromptData = {
  name: string;
  slug: string;
  description?: string;
  tags?: string[];
  parentId?: string | null;
  createdBy: string;
};

type UpdatePromptData = {
  name?: string;
  description?: string | null;
  tags?: string[];
  parentId?: string | null;
};

export const promptRepository = {
  async findAll(filters?: {
    environment?: Environment | undefined;
    isArchived?: boolean | undefined;
  }): Promise<PromptRecord[]> {
    return prisma.prompt.findMany({
      where: {
        isArchived: filters?.isArchived ?? false,
        ...(filters?.environment !== undefined && {
          environment: filters.environment,
        }),
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async findById(id: string): Promise<PromptRecord | null> {
    return prisma.prompt.findUnique({ where: { id } });
  },

  async findBySlug(slug: string): Promise<PromptRecord | null> {
    return prisma.prompt.findUnique({ where: { slug } });
  },

  async create(data: CreatePromptData): Promise<PromptRecord> {
    return prisma.prompt.create({ data });
  },

  async update(id: string, data: UpdatePromptData): Promise<PromptRecord> {
    return prisma.prompt.update({ where: { id }, data });
  },

  async incrementVersion(id: string): Promise<PromptRecord> {
    return prisma.prompt.update({
      where: { id },
      data: { currentVersion: { increment: 1 } },
    });
  },

  async archive(id: string): Promise<PromptRecord> {
    return prisma.prompt.update({ where: { id }, data: { isArchived: true } });
  },
};
