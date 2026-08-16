import { readFile } from "fs/promises";
import { join } from "path";
import type { FastifyInstance } from "fastify";

const TASKS_PATH = join(process.cwd(), "../../TASKS.md");

export async function tasksRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (_request, _reply) => {
    try {
      const content = await readFile(TASKS_PATH, "utf-8");
      return { content };
    } catch {
      return { content: "# Tasks\n\nNo task file found." };
    }
  });
}
