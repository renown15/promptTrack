import type { FastifyInstance } from "fastify";
import { chainService } from "@/services/chain.service.js";
import { chainSerialiserService } from "@/services/chain-serialiser.service.js";
import { chainVariablesService } from "@/services/chain-variables.service.js";
import {
  CreateChainSchema,
  UpdateChainSchema,
  CreateChainVersionSchema,
  SerialiseChainSchema,
  ChainIdParamSchema,
  ChainListQuerySchema,
} from "@/routes/chains/chains.schemas.js";

export async function chainRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    const query = ChainListQuerySchema.parse(request.query);
    return chainService.list(query);
  });

  fastify.post("/", async (request, reply) => {
    const body = CreateChainSchema.parse(request.body);
    const user = request.user as { id: string };
    const chain = await chainService.create(user.id, body);
    return reply.code(201).send(chain);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = ChainIdParamSchema.parse(request.params);
    const chain = await chainService.getById(id);
    if (!chain) return reply.code(404).send({ error: "Not found" });
    return chain;
  });

  fastify.patch("/:id", async (request) => {
    const { id } = ChainIdParamSchema.parse(request.params);
    const body = UpdateChainSchema.parse(request.body);
    return chainService.update(id, body);
  });

  fastify.post("/:id/versions", async (request, reply) => {
    const { id } = ChainIdParamSchema.parse(request.params);
    const body = CreateChainVersionSchema.parse(request.body);
    const user = request.user as { id: string };
    const version = await chainService.createVersion(id, user.id, body);
    return reply.code(201).send(version);
  });

  fastify.get("/:id/variables", async (request) => {
    const { id } = ChainIdParamSchema.parse(request.params);
    const variables = await chainVariablesService.getVariables(id);
    return { variables };
  });

  fastify.post("/:id/serialise", async (request) => {
    const { id } = ChainIdParamSchema.parse(request.params);
    const body = SerialiseChainSchema.parse(request.body);
    return chainSerialiserService.serialise(id, body.variables);
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = ChainIdParamSchema.parse(request.params);
    await chainService.archive(id);
    return reply.code(204).send();
  });
}
