# PromptTrack — LLM Prompt Management System

## Technical Design Document v1.2

> **Purpose**: This document is the authoritative specification for PromptTrack. It is intended to be consumed directly by a coding agent. Implement exactly as specified. If a conflict or ambiguity is detected, halt and raise it before proceeding. Do not make architectural decisions not covered here without flagging them first.

---

## 1. Product Overview

**PromptTrack** is a personal, locally-run prompt library and context reconstruction tool for agent-assisted software development. The primary user is a developer working with AI coding agents (e.g. Claude Code) who needs a proper authoring environment for prompts, a versioned history of what has been tried, and a fast way to reconstruct context mid-session when an agent's context window runs out.

It is **not** a team SaaS product. It runs locally via Docker Compose and is accessed through a browser on the same machine.

### The Problem It Solves

Writing prompts in a terminal is painful. Storing them in Word documents loses history. When an agent's context resets mid-session, reconstructing what was decided and why is slow and error-prone. PromptTrack provides:

- A decent **authoring environment** for writing and organising prompts — WYSIWYG, versioned, searchable
- **Prompt chains** that assemble reusable context blocks into a single serialised output, ready to paste back into an agent session
- A full **version history** so you can always recover what worked

### Core Capabilities

- Write prompts in a **WYSIWYG Markdown editor** (headings, subheadings, bullets, bold, italic, code — stored as Markdown text)
- Organise prompts in a hierarchy tree (prompts with labelled child prompts)
- Build **prompt chains** as Directed Acyclic Graphs (DAGs) on a drag-and-drop canvas
- Serialise chains to an ordered messages array; copy the output and paste it into an agent session
- Prompt nodes are **linked** (live reference) or **copied** (forked snapshot) into chains
- **Vector search** over individual prompts and chains
- Pluggable embedding provider (OpenAI in cloud, Ollama locally)
- **Postgres + pgvector** as the single database — relational data and vectors in one store
- Authentication: username/password (single local user in practice)
- Full version history per prompt

### Deliberately Out of Scope (for now)

- `{{variable}}` template injection — deferred
- CI/CD pipeline integration
- Cloud hosting or multi-user team features
- Environment promotion workflow

---

## 2. Technology Stack

### 2.1 Frontend

| Concern       | Choice                                                                     |
| ------------- | -------------------------------------------------------------------------- |
| Framework     | **React 18** + TypeScript                                                  |
| Build Tool    | **Vite 5**                                                                 |
| Routing       | **React Router v6**                                                        |
| Client State  | **Zustand**                                                                |
| Server State  | **TanStack Query v5**                                                      |
| UI Components | **shadcn/ui** (Radix primitives)                                           |
| Styling       | **Tailwind CSS v3** — in dedicated `.css` files, never inline or in `.tsx` |
| DAG Canvas    | **React Flow v11**                                                         |
| Forms         | **React Hook Form** + **Zod**                                              |
| Prompt Editor | **TipTap v2** (ProseMirror-based WYSIWYG, outputs Markdown)                |
| HTTP Client   | **Axios**                                                                  |
| Unit Testing  | **Vitest** + **React Testing Library**                                     |
| E2E Testing   | **Playwright**                                                             |
| Linting       | **ESLint** (flat config) + **Prettier**                                    |

### 2.2 Middle Tier

| Concern             | Choice                                               |
| ------------------- | ---------------------------------------------------- |
| Runtime             | **Node.js 20 LTS**                                   |
| Framework           | **Fastify v4**                                       |
| Language            | **TypeScript 5** (strict mode)                       |
| Validation          | **Zod** (shared with frontend via `packages/shared`) |
| ORM                 | **Prisma 5**                                         |
| Auth                | **JWT** (15m access token) + **refresh tokens** (7d) |
| Password Hashing    | **argon2**                                           |
| Logging             | **pino**                                             |
| API Docs            | **@fastify/swagger** (OpenAPI 3.1)                   |
| Unit Testing        | **Vitest**                                           |
| Integration Testing | **Supertest** + **Vitest**                           |
| Linting             | **ESLint** + **Prettier** (shared root config)       |

### 2.3 Database

| Concern           | Choice                                                               |
| ----------------- | -------------------------------------------------------------------- |
| Primary Store     | **PostgreSQL 16**                                                    |
| Vector Extension  | **pgvector**                                                         |
| Schema Migrations | **Prisma Migrate**                                                   |
| Local Dev         | Docker Compose single `postgres` service with pgvector pre-installed |

Use the official `pgvector/pgvector:pg16` Docker image — it ships with the extension pre-installed. Run `CREATE EXTENSION IF NOT EXISTS vector;` in the initial migration.

### 2.4 Infrastructure & Tooling

| Concern            | Choice                                                      |
| ------------------ | ----------------------------------------------------------- |
| Monorepo           | **pnpm workspaces**                                         |
| CI/CD              | **GitHub Actions**                                          |
| Containerisation   | **Docker** + **Docker Compose**                             |
| Git Hooks          | **Husky** + **lint-staged**                                 |
| Commit Convention  | **Conventional Commits** enforced by **commitlint**         |
| Versioning         | **Changesets**                                              |
| Secret Management  | `.env` files (dev) · GitHub Secrets (CI) · AWS SSM (prod)   |
| Dependency Updates | **Renovate Bot**                                            |
| IDE                | **VSCode** with workspace config and recommended extensions |

---

## 3. Architectural Patterns

### 3.1 Backend: Services + Repositories

All backend logic follows a strict three-layer architecture. This is **enforced** — no exceptions.

```
Route Handler  →  Service  →  Repository  →  Prisma Client
```

- **Route handlers** (`routes/`): parse and validate HTTP input, call one service method, return HTTP response. Zero business logic.
- **Services** (`services/`): orchestrate business logic, call one or more repositories, never import Prisma directly.
- **Repositories** (`repositories/`): own all database queries. Only layer permitted to import `PrismaClient`. Return plain objects (not Prisma model instances).

**Example:**

```typescript
// route handler — thin
async function createPromptHandler(req, reply) {
  const prompt = await promptService.createPrompt(req.user.id, req.body);
  return reply.code(201).send(prompt);
}

// service — logic lives here
async function createPrompt(
  userId: string,
  input: CreatePromptInput
): Promise<Prompt> {
  const slug = generateSlug(input.name);
  await assertSlugUnique(slug); // calls promptRepository
  return promptRepository.create({ ...input, slug, createdBy: userId });
}

// repository — all DB access
async function create(data: PromptCreateData): Promise<Prompt> {
  return prisma.prompt.create({ data });
}
```

