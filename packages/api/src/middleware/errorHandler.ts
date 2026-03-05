import type { FastifyInstance } from "fastify";
import { AuthError } from "@/services/auth.service.js";

export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    if (error instanceof AuthError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }

    if (error.validation) {
      return reply
        .code(400)
        .send({ error: "Validation error", details: error.validation });
    }

    const statusCode = error.statusCode ?? 500;
    const message = statusCode < 500 ? error.message : "Internal server error";
    return reply.code(statusCode).send({ error: message });
  });
}
