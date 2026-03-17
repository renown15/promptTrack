# AgentInsight — Design Document

> Feature for PromptTrack: real-time visibility into agent activity across a repo's code files.

---

## Purpose

When an AI coding agent is working in a repo, it's hard to see what it's touching, whether quality is holding, and whether it's heading in a safe direction. AgentInsight surfaces this by watching the filesystem, measuring insight metrics via a local LLM, and presenting everything as a live dashboard.

---

## Navigation

AgentInsight is a **dedicated page**, accessible from the sidebar tree under each project that has a directory set:

```
Sidebar tree
└── My Project
    ├── prompt-one
    ├── my-chain
    └── 🔍 Agent Insight        ← new leaf node, per project
```

Route: `/projects/:id/insights`

The node only appears when the collection has a `directory` set. Clicking it navigates to the full AgentInsight page for that project.

---

## Why No Database

File metadata (name, type, line count, mtime) comes directly from the filesystem via `stat()` — storing it in the DB would just duplicate data that's always a `readdir` + `stat` call away.

Metrics from Ollama are cheap to regenerate locally. There's no value in persisting metric history for a personal tool — if the server restarts, re-scan on first page load.

All runtime state lives in an **in-memory cache** per collection:

```ts
Map<
  collectionId,
  {
    files: Map<relativePath, FileSnapshot>;
    lastScan: Date;
    scanning: boolean;
  }
>;
```

The only persisted config is OllamaConfig — one DB record (or a `.ollama.json` settings file).

---

## Page Layout

Full-page layout at `/projects/:id/insights`:

```
┌─────────────────────────────────────────────────────────┐
│  Agent Insight — My Project                             │
│  /path/to/repo  ·  Last scan: 2 mins ago  [↻ Refresh]  │
│  [⚙ Ollama: llama3 @ localhost:11434]                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ foo.ts   │ │ bar.tsx  │ │ util.ts  │ │ db.ts    │  │
│  │ .ts  42L │ │ .tsx 88L │ │ .ts  15L │ │ .ts 120L │  │
│  │ 3 min ago│ │ 1 min ago│ │ 8 min ago│ │just now  │  │
│  │ 🟢🟡🔴🟢🟢│ │ 🟢🟢🟢🟢🟢│ │ analysing│ │ 🔴🟢🟡🟢🟡│  │
│  │ Cov: 87% │ │ Cov: 62% │ │          │ │ Cov: --  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Cards are ordered by `updatedAt` descending — most recently touched files first.

---

## UI Components

### AgentInsightPage

- Full page at `/projects/:id/insights`
- Reads collection from existing `useCollections` hook
- Header with project name, directory, last scan time, refresh + config buttons
- Subscribes to SSE stream for live updates
- Grid of `FileInsightCard`s

### FileInsightCard

Fixed-size card showing:

- **Filename** (bold)
- **File type badge** (`.ts`, `.tsx`, `.py`, etc.)
- **Line count**
- **Last updated** (relative: "3 mins ago")
- **Metric badges** — one per enabled metric, RAG dot + label
- **Coverage %** — if available, else hidden

### MetricBadge

- Coloured dot: 🟢 green / 🟡 amber / 🔴 red
- Short label (e.g. "Arch", "Size", "Names")
- Tooltip with the LLM-generated summary sentence on hover
- Loading spinner while metric is being generated

### OllamaConfigModal

- Ollama endpoint (default: `http://localhost:11434`)
- Model name (default: `llama3`)
- Toggle each metric on/off
- "Test connection" button → calls `/api/settings/ollama/test`

---

## Metric System

### Default Metrics

| Name           | Label | Prompt intent                                |
| -------------- | ----- | -------------------------------------------- |
| architecture   | Arch  | Respects layering / separation of concerns?  |
| complexity     | Cmplx | Overly complex or hard to follow?            |
| naming         | Names | Names clear and consistent with conventions? |
| size           | Size  | File doing one thing / reasonable length?    |
| test_proximity | Tests | Apparent test coverage or testability?       |

### Prompt Template

````
System: You are a senior code reviewer. Respond with JSON only, no other text.

User: Review this file for: [METRIC_DESCRIPTION]

File: [RELATIVE_PATH]
Type: [FILE_TYPE]
Lines: [LINE_COUNT]

```[FILE_CONTENT — truncated to ~4000 tokens if needed]```

Respond with exactly this JSON shape:
{"status":"green"|"amber"|"red","summary":"One sentence explanation."}
````

### Processing Order

- Files run sequentially (one file at a time) per collection to avoid overwhelming Ollama
- Within a file, metrics run in parallel
- New file changes are queued and processed after the current file finishes
- "Analysing…" spinner shown on card while in-progress

---

## Code Coverage Integration

On scan, look for coverage report files (best-effort, no error if absent):

| File                             | Format        |
| -------------------------------- | ------------- |
| `coverage/coverage-summary.json` | Jest / Vitest |
| `coverage/lcov.info`             | Generic LCOV  |
| `.nyc_output/`                   | Istanbul      |

Parse to extract per-file coverage %. Store in the in-memory snapshot. Show on card as `Cov: 87%`. If no coverage file found, coverage column hidden entirely.

