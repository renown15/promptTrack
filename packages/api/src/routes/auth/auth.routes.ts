import type { FastifyInstance } from "fastify";
import { buildAuthService } from "@/services/auth.service.js";
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
} from "@prompttrack/shared";
import { LogoutBodySchema } from "@/routes/auth/auth.schemas.js";

export async function authRoutes(fastify: FastifyInstance) {
  const authService = buildAuthService(fastify);

  fastify.post("/register", async (request, reply) => {
    const body = RegisterSchema.parse(request.body);
    const tokens = await authService.register(body);
    return reply.code(201).send(tokens);
  });

  fastify.post("/login", async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    const tokens = await authService.login(body);
    return reply.send(tokens);
  });

  fastify.post("/refresh", async (request, reply) => {
    const { refreshToken } = RefreshSchema.parse(request.body);
    const tokens = await authService.refresh(refreshToken);
    return reply.send(tokens);
  });

  fastify.post(
    "/logout",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { refreshToken } = LogoutBodySchema.parse(request.body);
      await authService.logout(refreshToken);
      return reply.code(204).send();
    }
  );
}
