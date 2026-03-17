import type { FastifyInstance } from "fastify";
import { promptService } from "@/services/prompt.service.js";
import { chainRepository } from "@/repositories/chain.repository.js";
import {
  CreatePromptSchema,
  UpdatePromptSchema,
  CreatePromptVersionSchema,
  PromptIdParamSchema,
  PromptListQuerySchema,
} from "@/routes/prompts/prompts.schemas.js";

export async function promptRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    const query = PromptListQuerySchema.parse(request.query);
    return promptService.list(query);
  });

  fastify.get("/:id/chains", async (request) => {
    const { id } = PromptIdParamSchema.parse(request.params);
    return chainRepository.findByPromptId(id);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = PromptIdParamSchema.parse(request.params);
    const prompt = await promptService.getById(id);
    if (!prompt) return reply.code(404).send({ error: "Not found" });
    return prompt;
  });

  fastify.post("/", async (request, reply) => {
    const body = CreatePromptSchema.parse(request.body);
    const user = request.user as { id: string };
    const prompt = await promptService.create(user.id, body);
    return reply.code(201).send(prompt);
  });

  fastify.patch("/:id", async (request) => {
    const { id } = PromptIdParamSchema.parse(request.params);
    const body = UpdatePromptSchema.parse(request.body);
    return promptService.update(id, body);
  });

  fastify.post("/:id/versions", async (request, reply) => {
    const { id } = PromptIdParamSchema.parse(request.params);
    const body = CreatePromptVersionSchema.parse(request.body);
    const user = request.user as { id: string };
    const version = await promptService.createVersion(id, user.id, body);
    return reply.code(201).send(version);
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = PromptIdParamSchema.parse(request.params);
    await promptService.archive(id);
    return reply.code(204).send();
  });
}
