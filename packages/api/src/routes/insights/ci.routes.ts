import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { collectionService } from "@/services/collection.service.js";
import { ciService } from "@/services/ci.service.js";

const CollectionIdSchema = z.object({ id: z.string().cuid() });

export async function ciRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/:id/insights/ci",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const collection = await collectionService.getById(id);
      if (!collection.directory) {
        return reply.code(400).send({ error: "No directory set" });
      }
      return ciService.getStatus(collection.directory);
    }
  );
}
