import { chainRepository } from "@/repositories/chain.repository.js";
import { collectionRepository } from "@/repositories/collection.repository.js";
import { chainSerialiserService } from "@/services/chain-serialiser.service.js";
import { discoveryService } from "@/services/discovery.service.js";
import {
  buildRecommendations,
  countMetrics,
  suggestFix,
} from "@/services/agent-tool-helpers.js";
import { insightService } from "@/services/insight.service.js";
import { promptService } from "@/services/prompt.service.js";
import { z } from "zod";

async function validateRepoName(
  collectionId: string,
  requestedRepoName?: string
): Promise<void> {
  if (!requestedRepoName) return;
  const collection = await collectionRepository.findById(collectionId);
  if (!collection) throw new Error("Collection not found");
  const collectionNameNorm = collection.name?.toLowerCase().replace(/\s+/g, "");
  const requestedNameNorm = requestedRepoName.toLowerCase().replace(/\s+/g, "");
  if (collectionNameNorm !== requestedNameNorm) {
    throw new Error(
      `Repo mismatch: requested "${requestedRepoName}", but collection is "${collection.name}". Aborting.`
    );
  }
}

export const agentToolHandlers = {
  async list_collections(
    _input: Record<string, unknown>,
    collectionId: string
  ): Promise<unknown> {
    const collection = await collectionRepository.findById(collectionId);
    if (!collection) throw new Error("Collection not found");
    return [collection];
  },

  async list_prompts(
    input: Record<string, unknown>,
    collectionId: string
  ): Promise<unknown> {
    const schema = z.object({
      environment: z
        .enum(["draft", "review", "staging", "production"])
        .optional(),
    });
    const parsed = schema.parse(input);
    const prompts = await promptService.list({
      collectionId,
      ...(parsed.environment !== undefined && {
        environment: parsed.environment,
      }),
    });
    return prompts.filter((p) => !p.isArchived);
  },

  async get_prompt(
    input: Record<string, unknown>,
    collectionId: string
  ): Promise<unknown> {
    const schema = z.object({ id: z.string() });
    const { id } = schema.parse(input);
    const prompt = await promptService.getById(id).catch(async () => {
      const all = await promptService.list({ collectionId });
      const match = all.find((p) => p.slug === id);
      if (!match) throw new Error(`No prompt found: "${id}"`);
      return promptService.getById(match.id);
    });
    const version = prompt.versions?.[0];
    return {
      id: prompt.id,
      name: prompt.name,
      slug: prompt.slug,
      description: prompt.description,
      tags: prompt.tags,
      environment: prompt.environment,
      currentVersion: prompt.currentVersion,
      content: version?.content ?? null,
      role: version?.role ?? null,
      variables: version?.variables ?? [],
      modelParameters: version?.modelParameters ?? {},
    };
  },

  async list_chains(
    _input: Record<string, unknown>,
    collectionId: string
  ): Promise<unknown> {
    const chains = await chainRepository.findAll({ collectionId });
    return chains.filter((c) => !c.isArchived);
  },

  async get_chain(
    input: Record<string, unknown>,
    collectionId: string
  ): Promise<unknown> {
    const schema = z.object({ id: z.string() });
    const { id } = schema.parse(input);
    return chainRepository.findById(id).catch(async () => {
      const all = await chainRepository.findAll({ collectionId });
      const match = all.find((c) => c.slug === id);
      if (!match) throw new Error(`No chain found: "${id}"`);
      return chainRepository.findById(match.id);
    });
  },

  async serialise_chain(
    input: Record<string, unknown>,
    _collectionId: string
  ): Promise<unknown> {
    const schema = z.object({
      id: z.string(),
      variables: z.record(z.string(), z.string()).default({}),
    });
    const parsed = schema.parse(input);
    return chainSerialiserService.serialise(parsed.id, parsed.variables);
  },

  async get_repo_status(
    input: Record<string, unknown>,
    collectionId: string
  ): Promise<unknown> {
    const schema = z.object({ repo: z.string().optional() });
    const { repo } = schema.parse(input);
    await validateRepoName(collectionId, repo);

    const collection = await collectionRepository.findById(collectionId);
    if (!collection?.directory)
      return { error: "No directory configured for this collection" };

    const state = insightService.getState(collectionId);
    const aggregate = await discoveryService.getAggregateStats(
      collection.directory
    );
    const coverage = aggregate?.coverage?.linesPct ?? null;
    const lintErrors = aggregate?.lint?.errors ?? 0;
    const counts = countMetrics(state.files);
    const recommendations = buildRecommendations(
      state.files,
      coverage,
      lintErrors,
      counts
    );

    const untracked = state.files
      .filter((f) => f.gitStatus === "untracked")
      .map((f) => f.relativePath);
    const modified = state.files
      .filter((f) => f.gitStatus === "modified")
      .map((f) => f.relativePath);

    return {
      scanning: state.scanning,
      lastScan: state.lastScan,
      fileCount: state.files.length,
      coverage,
      lintErrors,
      metrics: counts,
      sourceControl: {
        untracked: untracked.length,
        modified: modified.length,
        untrackedFiles: untracked,
        modifiedFiles: modified,
      },
      recommendations:
        recommendations.length > 0
          ? recommendations
          : [
              {
                priority: "none",
                action: "no_action_required",
                detail: "Codebase is healthy — no issues detected.",
              },
            ],
    };
  },

  async list_problem_files(
    input: Record<string, unknown>,
    collectionId: string
  ): Promise<unknown> {
    const schema = z.object({
      repo: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(20),
    });
    const { repo, limit } = schema.parse(input);
    await validateRepoName(collectionId, repo);

    const collection = await collectionRepository.findById(collectionId);
    if (!collection?.directory)
      return { error: "No directory configured", files: [] };

    const state = insightService.getState(collectionId);
    const files = state.files
      .filter((f) => f.problemScore > 0)
      .sort((a, b) => b.problemScore - a.problemScore)
      .slice(0, limit)
      .map((f) => ({
        relativePath: f.relativePath,
        name: f.name,
        fileType: f.fileType,
        problemScore: f.problemScore,
        gitStatus: f.gitStatus,
        coverage: f.coverage,
        lintErrors: f.lintErrors,
        metrics: f.metrics,
        suggestedFix: suggestFix(f),
      }));

    return { files };
  },
};
