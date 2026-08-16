import { CollectionIdParamSchema } from "@/routes/collections/collections.schemas.js";
import { collectionService } from "@/services/collection.service.js";
import { docsAnalyzerService } from "@/services/docs.analyzer.js";
import { docsService } from "@/services/docs.service.js";
import { fileStatusOverrideRepository } from "@/repositories/file-status-override.repository.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const STALE_DAYS = 30;

export function registerDocsRoutes(fastify: FastifyInstance) {
  fastify.get("/:id/docs", async (request, reply) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const collection = await collectionService.getById(id);
    if (!collection.directory)
      return reply.code(400).send({ error: "No directory set" });
    const files = await docsService.list(collection.directory);
    const overrides = await fileStatusOverrideRepository.listForCollection(id);
    const overrideMap = new Map(
      overrides
        .filter((o) => o.metric === "doc_freshness")
        .map((o) => [o.relativePath, o])
    );
    const toSupersede = files
      .filter((f) => {
        const ov = overrideMap.get(f.relativePath);
        return ov && new Date(f.updatedAt) > ov.createdAt;
      })
      .map((f) => f.relativePath);
    if (toSupersede.length > 0) {
      await fileStatusOverrideRepository.supersedeDueToFileChange(
        id,
        toSupersede
      );
      toSupersede.forEach((p) => overrideMap.delete(p));
    }
    const staleMs = STALE_DAYS * 24 * 60 * 60 * 1000;
    return files.map((f) => {
      const ov = overrideMap.get(f.relativePath) ?? null;
      const ageMs = Date.now() - new Date(f.updatedAt).getTime();
      return {
        ...f,
        isStale: ageMs > staleMs && ov === null,
        ageMs,
        freshnessOverride: ov
          ? {
              comment: ov.comment,
              source: ov.source,
              createdAt: ov.createdAt.toISOString(),
            }
          : null,
      };
    });
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

  fastify.get("/:id/docs/analysis", async (request, reply) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const collection = await collectionService.getById(id);
    if (!collection.directory)
      return reply.code(400).send({ error: "No directory set" });
    const result = docsAnalyzerService.getResult(id);
    if (!result) return reply.code(204).send();
    return result;
  });
}