### 3.2 Frontend: Feature Modules

```
Page  →  Feature Component  →  Hook  →  API Client
```

- **Pages** (`pages/`): routing shell only, compose feature components.
- **Feature components** (`components/features/`): UI logic, use hooks for data.
- **Hooks** (`hooks/`): all TanStack Query calls and Zustand selectors live here. No fetch calls in components.
- **API client** (`api/`): Axios wrapper functions. No business logic.

### 3.3 CSS Separation (Enforced)

- All styles must be written in dedicated `.css` files co-located with their component.
- **No** Tailwind classes in `.tsx` files — import a CSS module or a co-located `.css` file.
- **No** inline `style={{}}` props except for dynamic values that cannot be expressed in CSS (e.g. computed canvas coordinates).
- Tailwind utilities are used inside `.css` files via `@apply`.

**Example:**

```
components/features/prompts/PromptCard.tsx
components/features/prompts/PromptCard.css   ← all styles here
```

```css
/* PromptCard.css */
.prompt-card {
  @apply rounded-lg border border-gray-200 p-4 hover:shadow-md;
}
.prompt-card__title {
  @apply text-sm font-semibold text-gray-900;
}
```

```tsx
/* PromptCard.tsx */
import "./PromptCard.css";
export function PromptCard({ prompt }: Props) {
  return (
    <div className="prompt-card">
      <h3 className="prompt-card__title">{prompt.name}</h3>
    </div>
  );
}
```

### 3.4 File Size Limit (Enforced)

- **All `.ts` and `.tsx` files** (including test files) must not exceed **200 lines**.
- This is enforced by a **custom ESLint rule** (`max-lines: ["error", 200]`) applied globally.
- It is additionally enforced by a **unit test** in each package that scans all source files and fails if any exceed the limit (see Section 12.4).
- When splitting is needed, prefer splitting by logical boundary: sub-services, sub-repositories, smaller components, or custom hooks.

---

## 4. Repository Structure

```
prompttrack/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd-staging.yml
│   │   └── cd-production.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── .husky/
│   ├── pre-commit                  # lint-staged
│   └── commit-msg                  # commitlint
│
├── .vscode/
│   ├── extensions.json             # Recommended extensions
│   └── settings.json               # Workspace formatting + linting settings
│
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── schemas/
│   │   │   │   ├── prompt.schema.ts
│   │   │   │   ├── chain.schema.ts
│   │   │   │   ├── collection.schema.ts
│   │   │   │   └── user.schema.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── roles.ts
│   │   │   │   └── environments.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── env.ts              # Zod-validated env vars
│   │   │   │   └── prisma.ts           # PrismaClient singleton
│   │   │   ├── routes/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   └── auth.schemas.ts
│   │   │   │   ├── prompts/
│   │   │   │   │   ├── prompts.routes.ts
│   │   │   │   │   └── prompts.schemas.ts
│   │   │   │   ├── chains/
│   │   │   │   │   ├── chains.routes.ts
│   │   │   │   │   └── chains.schemas.ts
│   │   │   │   ├── collections/
│   │   │   │   │   ├── collections.routes.ts
│   │   │   │   │   └── collections.schemas.ts
│   │   │   │   ├── search/
│   │   │   │   │   ├── search.routes.ts
│   │   │   │   │   └── search.schemas.ts
│   │   │   │   └── users/
│   │   │   │       ├── users.routes.ts
│   │   │   │       └── users.schemas.ts
│   │   │   ├── services/
│   │   │   │   ├── prompt.service.ts
│   │   │   │   ├── prompt-version.service.ts
│   │   │   │   ├── chain.service.ts
│   │   │   │   ├── chain-serialiser.service.ts
│   │   │   │   ├── chain-variables.service.ts
│   │   │   │   ├── embedding.service.ts
│   │   │   │   ├── vector-search.service.ts
│   │   │   │   ├── llm.service.ts
│   │   │   │   └── auth.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── prompt.repository.ts
│   │   │   │   ├── prompt-version.repository.ts
│   │   │   │   ├── chain.repository.ts
│   │   │   │   ├── chain-version.repository.ts
│   │   │   │   ├── collection.repository.ts
│   │   │   │   ├── audit.repository.ts
│   │   │   │   └── user.repository.ts
│   │   │   ├── plugins/
│   │   │   │   ├── auth.plugin.ts
│   │   │   │   ├── cors.plugin.ts
│   │   │   │   └── swagger.plugin.ts
│   │   │   ├── middleware/
│   │   │   │   ├── errorHandler.ts
│   │   │   │   └── rbac.ts
│   │   │   └── server.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── chain-serialiser.service.test.ts
│   │   │   │   ├── chain-variables.service.test.ts
│   │   │   │   ├── embedding.service.test.ts
│   │   │   │   └── file-size.test.ts       # Enforces 200-line limit
│   │   │   └── integration/
│   │   │       ├── setup.ts
│   │   │       ├── prompts.routes.test.ts
│   │   │       ├── chains.routes.test.ts
│   │   │       └── search.routes.test.ts
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/                    # shadcn/ui base components
│       │   │   ├── layout/
│       │   │   │   ├── AppShell.tsx
│       │   │   │   ├── AppShell.css
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   ├── Sidebar.css
│       │   │   │   ├── TopNav.tsx
│       │   │   │   └── TopNav.css
│       │   │   └── features/
│       │   │       ├── prompts/
│       │   │       │   ├── PromptEditor.tsx
│       │   │       │   ├── PromptEditor.css
│       │   │       │   ├── PromptCard.tsx
│       │   │       │   ├── PromptCard.css
│       │   │       │   ├── PromptList.tsx
│       │   │       │   ├── PromptList.css
│       │   │       │   ├── PromptHierarchyTree.tsx
│       │   │       │   ├── PromptHierarchyTree.css
│       │   │       │   ├── PromptTestPanel.tsx
│       │   │       │   ├── PromptTestPanel.css
│       │   │       │   ├── VersionDiffView.tsx
│       │   │       │   └── VersionDiffView.css
│       │   │       ├── chains/
│       │   │       │   ├── ChainCanvas.tsx
│       │   │       │   ├── ChainCanvas.css
│       │   │       │   ├── ChainNode.tsx
│       │   │       │   ├── ChainNode.css
│       │   │       │   ├── ChainEdge.tsx
│       │   │       │   ├── ChainVariableForm.tsx
│       │   │       │   ├── ChainVariableForm.css
│       │   │       │   ├── AddNodeModal.tsx
│       │   │       │   ├── AddNodeModal.css
│       │   │       │   ├── ChainSerialiserPreview.tsx
│       │   │       │   └── ChainSerialiserPreview.css
│       │   │       ├── search/
│       │   │       │   ├── SemanticSearchBar.tsx
│       │   │       │   ├── SemanticSearchBar.css
│       │   │       │   ├── SearchResultCard.tsx
│       │   │       │   └── SearchResultCard.css
│       │   │       └── auth/
│       │   │           ├── LoginForm.tsx
│       │   │           ├── LoginForm.css
│       │   │           └── AuthGuard.tsx
│       │   ├── pages/
│       │   │   ├── DashboardPage.tsx
│       │   │   ├── PromptsPage.tsx
│       │   │   ├── PromptDetailPage.tsx
│       │   │   ├── ChainsPage.tsx
│       │   │   ├── ChainDetailPage.tsx
│       │   │   ├── SearchPage.tsx
│       │   │   ├── CollectionsPage.tsx
│       │   │   ├── SettingsPage.tsx
│       │   │   └── LoginPage.tsx
│       │   ├── hooks/
│       │   │   ├── usePrompts.ts
│       │   │   ├── usePromptVersions.ts
│       │   │   ├── useChain.ts
│       │   │   ├── useChainVariables.ts
│       │   │   ├── useVectorSearch.ts
│       │   │   ├── useTemplateVariables.ts
│       │   │   └── useAuth.ts
│       │   ├── stores/
│       │   │   ├── authStore.ts
│       │   │   └── uiStore.ts
│       │   ├── api/
│       │   │   ├── client.ts
│       │   │   └── endpoints/
│       │   │       ├── prompts.ts
│       │   │       ├── chains.ts
│       │   │       ├── search.ts
│       │   │       └── auth.ts
│       │   ├── lib/
│       │   │   ├── templateParser.ts
│       │   │   └── dagValidator.ts
│       │   ├── styles/
│       │   │   ├── globals.css            # Tailwind base + CSS variables
│       │   │   └── tokens.css             # Design tokens (colours, spacing)
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── tests/
│       │   ├── unit/
│       │   │   ├── templateParser.test.ts
│       │   │   ├── dagValidator.test.ts
│       │   │   ├── css-separation.test.ts # Enforces CSS in .css files
│       │   │   └── file-size.test.ts      # Enforces 200-line limit
│       │   └── e2e/
│       │       ├── auth.spec.ts
│       │       ├── prompts.spec.ts
│       │       └── chains.spec.ts
│       ├── public/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── playwright.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml
├── docker-compose.test.yml
├── eslint.config.js                   # Root flat config — shared by all packages
├── .prettierrc
├── commitlint.config.js
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .changeset/
└── renovate.json
```

