import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ollamaService, DEFAULT_METRICS } from "@/services/ollama.service.js";

const OllamaConfigBodySchema = z.object({
  endpoint: z.string().url(),
  model: z.string().min(1),
  metrics: z.record(z.boolean()),
});

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/ollama", async () => {
    const cfg = await ollamaService.getConfig();
    return { ...cfg, defaultMetrics: DEFAULT_METRICS };
  });

  fastify.put("/ollama", async (request) => {
    const body = OllamaConfigBodySchema.parse(request.body);
    return ollamaService.updateConfig(body);
  });

  fastify.post("/ollama/test", async (request) => {
    const { endpoint } = z.object({ endpoint: z.string() }).parse(request.body);
    const ok = await ollamaService.testConnection(endpoint);
    return { ok };
  });

  fastify.get("/ollama/models", async (request) => {
    const { endpoint } = z
      .object({ endpoint: z.string() })
      .parse(request.query);
    const models = await ollamaService.listModels(endpoint);
    return { models };
  });
}
