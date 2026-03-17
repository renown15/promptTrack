import type { FastifyInstance } from "fastify";
import { collectionService } from "@/services/collection.service.js";
import { docsService } from "@/services/docs.service.js";
import { z } from "zod";
import {
  CreateCollectionSchema,
  UpdateCollectionSchema,
  CollectionIdParamSchema,
  CollectionPromptParamSchema,
  CollectionChainParamSchema,
} from "@/routes/collections/collections.schemas.js";

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
}