---

## 5. Database Schema (Prisma)

File: `packages/api/prisma/schema.prisma`

The initial migration must run `CREATE EXTENSION IF NOT EXISTS vector;` before any table creation. Add this as a raw SQL step in the first migration file.

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

enum Role {
  viewer
  editor
  admin
}

enum Environment {
  draft
  review
  staging
  production
}

enum PromptRole {
  system
  user
  assistant
}

enum AuditAction {
  create
  update
  delete
  promote
  execute
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(editor)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  prompts        Prompt[]
  chains         Chain[]
  promptVersions PromptVersion[]
  chainVersions  ChainVersion[]
  auditLogs      AuditLog[]
}

model Collection {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  prompts Prompt[]
  chains  Chain[]
}

model Prompt {
  id             String      @id @default(cuid())
  name           String
  slug           String      @unique
  description    String?
  tags           String[]
  environment    Environment @default(draft)
  currentVersion Int         @default(1)
  isArchived     Boolean     @default(false)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  parentId     String?
  parent       Prompt?  @relation("PromptHierarchy", fields: [parentId], references: [id])
  children     Prompt[] @relation("PromptHierarchy")

  collectionId String?
  collection   Collection? @relation(fields: [collectionId], references: [id])

  createdBy String
  creator   User   @relation(fields: [createdBy], references: [id])

  versions   PromptVersion[]
  chainNodes ChainNode[]
  auditLogs  AuditLog[]
}

model PromptVersion {
  id            String     @id @default(cuid())
  versionNumber Int
  content       String
  role          PromptRole @default(user)
  changelog     String?
  createdAt     DateTime   @default(now())

  // pgvector embedding (1536 dims for OpenAI, 768 for nomic-embed-text)
  embedding     Unsupported("vector(1536)")?

  // Model parameters stored as JSON
  modelParameters Json @default("{}")

  promptId  String
  prompt    Prompt @relation(fields: [promptId], references: [id], onDelete: Cascade)
  createdBy String
  creator   User   @relation(fields: [createdBy], references: [id])

  variables TemplateVariable[]

  @@unique([promptId, versionNumber])
}

model TemplateVariable {
  id           String  @id @default(cuid())
  name         String
  description  String?
  required     Boolean @default(true)
  defaultValue String?

  promptVersionId String
  promptVersion   PromptVersion @relation(fields: [promptVersionId], references: [id], onDelete: Cascade)
}

model Chain {
  id             String      @id @default(cuid())
  name           String
  slug           String      @unique
  description    String?
  tags           String[]
  currentVersion Int         @default(1)
  isArchived     Boolean     @default(false)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  collectionId String?
  collection   Collection? @relation(fields: [collectionId], references: [id])

  createdBy String
  creator   User   @relation(fields: [createdBy], references: [id])

  versions  ChainVersion[]
  auditLogs AuditLog[]
}

model ChainVersion {
  id            String   @id @default(cuid())
  versionNumber Int
  changelog     String?
  createdAt     DateTime @default(now())

  // pgvector embedding of concatenated node content
  embedding Unsupported("vector(1536)")?

  chainId   String
  chain     Chain  @relation(fields: [chainId], references: [id], onDelete: Cascade)
  createdBy String
  creator   User   @relation(fields: [createdBy], references: [id])

  nodes ChainNode[]
  edges ChainEdge[]

  @@unique([chainId, versionNumber])
}

