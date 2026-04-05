import {
  ApiKeyParamSchema,
  CollectionChainParamSchema,
  CollectionIdParamSchema,
  CollectionPromptParamSchema,
  CreateApiKeyBodySchema,
  CreateCollectionSchema,
  UpdateCollectionSchema,
} from "@/routes/collections/collections.schemas.js";
import { analyticsService } from "@/services/analytics.service.js";
import { apiKeyService } from "@/services/api-key.service.js";
import { collectionService } from "@/services/collection.service.js";
import { docsService } from "@/services/docs.service.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

export async function collectionRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/tree", async () => {
    return collectionService.getTree();
  });

  fastify.get("/", async () => {
    return collectionService.list();
  });

  fastify.post("/", async (request, reply) => {
    const body = CreateCollectionSchema.parse(request.body);
    const collection = await collectionService.create(body);
    return reply.code(201).send(collection);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const collection = await collectionService.getById(id);
    if (!collection) return reply.code(404).send({ error: "Not found" });
    return collection;
  });

  fastify.patch("/:id", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const body = UpdateCollectionSchema.parse(request.body);
    return collectionService.update(id, body);
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    await collectionService.delete(id);
    return reply.code(204).send();
  });

  fastify.post("/:id/prompts/:promptId", async (request, reply) => {
    const { id, promptId } = CollectionPromptParamSchema.parse(request.params);
    await collectionService.addPrompt(id, promptId);
    return reply.code(204).send();
  });

  fastify.delete("/:id/prompts/:promptId", async (request, reply) => {
    const { id, promptId } = CollectionPromptParamSchema.parse(request.params);
    await collectionService.removePrompt(id, promptId);
    return reply.code(204).send();
  });

  fastify.post("/:id/chains/:chainId", async (request, reply) => {
    const { id, chainId } = CollectionChainParamSchema.parse(request.params);
    await collectionService.addChain(id, chainId);
    return reply.code(204).send();
  });

  fastify.delete("/:id/chains/:chainId", async (request, reply) => {
    const { id, chainId } = CollectionChainParamSchema.parse(request.params);
    await collectionService.removeChain(id, chainId);
    return reply.code(204).send();
  });

  fastify.get("/:id/docs", async (request, reply) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const collection = await collectionService.getById(id);
    if (!collection.directory)
      return reply.code(400).send({ error: "No directory set" });
    const files = await docsService.list(collection.directory);
    return files;
  });

  fastify.get("/:id/api-keys", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    return apiKeyService.list(id);
  });

  fastify.post("/:id/api-keys", async (request, reply) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { name } = CreateApiKeyBodySchema.parse(request.body);
    const { record, plaintext } = await apiKeyService.generate(id, name);
    return reply.code(201).send({ ...record, key: plaintext });
  });

  fastify.delete("/:id/api-keys/:keyId", async (request, reply) => {
    const { id, keyId } = ApiKeyParamSchema.parse(request.params);
    await apiKeyService.revoke(keyId, id);
    return reply.code(204).send();
  });

  fastify.get("/:id/api-keys/:keyId/key", async (request, reply) => {
    const { id, keyId } = ApiKeyParamSchema.parse(request.params);
    const plaintext = await apiKeyService.getFullKey(keyId, id);
    if (!plaintext) {
      return reply
        .code(404)
        .send({ error: "Key not found or already revoked" });
    }
    return { key: plaintext };
  });

  fastify.get("/:id/docs/content", async (request, reply) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { file } = z.object({ file: z.string().min(1) }).parse(request.query);
    const collection = await collectionService.getById(id);
    if (!collection.directory)
      return reply.code(400).send({ error: "No directory set" });
    try {
      const content = await docsService.content(collection.directory, file);
      return { content };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (msg === "Forbidden")
        return reply.code(403).send({ error: "Forbidden" });
      return reply.code(404).send({ error: "File not found" });
    }
  });

  // Analytics endpoints
  const AnalyticsQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(365).default(30),
  });

  fastify.get("/:id/analytics", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { days } = AnalyticsQuerySchema.parse(request.query);
    return analyticsService.getFullAnalytics(id, days);
  });

  fastify.get("/:id/analytics/volume", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { days } = AnalyticsQuerySchema.parse(request.query);
    const data = await analyticsService.getVolumeAnalytics(id, days);
    return { data, rangeInDays: days };
  });

  fastify.get("/:id/analytics/coverage", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { days } = AnalyticsQuerySchema.parse(request.query);
    const data = await analyticsService.getCoverageAnalytics(id, days);
    return { data, rangeInDays: days };
  });

  fastify.get("/:id/analytics/file-count", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { days } = AnalyticsQuerySchema.parse(request.query);
    const data = await analyticsService.getFileCountAnalytics(id, days);
    return { data, rangeInDays: days };
  });

  fastify.get("/:id/analytics/makeup", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const data = await analyticsService.getCodeMakeupAnalytics(id);
    return { data };
  });

  fastify.get("/:id/analytics/growth", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { days } = AnalyticsQuerySchema.parse(request.query);
    const data = await analyticsService.getGrowthAnalytics(id, days);
    return { data, rangeInDays: days };
  });

  // Directory scope management
  fastify.get("/:id/directory-structure", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const collection = await collectionService.getById(id);
    if (!collection.directory) {
      throw new Error("No directory set");
    }
    try {
      const structure = await collectionService.getDirectoryStructure(
        collection.directory
      );
      return structure;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      throw new Error(msg, { cause: err });
    }
  });

  fastify.patch("/:id/in-scope-directories", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { directories } = z
      .object({ directories: z.array(z.string()) })
      .parse(request.body);
    const updated = await collectionService.updateInScopeDirectories(
      id,
      directories
    );
    return updated;
  });
}
