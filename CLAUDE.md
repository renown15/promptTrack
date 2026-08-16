# PromptTrack — Claude Code Rules

## Task list — CRITICAL

Always maintain `/Users/user/dev/promptTrack/TASKS.md` throughout every task:

1. **Before starting** any multi-step work: write the full task list with `- [ ]` items
2. **After completing each step**: immediately update the file, marking that item `- [x]`
3. **When done**: reset the file to `## Status: idle`

**Never batch updates.** Update TASKS.md after every individual step — not at the end.
This means: write the file, do the step, write the file again. Every time. No exceptions.
The file is visible live in the UI; users can see if you are skipping updates.

## Always run before declaring work complete

```
make check   # lint + typecheck + vite build
```

Unit tests alone are not sufficient. `make check` must pass.

## Architecture

- Strict layering: Route Handler → Service → Repository → Prisma
- No Prisma imports outside `packages/api/src/repositories/`
- Shared types via `z.infer<>` only — never hand-write types that mirror Zod schemas
- API files: `kebab-case.repository.ts`, `kebab-case.service.ts`, `kebab-case.routes.ts`
- Pure services: `const camelCase = {...}` object; framework-dependent: `build[Name]Service(fastify)` factory

## Database migrations — CRITICAL

- **Never edit files inside `prisma/migrations/`** after they have been applied
- Only edit `schema.prisma`, then run `make migrate-dev` to generate a new migration file
- Editing applied migration SQL causes Prisma drift and forces a destructive DB reset

## CSS — CRITICAL

- Tailwind only via `@apply` in co-located `.css` files — never inline Tailwind classes in `.tsx`
- BEM class names in `.tsx`
- CSS imports must use `@/` alias — relative imports are banned by ESLint `no-restricted-imports`
  - Correct: `import "@/components/features/chains/ChainNode.css"`
  - Wrong: `import "./ChainNode.css"`

## TypeScript gotchas

- `exactOptionalPropertyTypes: true` — use spread conditionals for optional fields:
  ```ts
  ...(input.description !== undefined && { description: input.description })
  ```
- Same applies to `MutateOptions` — use spread for `onSuccess` etc.

## Naming conventions

- DB: PascalCase models, snake_case tables (`@@map`), camelCase fields, snake_case columns (`@map`)
- Shared schemas: `PascalCase + Schema`, `PascalCase + Input`, `PascalCase + DTO`
- Frontend: `PascalCasePage.tsx`, `usePascalCase.ts`, `camelCaseStore.ts`, `[resource]Api` exports

## Commits

- Max 72 chars header, lowercase subject (e.g. `feat: add chain canvas`)

## Editor

- WYSIWYG editor is TipTap v2 (NOT CodeMirror)
- On save: `editor.storage.markdown.getMarkdown()`
- On load: `editor.commands.setContent(markdownContent)`

## Stack

- pnpm workspaces — use `make` targets, not pnpm directly
- Ports: web=5173, api=3051, postgres=5451
- `packages/shared` — Zod schemas shared by api and web

## Agent / MCP access layer

External coding agents (Claude Code, Cursor, etc.) consume PromptTrack via two surfaces:

### 1. MCP server — `POST /api/mcp`

Full MCP JSON-RPC protocol. Agents add the config to their MCP settings and get native tool calls. Implemented in:

- `packages/api/src/routes/mcp/mcp.routes.ts` — session lifecycle (StreamableHTTPServerTransport)
- `packages/api/src/routes/mcp/mcp.tools.ts` — tool definitions (wraps `agentToolHandlers`)

### 2. REST tool bridge — `POST /api/agent/tools`

Stateless HTTP endpoint for agents that cannot use MCP. Body: `{ tool, input }`. Same handlers as MCP. Implemented in:

- `packages/api/src/routes/agent/agent.routes.ts`
- `packages/api/src/services/agent.service.ts` — `TOOL_DEFS` list + `invokeTool` dispatcher

Both surfaces delegate to `packages/api/src/services/agent-tool-handlers.ts`.

### Tool list (both surfaces)

`list_collections`, `list_prompts`, `get_prompt`, `list_chains`, `get_chain`, `serialise_chain`, `get_repo_status`, `list_problem_files`

### Override endpoint (direct REST, not via tool bridge)

Agents can dispute or acknowledge AI findings:

```
PUT /api/collections/:id/insights/files/override
{ relativePath, metric, status, comment, source: "agent" }
```

- `rejected` = false positive / AI got it wrong
- `accepted` = valid finding, deferring intentionally
- `green`/`amber`/`red` = direct status correction
- Overrides are stored in `FileStatusOverride` table and applied on top of AI scores in the cache

### Agent instruction prompt

`packages/web/src/components/features/collections/agentPrompt.ts` — the canonical copyable prompt shown in the "View config" modal. Edit this file (not the modal component) when the agent instructions need updating.

### API key scoping

All agent endpoints require a `Bearer pt_...` API key. The key is scoped to a single collection. Agents call `GET /api/agent/resolve` to discover their `collectionId` from the key.

## AI analysis pipeline

PromptTrack runs a local Ollama LLM to analyse every file in the repo per metric.

- `insight.scanner.ts` — file watcher, triggers analysis on change
- `insight.analyzer.ts` — per-file analysis: reads file, calls Ollama, writes results to in-memory cache
- `ollama.metrics.ts` — metric definitions (`architecture`, `complexity`, `naming`, `security`, `eng_quality`, `dry`)
- `ollama.service.ts` — Ollama HTTP client + config loader
- `insight.cache.ts` — in-memory state, `MetricOverride` shape, SSE serialisation
- `insight.emitter.ts` — event bus (`file_updated`, `llm_call_start/end`)

When adding a new metric: add it to `DEFAULT_METRICS` in `ollama.metrics.ts` only. The scanner, analyzer, and cache pick it up automatically.

## Agent Insight — supported report formats

The insight scanner (`discovery.service.ts`, `discovery.per-file.ts`) reads coverage and lint reports from the collection's directory. Both aggregate stats (pipeline tile) and per-file overlays are derived from these files.

### Coverage

| Format                     | File                             | Language |
| -------------------------- | -------------------------------- | -------- |
| Jest / Vitest JSON summary | `coverage/coverage-summary.json` | JS / TS  |
| Python coverage.py JSON    | `coverage.json`                  | Python   |

- Jest/Vitest: detected by presence of `"total"` key; per-file entries are absolute paths with `lines.pct`
- Python: detected by presence of `"totals"` key; per-file entries are under `"files"` with `summary.percent_covered`

### Lint

| Format      | File                  | Language |
| ----------- | --------------------- | -------- |
| ESLint JSON | `.eslint-report.json` | JS / TS  |
| Ruff JSON   | `.ruff-report.json`   | Python   |

- ESLint: array of `{ filePath, errorCount, warningCount }` — one entry per file
- Ruff: array of `{ filename, code, message }` — one entry per violation; errors counted by grouping

### Adding a new format

To add support for another language's coverage or lint tool, update `parseCoverageAggregate` / `parseCoveragePerFile` / `parseLintAggregate` / `parseLintPerFile` in those two service files. Detection is format-based (key sniffing), so no config flags are needed.