enum ChainNodeRefType {
  link
  copy
}

model ChainNode {
  id                  String           @id @default(cuid())
  nodeId              String           // Stable ID within the DAG (nanoid)
  label               String?
  refType             ChainNodeRefType
  snapshotContent     String?          // Populated when refType=copy
  promptVersionNumber Int
  positionX           Float
  positionY           Float

  chainVersionId String
  chainVersion   ChainVersion @relation(fields: [chainVersionId], references: [id], onDelete: Cascade)

  promptId String
  prompt   Prompt @relation(fields: [promptId], references: [id])

  sourceEdges ChainEdge[] @relation("EdgeSource")
  targetEdges ChainEdge[] @relation("EdgeTarget")
}

model ChainEdge {
  id     String  @id @default(cuid())
  edgeId String  // Stable ID within the DAG
  label  String?

  chainVersionId String
  chainVersion   ChainVersion @relation(fields: [chainVersionId], references: [id], onDelete: Cascade)

  sourceNodeId String
  sourceNode   ChainNode @relation("EdgeSource", fields: [sourceNodeId], references: [id])

  targetNodeId String
  targetNode   ChainNode @relation("EdgeTarget", fields: [targetNodeId], references: [id])
}

model AuditLog {
  id         String      @id @default(cuid())
  entityType String
  action     AuditAction
  diff       Json?
  ipAddress  String?
  createdAt  DateTime    @default(now())

  userId   String
  user     User    @relation(fields: [userId], references: [id])

  promptId String?
  prompt   Prompt? @relation(fields: [promptId], references: [id])

  chainId  String?
  chain    Chain?  @relation(fields: [chainId], references: [id])
}
```

### Vector Index

Add the following raw SQL to the migration after table creation:

```sql
CREATE INDEX prompt_version_embedding_idx
  ON "PromptVersion"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX chain_version_embedding_idx
  ON "ChainVersion"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 6. Shared Zod Schemas

File location: `packages/shared/src/schemas/`

Zod schemas are the source of truth for all request/response validation on both frontend and backend. TypeScript types are derived exclusively via `z.infer<>` — never hand-written.

```typescript
// prompt.schema.ts
export const PromptRoleSchema = z.enum(["system", "user", "assistant"]);
export const EnvironmentSchema = z.enum([
  "draft",
  "review",
  "staging",
  "production",
]);

export const TemplateVariableSchema = z.object({
  name: z.string().regex(/^[a-z_][a-z0-9_]*$/),
  description: z.string().optional(),
  required: z.boolean().default(true),
  defaultValue: z.string().optional(),
});

export const CreatePromptSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).default([]),
  parentId: z.string().nullable().optional(),
  collectionId: z.string().nullable().optional(),
  content: z.string().min(1),
  role: PromptRoleSchema.default("user"),
  variables: z.array(TemplateVariableSchema).default([]),
  modelParameters: z
    .object({
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().int().positive().default(1000),
      topP: z.number().min(0).max(1).optional(),
    })
    .default({}),
});

export const CreatePromptVersionSchema = z.object({
  content: z.string().min(1),
  role: PromptRoleSchema.default("user"),
  variables: z.array(TemplateVariableSchema).default([]),
  modelParameters: z
    .object({
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().int().positive().default(1000),
      topP: z.number().min(0).max(1).optional(),
    })
    .default({}),
  changelog: z.string().optional(),
});

export type CreatePromptInput = z.infer<typeof CreatePromptSchema>;
export type CreatePromptVersionInput = z.infer<
  typeof CreatePromptVersionSchema
>;
```

```typescript
// chain.schema.ts
export const ChainNodeRefTypeSchema = z.enum(["link", "copy"]);

export const ChainNodeInputSchema = z.object({
  nodeId: z.string(),
  promptId: z.string(),
  promptVersionNumber: z.number().int().positive(),
  refType: ChainNodeRefTypeSchema,
  label: z.string().optional(),
  positionX: z.number(),
  positionY: z.number(),
});

export const ChainEdgeInputSchema = z.object({
  edgeId: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  label: z.string().optional(),
});

export const CreateChainVersionSchema = z.object({
  nodes: z.array(ChainNodeInputSchema).min(1),
  edges: z.array(ChainEdgeInputSchema).default([]),
  changelog: z.string().optional(),
});

export const SerialiseChainSchema = z.object({
  variables: z.record(z.string(), z.string()).default({}),
});

export type ChainNodeInput = z.infer<typeof ChainNodeInputSchema>;
export type ChainEdgeInput = z.infer<typeof ChainEdgeInputSchema>;
export type SerialiseChainInput = z.infer<typeof SerialiseChainSchema>;
```

---

## 7. Chain Serialisation

Service: `packages/api/src/services/chain-serialiser.service.ts`

### Algorithm

1. Load all `ChainNode` and `ChainEdge` records for the given `ChainVersion`
2. **Topological sort** using Kahn's algorithm. If the graph contains a cycle, throw `ChainCycleError` — this is a safety guard; cycles must also be blocked at save time by the frontend `dagValidator.ts`
3. For each node in topological order:
   - `refType === 'link'`: load the prompt's `currentVersion` content from the repository
   - `refType === 'copy'`: use `snapshotContent` stored on the node
4. **Variable substitution**: replace all `{{variable_name}}` tokens using the provided `variableMap`. Collect all unresolved required variables and throw `MissingVariableError` listing every missing name
5. Return the serialised output:

```typescript
export type SerialiserOutput = {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  contextString: string; // Full concatenated string for display/copy
  tokenEstimate: number; // chars / 4
  unresolvedVariables: string[];
};
```

### Variable Aggregation

`GET /api/chains/:id/variables` calls `chain-variables.service.ts` which:

1. Loads all nodes for the current chain version
2. For linked nodes: reads variables from the live prompt's current version
3. For copied nodes: reads variables from `snapshotContent` via `templateParser.ts`
4. Returns the **union** of all variable names, deduped by name
5. Duplicate variable names across nodes are intentional — they share one input at runtime

---

## 8. Vector Search

### Storage

