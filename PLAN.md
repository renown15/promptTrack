# PromptTrack MVP Build Plan

> Authoritative implementation plan. Update status as work progresses.
> Design spec: PROMPTTRACK_DESIGN.md

## Architecture Quick Reference

- **Backend**: Fastify → Service → Repository → Prisma (strict layering)
- **Frontend**: Page → Feature Component → Hook → API Client
- **CSS**: All styles in co-located `.css` files via `@apply`. No Tailwind in `.tsx`.
- **File limit**: 200 lines max per `.ts`/`.tsx` file
- **Schemas**: Zod in `packages/shared/src/schemas/` — shared by API + web
- **Types**: Derived via `z.infer<>` only — no hand-written types

---

## Phase 1 — Working Vertical Slice

**Goal**: Login → see prompt list → create/edit a prompt (proves full stack)

### 1.1 DB Schema + Migration

- [ ] Rewrite `packages/api/prisma/schema.prisma` to match design doc
  - Models: User, RefreshToken, Prompt, PromptVersion, TemplateVariable, Chain, ChainVersion, ChainNode, ChainEdge, Collection, AuditLog
  - pgvector extension + optional embedding columns
  - Enums: Role, Environment, PromptRole, AuditAction, ChainNodeRefType
- [ ] Run `make migrate-dev` (name: `init`) to create initial migration
- [ ] Add vector indexes to migration SQL
- [ ] Run `pnpm db:generate`

### 1.2 Install Missing Dependencies

- [ ] API: `argon2`, `@fastify/jwt`
- [ ] Web: `axios`, `react-hook-form`, `zod`

### 1.3 Shared Zod Schemas (`packages/shared/src/schemas/`)

- [ ] `auth.schema.ts` — RegisterSchema, LoginSchema, TokenResponseSchema
- [ ] `prompt.schema.ts` — CreatePromptSchema, CreatePromptVersionSchema, TemplateVariableSchema
- [ ] `chain.schema.ts` — CreateChainSchema, ChainNodeInputSchema, ChainEdgeInputSchema, CreateChainVersionSchema
- [ ] Update `packages/shared/src/schemas/index.ts`

### 1.4 API — Auth

- [ ] Update `packages/api/src/config/env.ts` — add REFRESH_TOKEN_EXPIRES
- [ ] `packages/api/src/repositories/user.repository.ts`
- [ ] `packages/api/src/repositories/refresh-token.repository.ts`
- [ ] `packages/api/src/services/auth.service.ts`
- [ ] `packages/api/src/plugins/auth.plugin.ts` — JWT Fastify plugin + `request.user` decoration
- [ ] `packages/api/src/middleware/errorHandler.ts`
- [ ] `packages/api/src/routes/auth/auth.schemas.ts`
- [ ] `packages/api/src/routes/auth/auth.routes.ts` — register, login, refresh, logout
- [ ] Register auth routes in `server.ts`
- [ ] Unit tests: `tests/unit/auth.service.test.ts`
- [ ] Run `pnpm --filter @prompttrack/api lint` and `pnpm --filter @prompttrack/api test:unit`

### 1.5 API — Prompts

- [ ] `packages/api/src/repositories/prompt.repository.ts`
- [ ] `packages/api/src/repositories/prompt-version.repository.ts`
- [ ] `packages/api/src/services/prompt.service.ts`
- [ ] `packages/api/src/services/prompt-version.service.ts`
- [ ] `packages/api/src/routes/prompts/prompts.schemas.ts`
- [ ] `packages/api/src/routes/prompts/prompts.routes.ts`
  - GET /prompts, POST /prompts, GET /prompts/:id, PATCH /prompts/:id, POST /prompts/:id/versions, DELETE /prompts/:id
- [ ] Register prompts routes in `server.ts`
- [ ] Unit tests: `tests/unit/prompt.service.test.ts`
- [ ] Run lint + tests

### 1.6 Web — Auth UI

- [ ] Install web deps
- [ ] `packages/web/src/api/client.ts` — Axios instance with base URL + auth interceptor
- [ ] `packages/web/src/api/endpoints/auth.ts`
- [ ] `packages/web/src/stores/authStore.ts` — Zustand (token, user, login/logout actions)
- [ ] `packages/web/src/components/features/auth/LoginForm.tsx` + `.css`
- [ ] `packages/web/src/components/features/auth/AuthGuard.tsx`
- [ ] `packages/web/src/pages/LoginPage.tsx`
- [ ] `packages/web/src/components/layout/AppShell.tsx` + `.css`
- [ ] `packages/web/src/components/layout/Sidebar.tsx` + `.css`
- [ ] `packages/web/src/components/layout/TopNav.tsx` + `.css`
- [ ] Update `App.tsx` with React Router routes + AuthGuard
- [ ] Run `pnpm --filter @prompttrack/web lint` and `pnpm --filter @prompttrack/web test:unit`

### 1.7 Web — Prompts UI

