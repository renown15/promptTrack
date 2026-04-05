import { collectionRepository } from "@/repositories/collection.repository.js";
import type {
  ChainSummaryDTO,
  CollectionTreeItemDTO,
  CreateCollectionInput,
  ProjectTreeDTO,
  PromptSummaryDTO,
  UpdateCollectionInput,
} from "@prompttrack/shared";
import { readdir } from "fs/promises";
import { join } from "path";

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
    const collections = await collectionRepository.findAll();
    return collections.map(({ in_scope_directories, ...c }) => ({
      ...c,
      inScopeDirectories: in_scope_directories,
    }));
  },

  async getById(id: string) {
    const c = await collectionRepository.findById(id);
    if (!c) throw new CollectionError("Collection not found", 404);
    const { in_scope_directories, ...rest } = c;
    return {
      ...rest,
      inScopeDirectories: in_scope_directories,
    };
  },

  async create(input: CreateCollectionInput) {
    const c = await collectionRepository.create({
      name: input.name,
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.directory !== undefined && { directory: input.directory }),
    });
    const { in_scope_directories, ...rest } = c;
    return {
      ...rest,
      inScopeDirectories: in_scope_directories,
    };
  },

  async update(id: string, input: UpdateCollectionInput) {
    const c = await collectionRepository.findById(id);
    if (!c) throw new CollectionError("Collection not found", 404);
    const updated = await collectionRepository.update(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.directory !== undefined && { directory: input.directory }),
      ...(input.in_scope_directories !== undefined && {
        in_scope_directories: input.in_scope_directories,
      }),
    });
    const { in_scope_directories, ...rest } = updated;
    return {
      ...rest,
      inScopeDirectories: in_scope_directories,
    };
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
      directory: c.directory,
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

  async getDirectoryStructure(
    basePath: string,
    relativePath: string = ""
  ): Promise<{
    name: string;
    path: string;
    isDirectory: boolean;
    children?: {
      name: string;
      path: string;
      isDirectory: boolean;
      children?: unknown[];
    }[];
  }> {
    const fullPath = relativePath ? join(basePath, relativePath) : basePath;
    const entries = await readdir(fullPath, { withFileTypes: true });

    const directories = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name));

    const children = await Promise.all(
      directories.map(async (dir) => {
        const childPath = relativePath
          ? join(relativePath, dir.name)
          : dir.name;
        return this.getDirectoryStructure(basePath, childPath);
      })
    );

    const currentPath = relativePath || basePath.split("/").pop() || "root";
    return {
      name: relativePath
        ? relativePath.split("/").pop() || currentPath
        : currentPath,
      path: relativePath || ".",
      isDirectory: true,
      children,
    };
  },

  async updateInScopeDirectories(collectionId: string, directories: string[]) {
    const c = await collectionRepository.findById(collectionId);
    if (!c) throw new CollectionError("Collection not found", 404);
    return collectionRepository.update(collectionId, {
      in_scope_directories: directories,
    });
  },
};
