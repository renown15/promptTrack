import { join, resolve } from "path";
import { readFile } from "fs/promises";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { collectionService } from "@/services/collection.service.js";
import { ollamaService } from "@/services/ollama.service.js";

const CollectionIdSchema = z.object({ id: z.string() });
const PathQuerySchema = z.object({ path: z.string() });

const EXT_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  cs: "csharp",
  css: "css",
  html: "html",
  json: "json",
  md: "markdown",
  sh: "bash",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  sql: "sql",
};

export async function fileInspectorRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/:id/insights/file-content",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const { path: relativePath } = PathQuerySchema.parse(request.query);
      const collection = await collectionService.getById(id);
      if (!collection.directory)
        return reply.code(400).send({ error: "No directory set" });

      const absPath = join(collection.directory, relativePath);
      if (!resolve(absPath).startsWith(resolve(collection.directory)))
        return reply.code(403).send({ error: "Forbidden" });

      try {
        const content = await readFile(absPath, "utf-8");
        const ext = relativePath.split(".").pop() ?? "";
        return { content, language: EXT_LANGUAGE[ext] ?? "plaintext" };
      } catch {
        return reply.code(404).send({ error: "File not found" });
      }
    }
  );

  fastify.post(
    "/:id/insights/file-summary",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const { path: relativePath } = PathQuerySchema.parse(request.query);
      const collection = await collectionService.getById(id);
      if (!collection.directory)
        return reply.code(400).send({ error: "No directory set" });

      const absPath = join(collection.directory, relativePath);
      if (!resolve(absPath).startsWith(resolve(collection.directory)))
        return reply.code(403).send({ error: "Forbidden" });

      const cfg = await ollamaService.getConfig();
      const content = await readFile(absPath, "utf-8").catch(() => "");
      const body =
        content.length > 6000
          ? content.slice(0, 6000) + "\n... (truncated)"
          : content;

      const prompt = `Summarise this file in 2-3 concise sentences. Describe what it does, its primary responsibility, and any notable patterns or dependencies. Be specific and direct.

File: ${relativePath}

\`\`\`
${body}
\`\`\`

Plain text only. No markdown. 2-3 sentences.`;

      const res = await fetch(`${cfg.endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: cfg.model, prompt, stream: false }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok)
        return reply.code(502).send({ error: `Ollama error: ${res.status}` });

      const data = (await res.json()) as { response: string };
      return { summary: data.response.trim() };
    }
  );

  fastify.post(
    "/:id/insights/file-refactor",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const { path: relativePath } = PathQuerySchema.parse(request.query);
      const collection = await collectionService.getById(id);
      if (!collection.directory)
        return reply.code(400).send({ error: "No directory set" });

      const absPath = join(collection.directory, relativePath);
      if (!resolve(absPath).startsWith(resolve(collection.directory)))
        return reply.code(403).send({ error: "Forbidden" });

      const cfg = await ollamaService.getConfig();
      const content = await readFile(absPath, "utf-8").catch(() => "");
      const body =
        content.length > 6000
          ? content.slice(0, 6000) + "\n... (truncated)"
          : content;

      const prompt = `What are the top 2-3 concrete refactor opportunities in this file? Name specific functions or patterns and suggest the improvement. If the file is already clean and well-structured, say so briefly.

File: ${relativePath}

\`\`\`
${body}
\`\`\`

Plain text only. No markdown. Be specific and direct.`;

      const res = await fetch(`${cfg.endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: cfg.model, prompt, stream: false }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok)
        return reply.code(502).send({ error: `Ollama error: ${res.status}` });

      const data = (await res.json()) as { response: string };
      return { ideas: data.response.trim() };
    }
  );

  fastify.post(
    "/:id/insights/file-discuss",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = CollectionIdSchema.parse(request.params);
      const bodySchema = z.object({
        path: z.string(),
        message: z.string(),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional(),
      });
      const {
        path: relativePath,
        message,
        history,
      } = bodySchema.parse(request.body);

      const collection = await collectionService.getById(id);
      if (!collection.directory)
        return reply.code(400).send({ error: "No directory set" });

      const absPath = join(collection.directory, relativePath);
      if (!resolve(absPath).startsWith(resolve(collection.directory)))
        return reply.code(403).send({ error: "Forbidden" });

      const cfg = await ollamaService.getConfig();
      const content = await readFile(absPath, "utf-8").catch(() => "");
      const body =
        content.length > 6000
          ? content.slice(0, 6000) + "\n... (truncated)"
          : content;

      // Build conversation context
      const conversationHistory = (history ?? [])
        .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n\n");

      const systemPrompt = `You are a helpful code advisor discussing a specific file with the user. You have access to the file content below.

When discussing the code, be specific and practical. Reference line numbers or specific functions when relevant. Keep responses concise but informative.`;

      const prompt = `${systemPrompt}

File: ${relativePath}
Language: ${EXT_LANGUAGE[relativePath.split(".").pop() ?? ""] ?? "plaintext"}

File content:
\`\`\`
${body}
\`\`\`

${
  conversationHistory
    ? `Previous conversation:\n${conversationHistory}\n\n`
    : ""
}User: ${message}`;

      const res = await fetch(`${cfg.endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: cfg.model, prompt, stream: false }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok)
        return reply.code(502).send({ error: `Ollama error: ${res.status}` });

      const data = (await res.json()) as { response: string };
      return { response: data.response.trim() };
    }
  );
}
