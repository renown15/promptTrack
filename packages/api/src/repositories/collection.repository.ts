import { prisma } from "@/config/prisma.js";

export type CollectionRecord = {
  id: string;
  name: string;
  description: string | null;
  directory: string | null;
  in_scope_directories: string[];
  createdAt: Date;
  updatedAt: Date;
};

type CreateCollectionData = {
  name: string;
  description?: string;
  directory?: string;
};

type UpdateCollectionData = {
  name?: string;
  description?: string | null;
  directory?: string | null;
  in_scope_directories?: string[];
};

export const collectionRepository = {
  async findAll(): Promise<CollectionRecord[]> {
    return prisma.collection.findMany({ orderBy: { name: "asc" } });
  },

  async findById(id: string): Promise<CollectionRecord | null> {
    return prisma.collection.findUnique({ where: { id } });
  },

  async create(data: CreateCollectionData): Promise<CollectionRecord> {
    return prisma.collection.create({ data });
  },

  async update(
    id: string,
    data: UpdateCollectionData
  ): Promise<CollectionRecord> {
    return prisma.collection.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.collection.delete({ where: { id } });
  },

  async addPrompt(collectionId: string, promptId: string): Promise<void> {
    await prisma.promptCollection.upsert({
      where: { promptId_collectionId: { promptId, collectionId } },
      create: { promptId, collectionId },
      update: {},
    });
  },

  async removePrompt(collectionId: string, promptId: string): Promise<void> {
    await prisma.promptCollection.deleteMany({
      where: { promptId, collectionId },
    });
  },

  async addChain(collectionId: string, chainId: string): Promise<void> {
    await prisma.chainCollection.upsert({
      where: { chainId_collectionId: { chainId, collectionId } },
      create: { chainId, collectionId },
      update: {},
    });
  },

  async removeChain(collectionId: string, chainId: string): Promise<void> {
    await prisma.chainCollection.deleteMany({
      where: { chainId, collectionId },
    });
  },

  async getTree() {
    const collections = await prisma.collection.findMany({
      orderBy: { name: "asc" },
      include: {
        prompts: {
          where: { prompt: { isArchived: false } },
          include: {
            prompt: { select: { id: true, name: true, slug: true } },
          },
        },
        chains: {
          where: { chain: { isArchived: false } },
          include: {
            chain: {
              select: {
                id: true,
                name: true,
                slug: true,
                versions: {
                  orderBy: { versionNumber: "desc" },
                  take: 1,
                  include: {
                    nodes: {
                      include: {
                        prompt: {
                          select: { id: true, name: true, slug: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Prompts and chains that belong to at least one collection
    const groupedPromptIds = new Set(
      collections.flatMap((c) => c.prompts.map((p) => p.promptId))
    );
    const groupedChainIds = new Set(
      collections.flatMap((c) => c.chains.map((cc) => cc.chainId))
    );

    const ungroupedPrompts = await prisma.prompt.findMany({
      where: { isArchived: false, id: { notIn: [...groupedPromptIds] } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    const ungroupedChains = await prisma.chain.findMany({
      where: { isArchived: false, id: { notIn: [...groupedChainIds] } },
      select: {
        id: true,
        name: true,
        slug: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            nodes: {
              include: {
                prompt: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return { collections, ungroupedPrompts, ungroupedChains };
  },
};
