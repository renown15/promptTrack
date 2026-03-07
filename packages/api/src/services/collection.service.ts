import { collectionRepository } from "@/repositories/collection.repository.js";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
  ProjectTreeDTO,
  CollectionTreeItemDTO,
  PromptSummaryDTO,
  ChainSummaryDTO,
} from "@prompttrack/shared";

export class CollectionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "CollectionError";
  }
}

export const collectionService = {
  async list() {
    return collectionRepository.findAll();
  },

  async getById(id: string) {
    const c = await collectionRepository.findById(id);
    if (!c) throw new CollectionError("Collection not found", 404);
    return c;
  },

  async create(input: CreateCollectionInput) {
    return collectionRepository.create({
      name: input.name,
      ...(input.description !== undefined && {
        description: input.description,
      }),
    });
  },

  async update(id: string, input: UpdateCollectionInput) {
    const c = await collectionRepository.findById(id);
    if (!c) throw new CollectionError("Collection not found", 404);
    return collectionRepository.update(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
    });
  },

  async delete(id: string) {
    const c = await collectionRepository.findById(id);
    if (!c) throw new CollectionError("Collection not found", 404);
    await collectionRepository.delete(id);
  },

  async addPrompt(collectionId: string, promptId: string) {
    const c = await collectionRepository.findById(collectionId);
    if (!c) throw new CollectionError("Collection not found", 404);
    await collectionRepository.addPrompt(collectionId, promptId);
  },

  async removePrompt(collectionId: string, promptId: string) {
    await collectionRepository.removePrompt(collectionId, promptId);
  },

  async addChain(collectionId: string, chainId: string) {
    const c = await collectionRepository.findById(collectionId);
    if (!c) throw new CollectionError("Collection not found", 404);
    await collectionRepository.addChain(collectionId, chainId);
  },

  async removeChain(collectionId: string, chainId: string) {
    await collectionRepository.removeChain(collectionId, chainId);
  },

  async getTree(): Promise<ProjectTreeDTO> {
    const raw = await collectionRepository.getTree();

    const collections: CollectionTreeItemDTO[] = raw.collections.map((c) => ({
      id: c.id,
      name: c.name,
      prompts: c.prompts.map(
        (p): PromptSummaryDTO => ({
          id: p.prompt.id,
          name: p.prompt.name,
          slug: p.prompt.slug,
        })
      ),
      chains: c.chains.map((cc): ChainSummaryDTO => {
        const latestVersion = cc.chain.versions[0];
        const prompts: PromptSummaryDTO[] = latestVersion
          ? latestVersion.nodes.map((n) => ({
              id: n.prompt.id,
              name: n.prompt.name,
              slug: n.prompt.slug,
            }))
          : [];
        return {
          id: cc.chain.id,
          name: cc.chain.name,
          slug: cc.chain.slug,
          prompts,
        };
      }),
    }));

    const ungrouped = {
      prompts: raw.ungroupedPrompts.map(
        (p): PromptSummaryDTO => ({ id: p.id, name: p.name, slug: p.slug })
      ),
      chains: raw.ungroupedChains.map((c): ChainSummaryDTO => {
        const latestVersion = c.versions[0];
        const prompts: PromptSummaryDTO[] = latestVersion
          ? latestVersion.nodes.map((n) => ({
              id: n.prompt.id,
              name: n.prompt.name,
              slug: n.prompt.slug,
            }))
          : [];
        return { id: c.id, name: c.name, slug: c.slug, prompts };
      }),
    };

    return { collections, ungrouped };
  },
};