Embeddings are stored as `vector(1536)` columns directly on `PromptVersion` and `ChainVersion` tables using the pgvector extension. No separate vector database is required.

### Embedding Service Interface

```typescript
// packages/api/src/services/embedding.service.ts

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  readonly dimensions: number;
  readonly modelName: string;
}

export function resolveEmbeddingProvider(env: Env): EmbeddingProvider {
  if (env.EMBEDDING_PROVIDER === "ollama")
    return new OllamaEmbeddingProvider(env);
  return new OpenAIEmbeddingProvider(env);
}
```

Embedding is triggered **asynchronously** after every prompt version save and every chain version save. It must not block the HTTP response.

### Vector Search Queries (raw SQL via Prisma `$queryRaw`)

**Prompt similarity search:**

```sql
SELECT p.id, p.name, p.slug, p.tags, pv.content,
       1 - (pv.embedding <=> $1::vector) AS score
FROM "PromptVersion" pv
JOIN "Prompt" p ON pv."promptId" = p.id
WHERE pv."versionNumber" = p."currentVersion"
  AND p."isArchived" = false
  AND ($2::text[] IS NULL OR p.tags && $2)
ORDER BY pv.embedding <=> $1::vector
LIMIT $3;
```

**Chain search (chains containing a matching prompt):**

```sql
SELECT DISTINCT c.id, c.name, c.slug, c.tags,
       1 - (cv.embedding <=> $1::vector) AS score
FROM "ChainVersion" cv
JOIN "Chain" c ON cv."chainId" = c.id
WHERE cv."versionNumber" = c."currentVersion"
  AND c."isArchived" = false
ORDER BY cv.embedding <=> $1::vector
LIMIT $3;
```

### Search API

`POST /api/search`

```typescript
// Request body (validated by Zod)
{
  query: string;
  mode: 'prompts' | 'chains' | 'suggestions';
  chainId?: string;        // Required when mode='suggestions'
  filters?: {
    tags?: string[];
    environment?: string;
    collectionId?: string;
  };
  limit?: number;          // Default 10, max 50
}

// Response
{
  results: Array<{
    type: 'prompt' | 'chain';
    id: string;
    name: string;
    slug: string;
    score: number;
    snippet: string;       // First 200 chars of current version content
    tags: string[];
  }>;
}
```

---

## 9. API Routes

All routes prefixed `/api`. Protected routes require `Authorization: Bearer <jwt>`.

### Auth

| Method | Path             | Auth      | Description                               |
| ------ | ---------------- | --------- | ----------------------------------------- |
| POST   | `/auth/register` | Public    | Create account (first user becomes admin) |
| POST   | `/auth/login`    | Public    | Returns `{ accessToken, refreshToken }`   |
| POST   | `/auth/refresh`  | Public    | Exchange refresh token                    |
| POST   | `/auth/logout`   | Protected | Invalidate refresh token                  |

### Prompts

| Method | Path                              | RBAC    | Description                          |
| ------ | --------------------------------- | ------- | ------------------------------------ |
| GET    | `/prompts`                        | viewer+ | List prompts (paginated, filterable) |
| GET    | `/prompts/tree`                   | viewer+ | Full hierarchy tree                  |
| POST   | `/prompts`                        | editor+ | Create prompt                        |
| GET    | `/prompts/:id`                    | viewer+ | Get prompt with all versions         |
| PATCH  | `/prompts/:id`                    | editor+ | Update metadata                      |
| POST   | `/prompts/:id/versions`           | editor+ | Save new version                     |
| POST   | `/prompts/:id/promote`            | editor+ | Promote environment                  |
| DELETE | `/prompts/:id`                    | admin   | Archive (soft delete)                |
| GET    | `/prompts/:id/versions/:num/diff` | viewer+ | Diff against previous version        |

### Chains

| Method | Path                    | RBAC    | Description                       |
| ------ | ----------------------- | ------- | --------------------------------- |
| GET    | `/chains`               | viewer+ | List chains                       |
| POST   | `/chains`               | editor+ | Create chain                      |
| GET    | `/chains/:id`           | viewer+ | Get chain with current version    |
| PATCH  | `/chains/:id`           | editor+ | Update metadata                   |
| POST   | `/chains/:id/versions`  | editor+ | Save new graph version            |
| GET    | `/chains/:id/variables` | viewer+ | Aggregated variable list          |
| POST   | `/chains/:id/serialise` | viewer+ | Returns serialised context string |
| POST   | `/chains/:id/execute`   | editor+ | Execute against LLM               |
| DELETE | `/chains/:id`           | admin   | Archive                           |

### Collections

| Method | Path               | RBAC    | Description |
| ------ | ------------------ | ------- | ----------- |
| GET    | `/collections`     | viewer+ | List        |
| POST   | `/collections`     | editor+ | Create      |
| PATCH  | `/collections/:id` | editor+ | Update      |
| DELETE | `/collections/:id` | admin   | Delete      |

### Search & Users

| Method | Path         | RBAC    | Description        |
| ------ | ------------ | ------- | ------------------ |
| POST   | `/search`    | viewer+ | Vector search      |
| GET    | `/users`     | admin   | List users         |
| PATCH  | `/users/:id` | admin   | Update role/status |

---

## 10. Testing Strategy

### 10.1 Unit Tests

Covers pure logic with no external dependencies. Mock all repositories and external services.

| File                               | What is tested                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `chain-serialiser.service.test.ts` | Topological sort, variable substitution, cycle detection, missing variable errors |
| `chain-variables.service.test.ts`  | Variable aggregation, deduplication across nodes                                  |
| `embedding.service.test.ts`        | Provider resolution from env, correct provider called                             |
| `templateParser.test.ts`           | `{{var}}` extraction, substitution, edge cases                                    |
| `dagValidator.test.ts`             | Cycle detection, valid DAG acceptance                                             |

### 10.2 Integration Tests

Run against a real Postgres instance (Docker). Each test file:

- Uses `beforeAll` to run migrations against a test database
- Uses `beforeEach` to seed the minimum required data
- Uses `afterAll` to drop the test database
- Tests the full HTTP → route → service → repository → DB → response path

Test database name: `prompttrack_test` (configured via `DATABASE_URL_TEST` env var)

### 10.3 E2E Tests (Playwright)

Run against the full stack in Docker. Key scenarios:

