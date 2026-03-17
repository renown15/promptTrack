import Fastify from "fastify";
import authPlugin from "@/plugins/auth.plugin.js";
import { registerErrorHandler } from "@/middleware/errorHandler.js";
import { authRoutes } from "@/routes/auth/auth.routes.js";
import { promptRoutes } from "@/routes/prompts/prompts.routes.js";
import { chainRoutes } from "@/routes/chains/chains.routes.js";
import { collectionRoutes } from "@/routes/collections/collections.routes.js";
import type { FastifyInstance } from "fastify";

export async function buildTestApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(authPlugin);
  registerErrorHandler(fastify);

  await fastify.register(authRoutes, { prefix: "/api/auth" });
  await fastify.register(promptRoutes, { prefix: "/api/prompts" });
  await fastify.register(chainRoutes, { prefix: "/api/chains" });
  await fastify.register(collectionRoutes, { prefix: "/api/collections" });

  await fastify.ready();
  return fastify;
}

/**
 * Sign a short-lived access token for the given userId.
 * The app must already be built (so fastify.jwt is registered).
 */
export function signAccessToken(app: FastifyInstance, userId: string): string {
  return app.jwt.sign({ sub: userId }, { expiresIn: "15m" });
}
