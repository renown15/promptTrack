import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "@/config/env.js";
import { userRepository } from "@/repositories/user.repository.js";
import { apiKeyService } from "@/services/api-key.service.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; type?: string; jti?: string };
    user: { id: string; role: string; email: string };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    collectionScope: string | null;
  }
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(jwt, { secret: env.JWT_SECRET });

  fastify.decorateRequest("collectionScope", null);

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      const bearer = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

      // API key path: tokens starting with "pt_"
      if (bearer?.startsWith("pt_")) {
        const scope = await apiKeyService.validate(bearer);
        if (!scope) {
          return reply.code(401).send({ error: "Invalid or revoked API key" });
        }
        request.user = {
          id: "api-key",
          role: "editor",
          email: "agent@api-key",
        };
        request.collectionScope = scope.collectionId;
        return;
      }

      // JWT path
      try {
        await request.jwtVerify();
        const payload = request.user as unknown as {
          sub: string;
          type?: string;
        };
        if (payload.type === "refresh") {
          return reply.code(401).send({ error: "Use access token" });
        }
        const user = await userRepository.findById(payload.sub);
        if (!user || !user.isActive) {
          return reply.code(401).send({ error: "Unauthorized" });
        }
        request.user = { id: user.id, role: user.role, email: user.email };
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    }
  );
}

export default fp(authPlugin);