- Register, login, access protected page
- Create a prompt with variables, save a second version, view diff
- Create a chain, add two nodes (one linked, one copied), draw an edge, preview serialised output
- Execute a chain with variable inputs
- Semantic search returning a relevant prompt

### 10.4 Structural Enforcement Tests

These tests are **mandatory** and run as part of the unit test suite in both `packages/api` and `packages/web`.

#### File Size Test (`tests/unit/file-size.test.ts`)

```typescript
import { globSync } from "glob";
import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";

const MAX_LINES = 200;
// Exclude: prisma schema, migrations, generated files, config files
const EXCLUDED = [
  "**/node_modules/**",
  "**/*.config.*",
  "**/prisma/migrations/**",
  "**/*.d.ts",
];

describe("File size enforcement", () => {
  it("no .ts or .tsx source file exceeds 200 lines", () => {
    const files = globSync("src/**/*.{ts,tsx}", { ignore: EXCLUDED });
    const violations: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf-8").split("\n").length;
      if (lines > MAX_LINES) violations.push(`${file}: ${lines} lines`);
    }
    expect(
      violations,
      `Files exceeding ${MAX_LINES} lines:\n${violations.join("\n")}`
    ).toHaveLength(0);
  });
});
```

#### CSS Separation Test (`packages/web/tests/unit/css-separation.test.ts`)

```typescript
import { globSync } from "glob";
import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";

const TAILWIND_CLASS_PATTERN =
  /className=["'`][^"'`]*(?:flex|grid|text-|bg-|p-|m-|w-|h-|border)[^"'`]*["'`]/;
const INLINE_STYLE_PATTERN =
  /style=\{\{(?!.*(?:left|top|transform|width|height))/;

describe("CSS separation enforcement", () => {
  it("no .tsx file contains Tailwind utility classes in className props", () => {
    const files = globSync("src/**/*.tsx", {
      ignore: ["**/node_modules/**", "**/ui/**"],
    });
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      if (TAILWIND_CLASS_PATTERN.test(content)) violations.push(file);
    }
    expect(
      violations,
      `TSX files with Tailwind classes (use .css files instead):\n${violations.join("\n")}`
    ).toHaveLength(0);
  });

  it("no .tsx file contains non-dynamic inline styles", () => {
    const files = globSync("src/**/*.tsx", { ignore: ["**/node_modules/**"] });
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      if (INLINE_STYLE_PATTERN.test(content)) violations.push(file);
    }
    expect(
      violations,
      `TSX files with non-dynamic inline styles:\n${violations.join("\n")}`
    ).toHaveLength(0);
  });
});
```

---

## 11. CI/CD Pipeline

### `ci.yml` — Every Pull Request

```yaml
# Runs all jobs in parallel where possible
jobs:
  lint-and-typecheck:
    - pnpm install
    - pnpm run lint          # ESLint across all packages
    - pnpm run typecheck     # tsc --noEmit across all packages

  unit-tests:
    - pnpm install
    - pnpm run test:unit --coverage
    - Fail if coverage < 80% lines or functions
    - Upload coverage artifact

  build:
    - pnpm install
    - pnpm run build

  integration-tests:
    needs: [build]
    - docker-compose -f docker-compose.test.yml up -d
    - pnpm run test:integration
    - docker-compose down

  e2e-tests:
    needs: [build]
    - docker-compose -f docker-compose.test.yml up -d
    - pnpm run test:e2e
    - docker-compose down
    - Upload Playwright report artifact
```

### `cd-staging.yml` — Merge to `main`

```
1. Run full CI suite
2. Build and tag Docker images
3. Push to GitHub Container Registry (ghcr.io)
4. Deploy to staging
5. Run smoke tests
6. Notify on failure
```

### `cd-production.yml` — Release tag `v*.*.*`

```
1. Verify tag matches Changeset version
2. Pull staging-validated images (do not rebuild)
3. Deploy to production
4. Run smoke tests
5. Create GitHub Release with auto-generated changelog
```

### Required GitHub Secrets

```
DATABASE_URL_STAGING
DATABASE_URL_PRODUCTION
JWT_SECRET_STAGING
JWT_SECRET_PRODUCTION
OPENAI_API_KEY
GHCR_TOKEN
SLACK_WEBHOOK_URL
```

---

## 12. VSCode Workspace Configuration

### `.vscode/extensions.json`

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "csstools.postcss",
    "styled-components.vscode-styled-components",
    "vitest.explorer",
    "ms-playwright.playwright",
    "GitHub.copilot",
    "eamodio.gitlens",
    "streetsidesoftware.code-spell-checker",
    "usernamehw.errorlens",
    "PKief.material-icon-theme",
    "ms-azuretools.vscode-docker"
  ]
}
```

### `.vscode/settings.json`

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.useFlatConfig": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "css.validate": true,
  "tailwindCSS.includeLanguages": { "css": "css" },
  "tailwindCSS.experimental.classRegex": [
    ["@apply\\s+([^;]*)", "([a-zA-Z0-9\\-:]+)"]
  ],
  "editor.rulers": [200],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  }
}
```

---

## 13. GitHub Templates

### `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Summary

<!-- What does this PR do? Why? -->

## Type of Change

- [ ] feat: new feature
- [ ] fix: bug fix
- [ ] refactor: no behaviour change
- [ ] test: adding/updating tests
- [ ] chore: tooling, deps, config

## Checklist

- [ ] All new files are under 200 lines
- [ ] CSS is in co-located `.css` files — no Tailwind in `.tsx`
- [ ] Logic is in services/repositories — not in route handlers or components
- [ ] Unit tests cover new logic
- [ ] Integration tests updated if routes changed
- [ ] `pnpm run lint` passes
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run test:unit` passes

## Related Issues

Closes #
```

### `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: Bug Report
about: Something is broken
labels: bug
---

**Describe the bug**

**To reproduce**

1.
2.

**Expected behaviour**

**Actual behaviour**

**Environment**

- Node version:
- Browser:
- Deployment: local / staging / production
```

### `.github/ISSUE_TEMPLATE/feature_request.md`

```markdown
---
name: Feature Request
about: New capability or improvement
labels: enhancement
---

**Problem this solves**

**Proposed solution**

**Alternatives considered**

