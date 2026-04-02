import { join } from "path";
import { readFile, stat } from "fs/promises";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { collectionService } from "@/services/collection.service.js";
import { insightService } from "@/services/insight.service.js";
import { insightEmitter } from "@/services/insight.emitter.js";
import { discoveryService } from "@/services/discovery.service.js";

const CollectionIdSchema = z.object({ id: z.string() });

export async function insightRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/:id/insights",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const collection = await collectionService.getById(id);
      if (!collection.directory)
        return reply.code(400).send({ error: "No directory set" });
      return insightService.getState(id);
    }
  );

  fastify.get(
    "/:id/insights/aggregate",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const collection = await collectionService.getById(id);
      if (!collection.directory)
        return reply.code(400).send({ error: "No directory set" });
      return discoveryService.getAggregateStats(collection.directory);
    }
  );

  fastify.post(
    "/:id/insights/scan",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const collection = await collectionService.getById(id);
      if (!collection.directory)
        return reply.code(400).send({ error: "No directory set" });
      insightService.scan(id, collection.directory).catch(() => {});
      return reply.code(202).send({ status: "scanning" });
    }
  );

  fastify.post(
    "/:id/insights/retry",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const { relativePath } = z
        .object({ relativePath: z.string() })
        .parse(request.body);
      const collection = await collectionService.getById(id);
      if (!collection.directory)
        return reply.code(400).send({ error: "No directory set" });
      const abs = join(collection.directory, relativePath);
      insightService.updateFile(id, collection.directory, abs).catch(() => {});
      return reply.code(202).send({ status: "retrying" });
    }
  );

  fastify.get(
    "/:id/insights/detail",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const { path: relativePath } = z
        .object({ path: z.string() })
        .parse(request.query);
      const collection = await collectionService.getById(id);
      if (!collection.directory)
        return reply.code(400).send({ error: "No directory set" });

      const dir = collection.directory;
      const absPath = join(dir, relativePath);

      // Metrics from in-memory cache
      const state = insightService.getState(id);
      const fileSnap = state.files.find((f) => f.relativePath === relativePath);
      const metrics = fileSnap?.metrics ?? {};

      // Build a list of candidate directories: walk up from the file toward root
      const searchDirs: string[] = [];
      const parts = relativePath.split("/");
      for (let i = parts.length - 1; i >= 0; i--) {
        searchDirs.push(join(dir, ...parts.slice(0, i)));
      }
      searchDirs.push(dir);

      // Coverage — try each directory, use the first match
      let coverage = null;
      let coveragePath: string | null = null;
      for (const d of searchDirs) {
        coveragePath = await discoveryService.findCoverageReport(d);
        if (coveragePath) break;
      }
      if (coveragePath) {
        try {
          const raw = JSON.parse(
            await readFile(coveragePath, "utf-8")
          ) as Record<string, unknown>;
          const entry = raw[absPath] as
            | Record<string, { pct: number; covered: number; total: number }>
            | undefined;
          if (entry) {
            const reportedAt = new Date(
              (await stat(coveragePath)).mtime
            ).toISOString();
            coverage = {
              lines: entry.lines,
              branches: entry.branches,
              functions: entry.functions,
              statements: entry.statements,
              reportedAt,
            };
          }
        } catch {
          /* coverage file unreadable */
        }
      }

      // Lint — try each directory, use the first match
      let lint = null;
      let lintPath: string | null = null;
      for (const d of searchDirs) {
        lintPath = await discoveryService.findLintReport(d);
        if (lintPath) break;
      }
      if (lintPath) {
        try {
          type EslintFile = {
            filePath: string;
            messages: {
              ruleId: string | null;
              severity: number;
              message: string;
              line: number;
              column: number;
            }[];
            errorCount: number;
            warningCount: number;
          };
          const report = JSON.parse(
            await readFile(lintPath, "utf-8")
          ) as EslintFile[];
          const entry = report.find((r) => r.filePath === absPath);
          if (entry) {
            const reportedAt = new Date(
              (await stat(lintPath)).mtime
            ).toISOString();
            lint = {
              errors: entry.errorCount,
              warnings: entry.warningCount,
              messages: entry.messages.map((m) => ({
                ruleId: m.ruleId,
                severity: m.severity as 1 | 2,
                message: m.message,
                line: m.line,
                column: m.column,
              })),
              reportedAt,
            };
          }
        } catch {
          /* lint file unreadable */
        }
      }

      return { relativePath, metrics, coverage, lint };
    }
  );

  // SSE — auth via ?token= query param (EventSource can't send custom headers)
  fastify.get("/:id/insights/stream", async (request, reply) => {
    const { id } = CollectionIdSchema.parse(request.params);
    const { token } = z.object({ token: z.string() }).parse(request.query);

    try {
      fastify.jwt.verify(token);
    } catch {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    reply.hijack();
    const res = reply.raw;
    const origin = (request.headers.origin as string) ?? "";
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    });

    function send(event: string, data: unknown) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }

    const currentState = insightService.getState(id);
    send("state", currentState);

    const onFileUpdated = (data: unknown) => send("file_updated", data);
    const onFileRemoved = (data: unknown) => send("file_removed", data);
    const onScanComplete = (data: unknown) => send("scan_complete", data);
    const onGitignoreUpdated = (data: unknown) =>
      send("gitignore_updated", data);

    insightEmitter.on(`file_updated:${id}`, onFileUpdated);
    insightEmitter.on(`file_removed:${id}`, onFileRemoved);
    insightEmitter.on(`scan_complete:${id}`, onScanComplete);
    insightEmitter.on(`gitignore_updated:${id}`, onGitignoreUpdated);

    request.raw.on("close", () => {
      insightEmitter.off(`file_updated:${id}`, onFileUpdated);
      insightEmitter.off(`file_removed:${id}`, onFileRemoved);
      insightEmitter.off(`scan_complete:${id}`, onScanComplete);
      insightEmitter.off(`gitignore_updated:${id}`, onGitignoreUpdated);
      res.end();
    });
  });
}
