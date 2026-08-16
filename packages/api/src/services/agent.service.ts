import { agentToolHandlers } from "@/services/agent-tool-handlers.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const TOOL_DEFS: ToolDefinition[] = [
  {
    name: "list_collections",
    description: "List the PromptTrack collection this agent is scoped to.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_prompts",
    description:
      "Browse available prompts. Returns name, slug, description, environment, and tags.",
    inputSchema: {
      type: "object",
      properties: {
        environment: {
          type: "string",
          enum: ["draft", "review", "staging", "production"],
          description: "Filter by environment (optional)",
        },
      },
    },
  },
  {
    name: "get_prompt",
    description:
      "Fetch a specific prompt by ID or slug, including its content, role, variables, and model parameters.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: 'Prompt ID (cuid) or slug (e.g., "my-system-prompt")',
        },
      },
      required: ["id"],
    },
  },
  {
    name: "list_chains",
    description:
      "Browse available prompt chains. A chain is a DAG of prompts that can be serialised into a messages array.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_chain",
    description:
      "Fetch a chain by ID or slug, including its nodes (prompts) and edges (connections).",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: 'Chain ID (cuid) or slug (e.g., "my-chain")',
        },
      },
      required: ["id"],
    },
  },
  {
    name: "serialise_chain",
    description:
      "Convert a chain into a ready-to-use messages array with variable substitution.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: 'Chain ID (cuid) or slug (e.g., "my-chain")',
        },
        variables: {
          type: "object",
          additionalProperties: { type: "string" },
          description:
            'Variable substitution map, e.g. {"language": "TypeScript"}',
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_repo_status",
    description:
      "Get a complete codebase health snapshot: coverage, lint errors, per-metric counts, source control status (untracked/modified files), and prioritized recommendations for what to do next. Call this first.",
    inputSchema: {
      type: "object",
      properties: {
        repo: {
          type: "string",
          description:
            'Repository name for safety validation (e.g., "PromptTrack"). Optional but recommended.',
        },
      },
    },
  },
  {
    name: "list_problem_files",
    description:
      "List files ranked by problem score with a suggested fix per file. Use after get_repo_status to drill into specifics.",
    inputSchema: {
      type: "object",
      properties: {
        repo: {
          type: "string",
          description:
            'Repository name for safety validation (e.g., "PromptTrack"). Optional but recommended.',
        },
        limit: {
          type: "number",
          description: "Max files to return (default 20, max 100)",
        },
      },
    },
  },
];

export const agentService = {
  getToolDefinitions(): ToolDefinition[] {
    return TOOL_DEFS;
  },

  async invokeTool(
    toolName: string,
    input: Record<string, unknown>,
    collectionId: string
  ): Promise<unknown> {
    const handler = (
      agentToolHandlers as Record<
        string,
        (
          input: Record<string, unknown>,
          collectionId: string
        ) => Promise<unknown>
      >
    )[toolName];

    if (!handler) throw new Error(`Unknown tool: ${toolName}`);
    return handler(input, collectionId);
  },
};
