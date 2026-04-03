import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ollamaService, DEFAULT_METRICS } from "@/services/ollama.service.js";
import { getModelStatuses, pullModel } from "@/services/ollama.models.js";

const OllamaConfigBodySchema = z.object({
  endpoint: z.string().url(),
  model: z.string().min(1),
  metrics: z.record(z.boolean()),
  timeoutMs: z.number().int().min(5000).max(300_000).default(60_000),
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

  fastify.get("/ollama/recommended", async () => {
    const cfg = await ollamaService.getConfig();
    const installed = await ollamaService.listModels(cfg.endpoint);
    const statuses = getModelStatuses(installed, cfg.model);
    return { models: statuses, currentModel: cfg.model };
  });

  fastify.post("/ollama/pull", async (request, reply) => {
    const { model } = z
      .object({ model: z.string().min(1) })
      .parse(request.body);
    const cfg = await ollamaService.getConfig();

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const send = (data: object) =>
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
      await pullModel(cfg.endpoint, model, (status, progress) => {
        send({ status, ...(progress !== undefined && { progress }) });
      });
      send({ status: "success", done: true });
    } catch (err) {
      send({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      reply.raw.end();
    }
  });
}
