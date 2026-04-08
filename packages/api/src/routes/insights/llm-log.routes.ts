import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { llmCallLogRepository } from "@/repositories/llm-call-log.repository.js";

const CollectionIdSchema = z.object({ id: z.string() });

export async function llmLogRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/:id/llm-log", async (request) => {
    const { id } = CollectionIdSchema.parse(request.params);
    const { limit } = z
      .object({ limit: z.coerce.number().int().min(1).max(1000).default(200) })
      .parse(request.query);
    return llmCallLogRepository.list(id, limit);
  });

  fastify.delete("/:id/llm-log", async (request, reply) => {
    const { id } = CollectionIdSchema.parse(request.params);
    await llmCallLogRepository.deleteAll(id);
    return reply.code(204).send();
  });
}
