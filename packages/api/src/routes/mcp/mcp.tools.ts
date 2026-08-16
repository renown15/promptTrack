import { agentToolHandlers } from "@/services/agent-tool-handlers.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function mcpResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function buildMcpServer(collectionId: string): McpServer {
  const server = new McpServer({ name: "prompttrack", version: "1.0.0" });

  server.tool(
    "list_collections",
    "List the PromptTrack collection this agent is scoped to.",
    {},
    async () =>
      mcpResult(await agentToolHandlers.list_collections({}, collectionId))
  );

  server.tool(
    "list_prompts",
    "Browse available prompts. Returns name, slug, description, environment, and tags.",
    {
      environment: z
        .enum(["draft", "review", "staging", "production"])
        .optional()
        .describe("Filter by environment"),
    },
    async (input) =>
      mcpResult(await agentToolHandlers.list_prompts(input, collectionId))
  );

  server.tool(
    "get_prompt",
    "Fetch a specific prompt by ID or slug, including its content, role, variables, and model parameters.",
    { id: z.string().describe("Prompt ID (cuid) or slug") },
    async (input) =>
      mcpResult(await agentToolHandlers.get_prompt(input, collectionId))
  );

  server.tool(
    "list_chains",
    "Browse available prompt chains. A chain is a DAG of prompts that can be serialised into a messages array.",
    {},
    async () => mcpResult(await agentToolHandlers.list_chains({}, collectionId))
  );

  server.tool(
    "get_chain",
    "Fetch a chain by ID or slug, including its nodes (prompts) and edges (connections).",
    { id: z.string().describe("Chain ID (cuid) or slug") },
    async (input) =>
      mcpResult(await agentToolHandlers.get_chain(input, collectionId))
  );

  server.tool(
    "serialise_chain",
    "Convert a chain into a ready-to-use messages array with variable substitution.",
    {
      id: z.string().describe("Chain ID (cuid) or slug"),
      variables: z
        .record(z.string(), z.string())
        .default({})
        .describe(
          'Variable substitution map e.g. { "language": "TypeScript" }'
        ),
    },
    async (input) =>
      mcpResult(await agentToolHandlers.serialise_chain(input, collectionId))
  );

  server.tool(
    "get_repo_status",
    "Get a complete codebase health snapshot: coverage, lint errors, per-metric counts, source control status (untracked/modified files), and prioritized recommendations for what to do next. Call this first.",
    {
      repo: z
        .string()
        .optional()
        .describe(
          'Repository name for safety validation (e.g., "PromptTrack")'
        ),
    },
    async (input) =>
      mcpResult(await agentToolHandlers.get_repo_status(input, collectionId))
  );

  server.tool(
    "list_problem_files",
    "List files ranked by problem score with a suggested fix per file. Use after get_repo_status to drill into specifics.",
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe("Max files to return"),
    },
    async (input) =>
      mcpResult(await agentToolHandlers.list_problem_files(input, collectionId))
  );

  return server;
}