**Out of scope**
```

---

## 14. Local Development

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: prompttrack
      POSTGRES_USER: prompttrack
      POSTGRES_PASSWORD: prompttrack
    volumes: ["postgres_data:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U prompttrack"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./packages/api
      target: development
    ports: ["3001:3001"]
    volumes: ["./packages/api/src:/app/src"]
    depends_on:
      postgres: { condition: service_healthy }
    env_file: ./packages/api/.env

  web:
    build:
      context: ./packages/web
      target: development
    ports: ["5173:5173"]
    volumes: ["./packages/web/src:/app/src"]
    depends_on: [api]
    environment:
      VITE_API_BASE_URL: http://localhost:3001/api

volumes:
  postgres_data:
```

### Quickstart (root `README.md`)

```bash
# Prerequisites: Node 20, pnpm 9, Docker Desktop

git clone https://github.com/your-org/prompttrack
cd prompttrack
pnpm install
cp packages/api/.env.example packages/api/.env  # then fill in values
docker-compose up -d
pnpm run db:migrate      # prisma migrate dev
pnpm run dev             # starts api + web in watch mode
```

---

## 15. Environment Variables

### `packages/api/.env.example`

```bash
PORT=3001
NODE_ENV=development

# Postgres
DATABASE_URL=postgresql://prompttrack:prompttrack@localhost:5432/prompttrack
DATABASE_URL_TEST=postgresql://prompttrack:prompttrack@localhost:5432/prompttrack_test

# Auth
JWT_SECRET=replace-with-long-random-string
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Embedding
EMBEDDING_PROVIDER=openai              # 'openai' | 'ollama'
OPENAI_API_KEY=sk-...
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=nomic-embed-text

# LLM Execution
DEFAULT_LLM_PROVIDER=openai            # 'openai' | 'anthropic' | 'ollama'
ANTHROPIC_API_KEY=sk-ant-...

# CORS
CORS_ORIGINS=http://localhost:5173
```

### `packages/web/.env.example`

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## 16. RBAC Matrix

| Action                              | viewer | editor | admin |
| ----------------------------------- | ------ | ------ | ----- |
| Read prompts / chains / collections | ✅     | ✅     | ✅    |
| Create / edit prompts               | ❌     | ✅     | ✅    |
| Create / edit chains                | ❌     | ✅     | ✅    |
| Promote environment                 | ❌     | ✅     | ✅    |
| Execute chains                      | ❌     | ✅     | ✅    |
| Archive (soft delete)               | ❌     | ❌     | ✅    |
| Manage users                        | ❌     | ❌     | ✅    |
| Manage collections                  | ❌     | ✅     | ✅    |

---

## 17. Coding Conventions

These are non-negotiable and enforced by ESLint, tests, or CI.

- **TypeScript strict mode** on all packages (`"strict": true`)
- **No `any`** — use `unknown` and narrow explicitly
- **No logic in route handlers** — delegate entirely to the service layer
- **No Prisma imports outside repositories** — services call repositories only
- **No Tailwind in `.tsx` files** — all styles in co-located `.css` files via `@apply`
- **No inline `style={{}}` props** except for runtime-computed dynamic values (e.g. canvas coordinates)
- **All `.ts` and `.tsx` files ≤ 200 lines** — enforced by ESLint `max-lines` and a unit test
- **Named exports everywhere** — no default exports except React components and Fastify plugins
- **Conventional Commits** — `feat:` `fix:` `chore:` `docs:` `test:` `refactor:` enforced by commitlint
- **Every PR must include tests** — coverage gates enforced in CI (80% lines + functions)
- **Repositories return plain objects** — never return Prisma model instances directly to services

### 17.1 Naming Conventions

These conventions are agreed across all layers. Follow them exactly — do not deviate without updating this document.

#### Spelling

Use **British English** throughout: `serialise`, `organise`, `colour`, etc.

#### Database Layer (Prisma)

| Thing                         | Convention                | Example                                        |
| ----------------------------- | ------------------------- | ---------------------------------------------- |
| Model names                   | PascalCase, singular      | `Prompt`, `ChainNode`, `PromptVersion`         |
| Table names (`@@map`)         | snake_case, plural        | `prompts`, `chain_nodes`, `prompt_versions`    |
| Model field names             | camelCase                 | `isArchived`, `currentVersion`, `createdBy`    |
| Column names (`@map`)         | snake_case                | `is_archived`, `current_version`, `created_by` |
| Enum names                    | PascalCase                | `Role`, `PromptRole`, `ChainNodeRefType`       |
| Enum values                   | lowercase                 | `draft`, `viewer`, `link`, `copy`              |
| Primary key                   | `id`, `cuid()`, `String`  | —                                              |
| Foreign key fields            | camelCase + `Id` suffix   | `userId`, `chainVersionId`, `promptId`         |
| Boolean flags                 | `is` prefix               | `isArchived`, `isActive`                       |
| Timestamps                    | `createdAt` / `updatedAt` | —                                              |
| Single-record relation fields | camelCase, singular       | `creator`, `prompt`, `chain`                   |
| Multi-record relation fields  | camelCase, plural         | `versions`, `nodes`, `edges`                   |

#### API Layer (Fastify)

**Files**

| Role           | Convention                 | Example                        |
| -------------- | -------------------------- | ------------------------------ |
| Repository     | `kebab-case.repository.ts` | `prompt-version.repository.ts` |
| Service        | `kebab-case.service.ts`    | `prompt.service.ts`            |
| Route handler  | `kebab-case.routes.ts`     | `prompts.routes.ts`            |
| Route schemas  | `kebab-case.schemas.ts`    | `prompts.schemas.ts`           |
| Fastify plugin | `kebab-case.plugin.ts`     | `auth.plugin.ts`               |
| Middleware     | `camelCase.ts`             | `errorHandler.ts`              |

**Code**

| Thing                               | Convention                                     | Example                                |
| ----------------------------------- | ---------------------------------------------- | -------------------------------------- |
| Variables / functions               | camelCase                                      | `promptService`, `buildAuthService`    |
| Classes / error types               | PascalCase                                     | `PromptError`, `AuthError`             |
| Repository exports                  | `const camelCase = { ... }` object             | `promptRepository`, `userRepository`   |
| Pure service exports                | `const camelCase = { ... }` object             | `promptService`                        |
| Framework-dependent service exports | `build[Name]Service(fastify)` factory          | `buildAuthService(fastify)`            |
| Repository internal input types     | `Create[Entity]Data`, `Update[Entity]Data`     | `CreatePromptData`, `UpdatePromptData` |
| Repository return types             | `[Entity]Record`                               | `PromptRecord`, `UserRecord`           |
| Error classes                       | PascalCase + `Error` suffix, with `statusCode` | `PromptError`, `AuthError`             |

