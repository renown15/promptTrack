import { readdir } from "fs/promises";
import { resolve, dirname, join } from "path";
import { homedir } from "os";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const FsQuerySchema = z.object({
  path: z.string().optional(),
});

interface FsEntry {
  name: string;
  path: string;
}

interface FsResponse {
  path: string;
  parent: string | null;
  entries: FsEntry[];
}

export async function fsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get<{ Querystring: { path?: string } }>(
    "/",
    async (request, reply) => {
      const { path: rawPath } = FsQuerySchema.parse(request.query);
      const dirPath = resolve(rawPath ?? homedir());

      let entries: FsEntry[];
      try {
        const items = await readdir(dirPath, { withFileTypes: true });
        entries = items
          .filter((d) => d.isDirectory() && !d.name.startsWith("."))
          .map((d) => ({ name: d.name, path: join(dirPath, d.name) }))
          .sort((a, b) => a.name.localeCompare(b.name));
      } catch {
        return reply.code(400).send({ error: "Cannot read directory" });
      }

      const parent = dirPath === "/" ? null : dirname(dirPath);
      const response: FsResponse = { path: dirPath, parent, entries };
      return response;
    }
  );
}
