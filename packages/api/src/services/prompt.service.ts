import { promptRepository } from "@/repositories/prompt.repository.js";
import { promptVersionRepository } from "@/repositories/prompt-version.repository.js";
import type {
  CreatePromptInput,
  UpdatePromptInput,
  CreatePromptVersionInput,
} from "@prompttrack/shared";

export class PromptError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "PromptError";
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
  while (await promptRepository.findBySlug(slug)) {
    attempt++;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

export const promptService = {
  async list(filters?: {
    environment?: "draft" | "review" | "staging" | "production" | undefined;
    collectionId?: string | undefined;
    isArchived?: boolean | undefined;
  }) {
    return promptRepository.findAll(filters);
  },

  async getById(id: string) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) throw new PromptError("Prompt not found", 404);

    const versions = await promptVersionRepository.findByPromptId(id);
    return { ...prompt, versions };
  },

  async create(userId: string, input: CreatePromptInput) {
    const baseSlug = generateSlug(input.name);
    const slug = await ensureUniqueSlug(baseSlug);

    const prompt = await promptRepository.create({
      name: input.name,
      slug,
      ...(input.description !== undefined && {
        description: input.description,
      }),
      tags: input.tags,
      parentId: input.parentId ?? null,
      collectionId: input.collectionId ?? null,
      createdBy: userId,
    });

    await promptVersionRepository.create({
      promptId: prompt.id,
      versionNumber: 1,
      content: input.content,
      role: input.role as "system" | "user" | "assistant",
      modelParameters: input.modelParameters,
      variables: input.variables,
      createdBy: userId,
    });

    return promptService.getById(prompt.id);
  },

  async update(id: string, input: UpdatePromptInput) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) throw new PromptError("Prompt not found", 404);
    if (prompt.isArchived)
      throw new PromptError("Cannot update archived prompt");

    return promptRepository.update(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.collectionId !== undefined && {
        collectionId: input.collectionId,
      }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
    });
  },

  async createVersion(
    id: string,
    userId: string,
    input: CreatePromptVersionInput
  ) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) throw new PromptError("Prompt not found", 404);
    if (prompt.isArchived)
      throw new PromptError("Cannot version archived prompt");

    const nextVersion = prompt.currentVersion + 1;

    const version = await promptVersionRepository.create({
      promptId: id,
      versionNumber: nextVersion,
      content: input.content,
      role: input.role as "system" | "user" | "assistant",
      ...(input.changelog !== undefined && { changelog: input.changelog }),
      modelParameters: input.modelParameters,
      variables: input.variables,
      createdBy: userId,
    });

    await promptRepository.incrementVersion(id);
    return version;
  },

  async archive(id: string) {
    const prompt = await promptRepository.findById(id);
    if (!prompt) throw new PromptError("Prompt not found", 404);
    return promptRepository.archive(id);
  },
};