---

## Backend Architecture

### In-Memory Cache

```ts
// packages/api/src/services/insight.cache.ts
interface FileSnapshot {
  relativePath: string;
  fileType: string;
  lineCount: number;
  updatedAt: Date;
  coverage: number | null;
  metrics: Record<
    string,
    { status: "green" | "amber" | "red"; summary: string } | "pending" | null
  >;
}

interface CollectionInsightState {
  files: Map<string, FileSnapshot>;
  lastScan: Date | null;
  scanning: boolean;
}

export const insightCache = new Map<string, CollectionInsightState>();
```

### New Services

**`insight.service.ts`**

- `scan(collectionId, directory)` — walk code files, populate cache, kick off metric analysis
- `analyseFile(collectionId, relativePath, content)` — call Ollama for each enabled metric, update cache, emit SSE
- `getState(collectionId)` — return current cache state serialised for HTTP response

**`ollama.service.ts`**

- `generate(prompt)` — POST to configured Ollama endpoint
- `testConnection()` — GET `/api/tags` to verify reachability
- Returns `{ status, summary }` parsed from JSON response; throws on failure

**`watcher.service.ts`**

- Uses `chokidar` to watch collection directories
- Registry: `Map<collectionId, FSWatcher>`
- On file change: debounce 2s → update cache entry → re-analyse → emit SSE event
- `startWatcher(collectionId, directory)` / `stopWatcher(collectionId)`
- On API server start: call `startWatcher` for every collection that has a directory

**`coverage.service.ts`**

- `discover(directory)` → `Map<relativePath, number>` (coverage %)
- Tries each known report format in order, returns empty map if none found

### New API Routes

```
GET  /api/collections/:id/insights         → serialise insightCache state
POST /api/collections/:id/insights/scan    → trigger full re-scan
GET  /api/collections/:id/insights/stream  → SSE stream
GET  /api/settings/ollama                  → get OllamaConfig
PUT  /api/settings/ollama                  → update OllamaConfig
POST /api/settings/ollama/test             → test connection
```

### SSE Events

```
event: file_updated
data: { relativePath, fileType, lineCount, updatedAt, metrics, coverage }

event: scan_started
data: { fileCount }

event: scan_complete
data: { fileCount, timestamp }

event: metric_progress
data: { relativePath, metricName, status }
```

### OllamaConfig — DB Model

The only thing persisted. One row, upserted on update.

```prisma
model OllamaConfig {
  id        String   @id @default(cuid())
  endpoint  String   @default("http://localhost:11434")
  model     String   @default("llama3")
  metrics   Json     @default("{}") -- Record<metricName, enabled: boolean>
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("ollama_config")
}
```

---

## Frontend Architecture

### New Route

`/projects/:id/insights` → `AgentInsightPage`

### Sidebar Integration

Update the sidebar tree to add an "Agent Insight" leaf node under each collection that has a `directory`. Uses existing `ProjectTreeDTO` — no schema change needed, the leaf links to the route using the collection id.

### New Hook: `useInsights(collectionId)`

- Initial fetch: `GET /api/collections/:id/insights`
- Opens `EventSource` for SSE stream
- Merges incoming events into local state (upsert by `relativePath`)
- Closes stream on unmount
- Returns `{ files, lastScan, scanning }`

### New Hook: `useOllamaConfig()`

- Query + mutation for get/update

### Component Files

```
src/pages/AgentInsightPage.tsx + .css
src/components/features/insights/FileInsightCard.tsx + .css
src/components/features/insights/MetricBadge.tsx + .css
src/components/features/insights/OllamaConfigModal.tsx + .css
src/hooks/useInsights.ts
src/api/endpoints/insights.ts
```

---

## File Types Indexed

| Badge  | Extensions            |
| ------ | --------------------- |
| `.ts`  | `.ts`                 |
| `.tsx` | `.tsx`                |
| `.js`  | `.js`, `.mjs`, `.cjs` |
| `.jsx` | `.jsx`                |
| `.py`  | `.py`                 |
| `.go`  | `.go`                 |
| `.rs`  | `.rs`                 |
| `.css` | `.css`                |

Skipped: `node_modules`, `.git`, `dist`, `build`, `coverage`, `.next`, lock files, binaries, generated files.

---

## New Dependency

```json
// packages/api
"chokidar": "^3.6.0"
```

---

## Implementation Phases

### Phase 1 — File Index + Page

- DB migration: `OllamaConfig` only
- `insight.service.ts` scan (no Ollama yet)
- `GET /api/collections/:id/insights` endpoint
- `AgentInsightPage` + `FileInsightCard` (name, type, lines, timestamp)
- Sidebar tree node
- Routing

### Phase 2 — Live Watching

- `watcher.service.ts` with chokidar
- SSE endpoint + `useInsights` with `EventSource`
- Cards update in real time

### Phase 3 — Ollama Metrics

- `ollama.service.ts`
- Metric analysis triggered on scan + file change
- `MetricBadge` with RAG status + tooltip
- `OllamaConfigModal`

### Phase 4 — Coverage

- `coverage.service.ts`
- Coverage % parsed and shown on cards
