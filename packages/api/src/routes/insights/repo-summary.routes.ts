import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { collectionService } from "@/services/collection.service.js";
import { repoSummaryService } from "@/services/repo-summary.service.js";

const CollectionIdSchema = z.object({ id: z.string().cuid() });

export async function repoSummaryRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/:id/insights/repo-summary",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const collection = await collectionService.getById(id);
      if (!collection.directory)
        return reply.code(400).send({ error: "No directory set" });
      const summary = await repoSummaryService.generate(
        id,
        collection.directory
      );
      return { summary };
    }
  );
}
