import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "@/config/env.js";
import { userRepository } from "@/repositories/user.repository.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; type?: string; jti?: string };
    user: { id: string; role: string; email: string };
  }
}

async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(jwt, { secret: env.JWT_SECRET });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
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

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

export default fp(authPlugin);
