import { apiKeyService } from "@/services/api-key.service.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { buildMcpServer } from "@/routes/mcp/mcp.tools.js";

// In-memory session store: sessionId -> transport
const sessions = new Map<string, StreamableHTTPServerTransport>();

export async function mcpRoutes(fastify: FastifyInstance) {
  // POST — MCP JSON-RPC messages
  fastify.post("/mcp", async (request, reply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;

    // Existing session — route to it
    if (sessionId) {
      const transport = sessions.get(sessionId);
      if (!transport) {
        return reply.code(404).send({ error: "Session not found or expired" });
      }
      reply.hijack();
      await transport.handleRequest(request.raw, reply.raw, request.body);
      return reply;
    }

    // New session — require API key
    const bearer = (request.headers.authorization ?? "").replace("Bearer ", "");
    if (!bearer.startsWith("pt_")) {
      return reply
        .code(401)
        .send({ error: "API key required to start MCP session" });
    }
    const scope = await apiKeyService.validate(bearer);
    if (!scope) {
      return reply.code(401).send({ error: "Invalid or revoked API key" });
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    // Pre-emptively set up the close handler with a no-op before connecting
    (transport as { onclose?: () => void }).onclose = () => {};

    const server = buildMcpServer(scope.collectionId);
    // @ts-expect-error StreamableHTTPServerTransport has optional onclose from library, but Transport requires it
    await server.connect(transport);

    if (transport.sessionId) {
      sessions.set(transport.sessionId, transport);
      // Override with the true handler
      (transport as { onclose?: () => void }).onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
    }

    reply.hijack();
    await transport.handleRequest(request.raw, reply.raw, request.body);
    return reply;
  });

  // GET — SSE stream for server-initiated messages
  fastify.get("/mcp", async (request, reply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      return reply.code(400).send({ error: "Mcp-Session-Id header required" });
    }
    const transport = sessions.get(sessionId);
    if (!transport) {
      return reply.code(404).send({ error: "Session not found or expired" });
    }
    reply.hijack();
    await transport.handleRequest(request.raw, reply.raw);
    return reply;
  });

  // DELETE — close session
  fastify.delete("/mcp", async (request, reply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    if (sessionId) {
      const transport = sessions.get(sessionId);
      if (transport) {
        await transport.close();
        sessions.delete(sessionId);
      }
    }
    return reply.code(204).send();
  });
}