- [ ] `packages/web/src/api/endpoints/prompts.ts`
- [ ] `packages/web/src/hooks/usePrompts.ts`
- [ ] `packages/web/src/components/features/prompts/PromptCard.tsx` + `.css`
- [ ] `packages/web/src/components/features/prompts/PromptList.tsx` + `.css`
- [ ] `packages/web/src/components/features/prompts/PromptEditor.tsx` + `.css`
- [ ] `packages/web/src/pages/PromptsPage.tsx`
- [ ] `packages/web/src/pages/PromptDetailPage.tsx`
- [ ] `packages/web/src/pages/DashboardPage.tsx`
- [ ] Run lint + tests

**Phase 1 complete when**: Can register, login, create a prompt, view prompt list — all working front-to-back.

---

## Phase 2 — Chain Canvas

**Goal**: Build a DAG chain, connect prompt nodes, preview serialised output

### 2.1 API — Chains

- [ ] Install `nanoid` in API
- [ ] `packages/api/src/repositories/chain.repository.ts`
- [ ] `packages/api/src/repositories/chain-version.repository.ts`
- [ ] `packages/api/src/services/chain.service.ts`
- [ ] `packages/api/src/services/chain-serialiser.service.ts` — topological sort (Kahn's), variable substitution
- [ ] `packages/api/src/services/chain-variables.service.ts`
- [ ] `packages/api/src/lib/templateParser.ts` — `{{variable}}` extraction + substitution
- [ ] `packages/api/src/routes/chains/chains.schemas.ts`
- [ ] `packages/api/src/routes/chains/chains.routes.ts`
- [ ] Unit tests: `chain-serialiser.service.test.ts`, `chain-variables.service.test.ts`, `templateParser.test.ts`
- [ ] Run lint + tests

### 2.2 Web — Chain Canvas UI

- [ ] Install `reactflow` in web
- [ ] `packages/web/src/lib/dagValidator.ts` — client-side cycle detection
- [ ] `packages/web/src/lib/templateParser.ts`
- [ ] `packages/web/src/api/endpoints/chains.ts`
- [ ] `packages/web/src/hooks/useChain.ts`, `useChainVariables.ts`
- [ ] `packages/web/src/components/features/chains/ChainCanvas.tsx` + `.css`
- [ ] `packages/web/src/components/features/chains/ChainNode.tsx` + `.css`
- [ ] `packages/web/src/components/features/chains/ChainEdge.tsx`
- [ ] `packages/web/src/components/features/chains/AddNodeModal.tsx` + `.css`
- [ ] `packages/web/src/components/features/chains/ChainVariableForm.tsx` + `.css`
- [ ] `packages/web/src/components/features/chains/ChainSerialiserPreview.tsx` + `.css`
- [ ] `packages/web/src/pages/ChainsPage.tsx`
- [ ] `packages/web/src/pages/ChainDetailPage.tsx`
- [ ] Unit tests: `dagValidator.test.ts`, `templateParser.test.ts`
- [ ] Run lint + tests

**Phase 2 complete when**: Can create a chain, add linked prompt nodes, draw edges, preview serialised output.

---

## Phase 3 — Vector Search

- [ ] Add `EMBEDDING_PROVIDER`, `OPENAI_API_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` to env
- [ ] `packages/api/src/services/embedding.service.ts` — EmbeddingProvider interface, Ollama + OpenAI impls
- [ ] `packages/api/src/services/vector-search.service.ts` — raw SQL via Prisma `$queryRaw`
- [ ] `packages/api/src/routes/search/search.routes.ts`
- [ ] Trigger embedding async after prompt version save, chain version save
- [ ] `packages/web/src/api/endpoints/search.ts`
- [ ] `packages/web/src/hooks/useVectorSearch.ts`
- [ ] `packages/web/src/components/features/search/SemanticSearchBar.tsx` + `.css`
- [ ] `packages/web/src/components/features/search/SearchResultCard.tsx` + `.css`
- [ ] `packages/web/src/pages/SearchPage.tsx`
- [ ] Unit tests: `embedding.service.test.ts`
- [ ] Run lint + tests

---

## Phase 4 — Polish

- [ ] Collections API + UI
- [ ] Version diff view (`VersionDiffView.tsx`)
- [ ] Prompt hierarchy tree (`PromptHierarchyTree.tsx`)
- [ ] Environment promotion (PATCH /prompts/:id/promote)
- [ ] Audit log
- [ ] `GET /prompts/tree` endpoint
- [ ] `GET /prompts/:id/versions/:num/diff` endpoint
- [ ] LLM execution (`POST /chains/:id/execute`)

---

## Progress Log

| Date       | Phase   | What was done                                                                                                       |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| 2026-03-05 | Plan    | Initial plan written, project scaffolded                                                                            |
| 2026-03-05 | 1.1–1.7 | Phase 1 complete — DB schema, auth API, prompts API, web auth UI, web prompts UI, routing, all lint + tests passing |

---

## Known Divergences from Design Doc

1. **Existing schema.prisma** had simplified model (no PromptVersion, no DAG). Will be replaced in Phase 1.1.
2. **Existing env.ts** validates a subset of env vars. Will be extended as phases progress.
3. **Team/TeamMember models** in original schema are not in design doc and will be dropped.
