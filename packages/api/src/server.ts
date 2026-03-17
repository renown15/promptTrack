import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "@/config/env.js";
import authPlugin from "@/plugins/auth.plugin.js";
import { registerErrorHandler } from "@/middleware/errorHandler.js";
import { authRoutes } from "@/routes/auth/auth.routes.js";
import { promptRoutes } from "@/routes/prompts/prompts.routes.js";
import { chainRoutes } from "@/routes/chains/chains.routes.js";
import { collectionRoutes } from "@/routes/collections/collections.routes.js";
import { fsRoutes } from "@/routes/fs/fs.routes.js";
import { insightRoutes } from "@/routes/insights/insights.routes.js";
import { settingsRoutes } from "@/routes/settings/settings.routes.js";
import { collectionRepository } from "@/repositories/collection.repository.js";
import { watcherService } from "@/services/watcher.service.js";
import { seedCache } from "@/services/insight.service.js";

const loggerConfig =
  env.NODE_ENV === "development"
    ? {
        level: env.LOG_LEVEL,
        transport: {
          target: "pino-pretty",
          options: {
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      }
    : { level: env.LOG_LEVEL };

const fastify = Fastify({ logger: loggerConfig });

async function buildApp() {
  await fastify.register(cors, {
    origin: env.CORS_ORIGINS.split(","),
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === "production",
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "PromptTrack API",
        description: "API for managing AI prompts and chains",
        version: "0.0.0",
      },
    },
  });

  await fastify.register(swaggerUi, { routePrefix: "/docs" });

  await fastify.register(authPlugin);

  registerErrorHandler(fastify);

  await fastify.register(authRoutes, { prefix: "/api/auth" });
  await fastify.register(promptRoutes, { prefix: "/api/prompts" });
  await fastify.register(chainRoutes, { prefix: "/api/chains" });
  await fastify.register(collectionRoutes, { prefix: "/api/collections" });
  await fastify.register(fsRoutes, { prefix: "/api/fs" });
  await fastify.register(insightRoutes, { prefix: "/api/collections" });
  await fastify.register(settingsRoutes, { prefix: "/api/settings" });

  fastify.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  return fastify;
}

async function startWatchers() {
  const collections = await collectionRepository.findAll();
  for (const c of collections) {
    if (c.directory) {
      await seedCache(c.id, c.directory).catch(() => {});
      watcherService.start(c.id, c.directory);
    }
  }
}

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: env.PORT, host: env.HOST });
    await startWatchers();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
