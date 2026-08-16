import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { fileStatusOverrideRepository } from "@/repositories/file-status-override.repository.js";
import { insightCache, serializeState } from "@/services/insight.cache.js";
import type { MetricOverride } from "@/services/insight.cache.js";
import { insightEmitter } from "@/services/insight.emitter.js";

const CollectionIdSchema = z.object({ id: z.string() });

const UpsertOverrideBody = z.object({
  relativePath: z.string(),
  metric: z.string(),
  status: z.enum(["green", "amber", "red", "accepted", "rejected"]),
  comment: z.string().min(1),
  source: z.enum(["human", "agent"]).default("human"),
});

const DeleteOverrideBody = z.object({
  relativePath: z.string(),
  metric: z.string(),
});

const FilePathQuery = z.object({ path: z.string() });

function emitFileUpdatedIfCached(collectionId: string, relativePath: string) {
  const state = insightCache.get(collectionId);
  if (!state) return;
  const serialized = serializeState(state);
  const fileData = serialized.files.find(
    (f) => f.relativePath === relativePath
  );
  if (fileData) insightEmitter.emit(`file_updated:${collectionId}`, fileData);
}

function serializeRecord(r: {
  relativePath: string;
  metric: string;
  status: string;
  comment: string;
  source: string;
  supersededAt: Date | null;
  supersededBy: string | null;
  createdAt: Date;
}) {
  return {
    relativePath: r.relativePath,
    metric: r.metric,
    status: r.status,
    comment: r.comment,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
    supersededAt: r.supersededAt?.toISOString() ?? null,
    supersededBy: r.supersededBy ?? null,
  };
}

export async function fileOverrideRoutes(fastify: FastifyInstance) {
  // PUT — upsert an override for a specific file metric
  fastify.put(
    "/:id/insights/files/override",
    { preHandler: [fastify.authenticate] },
    async (request, _reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const body = UpsertOverrideBody.parse(request.body);

      const record = await fileStatusOverrideRepository.upsert(
        id,
        body.relativePath,
        body.metric,
        body.status,
        body.comment,
        body.source
      );

      const state = insightCache.get(id);
      if (state) {
        const snap = state.files.get(body.relativePath);
        if (snap) {
          snap.overrides[body.metric] = {
            status: record.status,
            comment: record.comment,
            source: record.source as "human" | "agent",
            updatedAt: record.createdAt.toISOString(),
          } satisfies MetricOverride;
          emitFileUpdatedIfCached(id, body.relativePath);
        }
      }

      return serializeRecord(record);
    }
  );

  // DELETE — remove an override (supersedes active record)
  fastify.delete(
    "/:id/insights/files/override",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const body = DeleteOverrideBody.parse(request.body);

      await fileStatusOverrideRepository.remove(
        id,
        body.relativePath,
        body.metric
      );

      const state = insightCache.get(id);
      if (state) {
        const snap = state.files.get(body.relativePath);
        if (snap) {
          delete snap.overrides[body.metric];
          emitFileUpdatedIfCached(id, body.relativePath);
        }
      }

      return reply.code(204).send();
    }
  );

  // GET — list active overrides for a collection
  fastify.get(
    "/:id/insights/files/overrides",
    { preHandler: [fastify.authenticate] },
    async (request, _reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const records = await fileStatusOverrideRepository.listForCollection(id);
      return records.map(serializeRecord);
    }
  );

  // GET — full history for a specific file
  fastify.get(
    "/:id/insights/files/override-history",
    { preHandler: [fastify.authenticate] },
    async (request, _reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const { path } = FilePathQuery.parse(request.query);
      const records = await fileStatusOverrideRepository.historyForFile(
        id,
        path
      );
      return records.map(serializeRecord);
    }
  );
}
