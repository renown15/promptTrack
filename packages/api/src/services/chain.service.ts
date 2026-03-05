import { chainRepository } from "@/repositories/chain.repository.js";
import { chainVersionRepository } from "@/repositories/chain-version.repository.js";
import { promptVersionRepository } from "@/repositories/prompt-version.repository.js";
import type {
  CreateChainInput,
  UpdateChainInput,
  CreateChainVersionInput,
} from "@prompttrack/shared";
import type { ChainNodeRefType } from "@prisma/client";

export class ChainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "ChainError";
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (await chainRepository.findBySlug(slug)) {
    attempt++;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

export const chainService = {
  async list(filters?: {
    isArchived?: boolean | undefined;
    collectionId?: string | undefined;
  }) {
    return chainRepository.findAll(filters);
  },

  async getById(id: string) {
    const chain = await chainRepository.findById(id);
    if (!chain) throw new ChainError("Chain not found", 404);
    const currentVersionData = await chainVersionRepository.findCurrent(id);
    return { ...chain, currentVersionData };
  },

  async create(userId: string, input: CreateChainInput) {
    const baseSlug = generateSlug(input.name);
    const slug = await ensureUniqueSlug(baseSlug);
    const chain = await chainRepository.create({
      name: input.name,
      slug,
      ...(input.description !== undefined && {
        description: input.description,
      }),
      tags: input.tags,
      collectionId: input.collectionId ?? null,
      createdBy: userId,
    });
    return chainService.getById(chain.id);
  },

  async update(id: string, input: UpdateChainInput) {
    const chain = await chainRepository.findById(id);
    if (!chain) throw new ChainError("Chain not found", 404);
    if (chain.isArchived) throw new ChainError("Cannot update archived chain");
    return chainRepository.update(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.collectionId !== undefined && {
        collectionId: input.collectionId,
      }),
    });
  },

  async createVersion(
    id: string,
    userId: string,
    input: CreateChainVersionInput
  ) {
    const chain = await chainRepository.findById(id);
    if (!chain) throw new ChainError("Chain not found", 404);
    if (chain.isArchived) throw new ChainError("Cannot version archived chain");

    // Resolve snapshot content for copy nodes
    const nodes = await Promise.all(
      input.nodes.map(async (node) => {
        let snapshotContent: string | null = null;
        if (node.refType === "copy") {
          const pv = await promptVersionRepository.findByVersion(
            node.promptId,
            node.promptVersionNumber
          );
          if (!pv) {
            throw new ChainError(
              `Prompt version not found for node ${node.nodeId}`,
              404
            );
          }
          snapshotContent = pv.content;
        }
        return {
          nodeId: node.nodeId,
          promptId: node.promptId,
          promptVersionNumber: node.promptVersionNumber,
          refType: node.refType as ChainNodeRefType,
          ...(node.label !== undefined && { label: node.label }),
          positionX: node.positionX,
          positionY: node.positionY,
          snapshotContent,
        };
      })
    );

    const nextVersion = chain.currentVersion + 1;
    const version = await chainVersionRepository.create({
      chainId: id,
      versionNumber: nextVersion,
      createdBy: userId,
      ...(input.changelog !== undefined && { changelog: input.changelog }),
      nodes,
      edges: input.edges.map((e) => ({
        edgeId: e.edgeId,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        ...(e.label !== undefined && { label: e.label }),
      })),
    });

    await chainRepository.incrementVersion(id);
    return version;
  },

  async archive(id: string) {
    const chain = await chainRepository.findById(id);
    if (!chain) throw new ChainError("Chain not found", 404);
    return chainRepository.archive(id);
  },

  async getVariables(id: string) {
    const chain = await chainRepository.findById(id);
    if (!chain) throw new ChainError("Chain not found", 404);
    return chain;
  },
};
