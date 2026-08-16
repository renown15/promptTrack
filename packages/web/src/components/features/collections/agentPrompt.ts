export function buildAgentPrompt(apiKey?: string) {
  const keyLine = apiKey
    ? `Authorization: Bearer ${apiKey}`
    : `Authorization: Bearer <your-api-key>`;

  return `## What PromptTrack is

PromptTrack is a local AI oversight platform. It runs a local LLM (Ollama) that continuously analyses every file in this repository across six quality metrics: architecture, complexity, naming, security, engineering quality, and DRY. It also collects test coverage and lint data. The result is a live health model of the codebase that you — the coding agent — are expected to consult and respond to.

The findings are AI-generated assessments, not ground truth. You are expected to use your own judgement: act on findings you agree with, and submit a reasoned override for findings you believe are wrong.

## How to call a tool

Invoke PromptTrack tools by making HTTP POST requests — do NOT attempt to call them as MCP or IDE tools.

POST http://localhost:3051/api/agent/tools
${keyLine}
Content-Type: application/json

{ "tool": "<tool-name>", "input": { ... } }

The response is: { "tool": "<tool-name>", "result": { ... } }

## Available tools

- **get_repo_status** — Full codebase health snapshot: AI metric scores per file, test coverage, lint errors, git status, and prioritised recommendations. Call this first.
  Input: { "repo": "optional name for validation" }

- **list_problem_files** — Files ranked by problem score with a suggested fix per file. Use after get_repo_status to drill into specifics.
  Input: { "limit": 20 }

- **list_prompts** — Browse saved prompts in the collection (filterable by environment).
  Input: { "environment": "draft" | "review" | "staging" | "production" }  (optional)

- **get_prompt** — Fetch a specific prompt by ID or slug, including content, role, variables, and model parameters.
  Input: { "id": "prompt-slug-or-cuid" }

- **list_chains** — Browse prompt chains (DAGs of prompts).
  Input: {}

- **get_chain** — Fetch a chain with its nodes and edges.
  Input: { "id": "chain-slug-or-cuid" }

- **serialise_chain** — Convert a chain into a ready-to-use messages array with variable substitution.
  Input: { "id": "chain-slug-or-cuid", "variables": { "key": "value" } }

## Disagreeing with a finding

If you believe a PromptTrack finding is a false positive, outdated, or does not apply to this file, submit an override. This is not optional — silent disagreement leaves the health model wrong.

First, get your collectionId:

GET http://localhost:3051/api/agent/resolve
${keyLine}

Then submit the override:

PUT http://localhost:3051/api/collections/{collectionId}/insights/files/override
${keyLine}
Content-Type: application/json

{
  "relativePath": "src/example/file.ts",
  "metric": "security",
  "status": "rejected",
  "comment": "No user input reaches this code path — the flag is a false positive.",
  "source": "agent"
}

**Status values:**
- \`rejected\` — you dispute the AI assessment (false positive, misread context, not applicable)
- \`accepted\` — the finding is valid but you are intentionally accepting the risk or deferring it
- \`green\` / \`amber\` / \`red\` — override the health status directly if you have a more accurate assessment

**Metric names:** \`architecture\`, \`complexity\`, \`naming\`, \`security\`, \`eng_quality\`, \`dry\`

A comment is required. Be specific: explain what the AI got wrong and why.

## Setting up coverage and lint reports

PromptTrack reads report files from the repo directory. If they are missing, coverage and lint data will show as unavailable. Generate them using the commands below, then PromptTrack will pick them up automatically on the next scan.

### JavaScript / TypeScript

Coverage (Jest or Vitest — produces \`coverage/coverage-summary.json\`):
  npx vitest run --coverage --coverage.reporter=json-summary
  # or for Jest:
  npx jest --coverage --coverageReporters=json-summary

Lint (ESLint — produces \`.eslint-report.json\`):
  npx eslint . --format json --output-file .eslint-report.json

### Python

Coverage (coverage.py — produces \`coverage.json\`):
  coverage run -m pytest
  coverage json

Lint (Ruff — produces \`.ruff-report.json\`):
  ruff check . --output-format json > .ruff-report.json

These files are read-only by PromptTrack and should be added to .gitignore if not already present.

## Your task

1. Check whether coverage and lint reports already exist in the repo. If not, generate them using the commands above.
2. POST to \`get_repo_status\` to get a full picture of the codebase health.
3. POST to \`list_problem_files\` to see which files have the most issues.
4. Review the output carefully — AI metric scores, coverage gaps, lint errors, security flags, and any other concerns.
5. For each finding: either fix it, or submit an override via the override endpoint explaining your reasoning.
6. Propose a concrete action plan: prioritised list of what to fix first, with a brief rationale for each item. Be specific about file paths and issue types.`;
}