> **Service pattern rule:** services that need Fastify framework dependencies (JWT, logger) use the factory pattern `build[Name]Service(fastify)`. Services that only depend on repositories are exported as plain const objects.

**URLs and HTTP**

| Thing                      | Convention            | Example                                       |
| -------------------------- | --------------------- | --------------------------------------------- |
| URL path segments          | lowercase, kebab-case | `/api/chain-versions`, `/api/prompt-versions` |
| Route parameters           | `:camelCase`          | `:id`, `:versionNumber`                       |
| JSON request/response keys | camelCase             | `isArchived`, `createdAt`, `versionNumber`    |
| Timestamps in responses    | ISO 8601 string       | `"2026-03-05T14:00:00.000Z"`                  |

#### Shared Schemas (Zod, `packages/shared`)

| Thing                            | Convention                                | Example                                  |
| -------------------------------- | ----------------------------------------- | ---------------------------------------- |
| Schema variables                 | PascalCase + `Schema` suffix              | `CreatePromptSchema`, `PromptRoleSchema` |
| Input types (write shapes)       | `z.infer<>` + PascalCase + `Input` suffix | `CreatePromptInput`, `UpdatePromptInput` |
| DTO types (read/resource shapes) | `z.infer<>` + PascalCase + `DTO` suffix   | `PromptDTO`, `UserDTO`, `ChainDTO`       |
| Transient response types         | `z.infer<>` + PascalCase (no suffix)      | `TokenResponse`                          |
| All types derived via            | `z.infer<typeof XSchema>` only            | —                                        |

#### Frontend Layer (React + Vite)

**Files and directories**

| Thing                   | Convention                           | Example                                   |
| ----------------------- | ------------------------------------ | ----------------------------------------- |
| Page files              | `PascalCase` + `Page.tsx`            | `PromptsPage.tsx`, `PromptDetailPage.tsx` |
| Feature component files | `PascalCase.tsx`                     | `PromptCard.tsx`, `PromptEditor.tsx`      |
| Layout component files  | `PascalCase.tsx`                     | `AppShell.tsx`, `TopNav.tsx`              |
| Hook files              | `use` + PascalCase + `.ts`           | `usePrompts.ts`, `useChain.ts`            |
| Store files             | camelCase + `Store.ts`               | `authStore.ts`                            |
| API endpoint files      | kebab-case `.ts` in `api/endpoints/` | `prompts.ts`, `chains.ts`                 |
| CSS files               | Same name as component               | `PromptCard.css`, `AppShell.css`          |
| Feature directories     | `features/kebab-case/`               | `features/prompts/`, `features/chains/`   |

**Code**

| Thing                | Convention                            | Example                              |
| -------------------- | ------------------------------------- | ------------------------------------ |
| Component exports    | Named PascalCase function             | `export function PromptCard()`       |
| Hook exports         | `use[PascalCase]`                     | `usePrompts`, `useCreatePrompt`      |
| Store exports        | `use[PascalCase]Store`                | `useAuthStore`                       |
| API endpoint exports | `[resource]Api` (plural, matches URL) | `promptsApi`, `chainsApi`, `authApi` |
| Props types          | Inline `type Props = { ... }`         | —                                    |
| Event handlers       | `handle[Event]`                       | `handleSubmit`, `handleLogout`       |

**CSS (BEM)**

| Level    | Pattern                                         | Example                                   |
| -------- | ----------------------------------------------- | ----------------------------------------- |
| Block    | `kebab-case` (component name lowercased)        | `prompt-card`, `app-shell`, `login-form`  |
| Element  | `block__element`                                | `prompt-card__name`, `app-shell__content` |
| Modifier | `block--modifier` or `block__element--modifier` | `prompt-card__env--draft`                 |

All Tailwind utility classes go in `.css` files via `@apply` only — never in `.tsx`.

---

## 18. WYSIWYG Prompt Editor

### 18.1 Library

Use **TipTap v2** (`@tiptap/react`, `@tiptap/starter-kit`). TipTap is a headless ProseMirror wrapper with a Markdown serialiser extension (`@tiptap/extension-markdown`). The stored value in the database is always **plain Markdown text** — TipTap serialises on save and parses on load.

Do not use CodeMirror 6 for prompt editing.

### 18.2 Permitted Formatting

Restrict the editor to the following extensions only:

| Format       | TipTap extension    |
| ------------ | ------------------- |
| Heading H1   | `Heading` (level 1) |
| Heading H2   | `Heading` (level 2) |
| Heading H3   | `Heading` (level 3) |
| Bold         | `Bold`              |
| Italic       | `Italic`            |
| Bullet list  | `BulletList`        |
| Ordered list | `OrderedList`       |
| Code inline  | `Code`              |
| Code block   | `CodeBlock`         |
| Hard break   | `HardBreak`         |

Do **not** enable: tables, images, links, strikethrough, task lists, or any other extension not listed above.

### 18.3 Toolbar

A minimal floating or fixed toolbar above the editor with buttons for each permitted format. BEM class: `prompt-editor-toolbar`. No third-party toolbar component — build it from TipTap's `editor.chain()` API.

### 18.4 Storage

- Prompt content is stored as Markdown text (same `content` column, no schema change)
- On save: `editor.storage.markdown.getMarkdown()` → send to API
- On load: `editor.commands.setContent(markdownContent)` — TipTap parses Markdown to ProseMirror nodes

### 18.5 Deferred

- `{{variable}}` inline chip decoration — do not implement yet
- Markdown preview toggle (WYSIWYG is the only mode)

---

## 19. Out of Scope for v1

Explicitly deferred — do not implement:

- OAuth / SSO (Google, GitHub)
- API key authentication for external app access
- npm SDK package
- Drag-and-drop re-parenting in hierarchy tree
- Conditional / branching chain execution
- Redis caching layer
- Multi-tenancy / workspace isolation
- Webhook triggers on environment promotion
- Prompt export (PDF/HTML)
- `{{variable}}` template injection
- Cloud hosting
