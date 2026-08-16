import { collectionRepository } from "@/repositories/collection.repository.js";
import { agentService } from "@/services/agent.service.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const ToolInvokeSchema = z.object({
  tool: z.string().describe("Tool name (e.g., list_prompts, get_chain)"),
  input: z.record(z.unknown()).default({}).describe("Tool input parameters"),
});

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  // Resolves which collection an API key is scoped to, by matching repo path.
  // MCP server calls this once at startup to discover its collectionId.
  fastify.get("/resolve", async (request, reply) => {
    const collectionId = request.collectionScope;
    if (!collectionId) {
      return reply.code(403).send({ error: "Endpoint requires an API key" });
    }
    const collection = await collectionRepository.findById(collectionId);
    if (!collection) {
      return reply.code(404).send({ error: "Collection not found" });
    }
    return { collectionId: collection.id, name: collection.name };
  });

  // GET /api/agent/tools — List all available tools with schemas (stateless)
  fastify.get("/tools", async (request, reply) => {
    if (!request.collectionScope) {
      return reply.code(403).send({ error: "Endpoint requires an API key" });
    }

    const tools = agentService.getToolDefinitions();
    return reply.send({ tools });
  });

  // POST /api/agent/tools — Invoke a tool by name (stateless)
  fastify.post<{ Body: z.infer<typeof ToolInvokeSchema> }>(
    "/tools",
    async (request, reply) => {
      const collectionId = request.collectionScope;
      if (!collectionId) {
        return reply.code(403).send({ error: "Endpoint requires an API key" });
      }

      const validation = ToolInvokeSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          details: validation.error.errors,
        });
      }

      const { tool, input } = validation.data;

      try {
        const result = await agentService.invokeTool(tool, input, collectionId);
        return reply.send({ tool, result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return reply.code(400).send({ error: message });
      }
    }
  );
}
