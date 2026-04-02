# Agent Insight — Guide for Agents Working in a Watched Repo

This repo is monitored by **PromptTrack Agent Insight**, a local tool that gives a human developer a live dashboard of codebase health. It watches this directory, scans source files, and surfaces quality signals — per-file AI metrics, test coverage, lint results, git status, and CI — in a single panel.

Your job is to keep that dashboard green. If something is amber or red, treat it as a task on your list.

---

## What Agent Insight sees

Agent Insight scans files with these extensions: `.ts` `.tsx` `.js` `.mjs` `.cjs` `.jsx` `.py` `.go` `.rs` `.css` `.md`

It discovers reports by looking for specific files in the repo root. It reads git status and (optionally) the last GitHub Actions run. It runs Ollama-powered per-file quality metrics on each scanned file.

The dashboard has four areas:

| Tile         | What goes wrong                                              |
| ------------ | ------------------------------------------------------------ |
| **codebase** | Missing `CLAUDE.md`, missing `MEMORY.md`                     |
| **git**      | No remote configured, uncommitted work piling up             |
| **pipeline** | No coverage report found, no lint report found               |
| **metrics**  | Per-file AI quality scores (complexity, docs, test coverage) |

---

## CLAUDE.md — required, red if missing

Every repo must have a `CLAUDE.md` at the root. This is the single source of truth for how you should work in this repo. Without it, Agent Insight flags a red `no CLAUDE.md` badge and — more importantly — you have no persistent instruction set, so every context reset leaves you flying blind.

**Minimum content for `CLAUDE.md`:**

```markdown
# <Project Name> — Claude Code Rules

## Project purpose

<One paragraph: what this is, who uses it, what problem it solves>

## Architecture

<Key layers, packages, or modules — enough to orient a fresh context>

## Stack

<Language, framework, package manager, DB, ports>

## Running locally

<How to start the project>

## Testing

<How to run tests, what command, what file patterns>

## Linting

<How to run the linter, what config is in use>

## Generating reports for Agent Insight

<See below — fill this in>

## Conventions

<Naming, file layout, any gotchas>

## Always run before declaring work complete

<The command that proves nothing is broken — e.g. `make check` or `npm run ci`>
```

Keep it honest. If a section doesn't apply yet, say so. The worst `CLAUDE.md` is one with stale instructions.

---

## MEMORY.md — required, amber if missing

`MEMORY.md` is a persistent memory index. It lives at the repo root and is written by you (the agent) to preserve context across sessions. Agent Insight flags amber if it's absent.

Create it as soon as you start working in a new repo:

```markdown
# <Project Name> — Agent Memory

## [memory-file-name.md](memory/memory-file-name.md)

Brief description of what's in that memory file.
```

The pattern mirrors PromptTrack's own memory system: `MEMORY.md` is the index, individual `.md` files under `memory/` hold the actual content. See your memory system docs for the full format.

---

## Coverage report — amber if missing

Agent Insight looks for a coverage report to show test coverage in the pipeline tile and overlay per-file coverage in the file table. Without it the tile shows `no tests` in amber.

### JavaScript / TypeScript (Jest or Vitest)

Configure your test runner to emit a JSON summary:

**Vitest** (`vitest.config.ts`):

```ts
export default defineConfig({
  test: {
    coverage: {
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
});
```

**Jest** (`jest.config.js`):

```js
module.exports = {
  coverageReporters: ["text", "json-summary"],
  coverageDirectory: "coverage",
};
```

Run with: `npx vitest run --coverage` or `npx jest --coverage`

Agent Insight reads: **`coverage/coverage-summary.json`**

The file must have a `"total"` key at the top level — that's the format signal.

### Python (coverage.py)

```bash
pip install coverage
coverage run -m pytest
coverage json   # writes coverage.json
```

Agent Insight reads: **`coverage.json`** (must have a `"totals"` key)

### What to add to CLAUDE.md

```markdown
## Generating reports for Agent Insight

# JS/TS coverage

npx vitest run --coverage # → coverage/coverage-summary.json

# Python coverage

coverage run -m pytest && coverage json # → coverage.json

Run these before finishing a session so Agent Insight has fresh data.
```

---

## Lint report — amber if missing

Agent Insight reads a lint report to show error/warning counts in the pipeline tile and flag individual files. Without it the tile shows `no lint` in amber.

### JavaScript / TypeScript (ESLint)

```bash
npx eslint src --format json --output-file .eslint-report.json
```

Agent Insight reads: **`.eslint-report.json`**

The file must be an array of `{ filePath, errorCount, warningCount, messages }` objects — standard ESLint JSON format.

Add a script to `package.json`:

```json
"lint:report": "eslint src --format json --output-file .eslint-report.json; true"
```

The `; true` prevents a non-zero exit from blocking CI when there are lint errors.

### Python (Ruff)

```bash
pip install ruff
ruff check . --output-format json > .ruff-report.json; true
```

Agent Insight reads: **`.ruff-report.json`**

The file must be an array of `{ filename, code, message, ... }` objects — one entry per violation.

### What to add to CLAUDE.md

```markdown
## Generating reports for Agent Insight

# JS/TS lint

npx eslint src --format json --output-file .eslint-report.json; true

# Python lint

ruff check . --output-format json > .ruff-report.json; true

Run these after fixing lint issues so Agent Insight reflects current state.
```

---

## Git remote — red if missing

Agent Insight calls `git remote get-url origin` to find the remote. If there is none, the git tile shows `no remote` in red and CI status will never load.

```bash
git remote add origin <url>
```

If this is a local-only repo with no intention of a remote, that's fine — but you should note it in `CLAUDE.md` so the badge is understood and not a signal of neglect.

---

## Keeping reports fresh

Reports are static files — Agent Insight reads whatever is on disk. They go stale. The best practice is:

1. **Run lint and coverage before ending a work session**, so the dashboard reflects actual current state.
2. **Add report generation to your CI pipeline** so reports are always up to date on the main branch.
3. **Add the report commands to `CLAUDE.md`** under a clearly labelled section so you remember to run them even after a context reset.

A good addition to any `Makefile` or `package.json`:

```makefile
reports: ## Generate lint + coverage reports for Agent Insight
	npx vitest run --coverage
	npx eslint src --format json --output-file .eslint-report.json; true
```

---

## Per-file AI metrics

Agent Insight runs Ollama metrics on each scanned file. These appear as coloured chips in the file table. You don't need to configure anything — they run automatically after a scan. But they are signals you should respond to:

- **Red** on a file = the AI judged it problematic (high complexity, missing docs, poor test coverage, etc.)
- **Amber** = worth reviewing
- **Green** = acceptable

When you see red metric chips on files you've just written, treat them as a code review comment and address them before moving on.

---

## Summary checklist

Before you consider a repo "set up" for Agent Insight:

- [ ] `CLAUDE.md` exists at repo root with project purpose, architecture, and report-generation instructions
- [ ] `MEMORY.md` exists at repo root
- [ ] Coverage report is being generated and placed at the right path
- [ ] Lint report is being generated and placed at the right path
- [ ] `git remote origin` is configured
- [ ] Report generation is documented in `CLAUDE.md` so it survives context resets
- [ ] Report generation is wired into CI so reports don't go stale on the main branch
