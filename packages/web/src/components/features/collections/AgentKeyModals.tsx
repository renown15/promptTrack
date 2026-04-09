import type { CreatedApiKey } from "@/api/endpoints/collections";
import "@/components/features/collections/AgentKeysPanel.css";
import type { ApiKeyRecord } from "@/hooks/useCollections";
import { useGetFullApiKey } from "@/hooks/useCollections";
import { useState } from "react";

function mcpConfig(key: string) {
  return JSON.stringify(
    {
      mcpServers: {
        prompttrack: {
          url: "http://localhost:3051/api/mcp",
          headers: { Authorization: `Bearer ${key}` },
        },
      },
    },
    null,
    2
  );
}

const AGENT_PROMPT = `You have access to a PromptTrack MCP server for this repository.

PromptTrack is a local tool that continuously monitors the codebase and gives you structured insight into its health. It provides the following tools:

- **get_repo_status** — Full codebase health snapshot: test coverage, lint errors, per-metric counts (security, documentation, complexity, sensitive references), git status (untracked/modified files), and prioritised recommendations. Call this first.
- **list_problem_files** — Files ranked by problem score with a suggested fix per file. Use after get_repo_status to drill into specifics.
- **list_prompts** — Browse saved prompts in the collection (filterable by environment: draft/review/staging/production).
- **get_prompt** — Fetch a specific prompt by ID or slug, including content, role, variables, and model parameters.
- **list_chains** — Browse prompt chains (DAGs of prompts).
- **get_chain** — Fetch a chain with its nodes and edges.
- **serialise_chain** — Convert a chain into a ready-to-use messages array with variable substitution.

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
2. Call \`get_repo_status\` to get a full picture of the codebase health.
3. Call \`list_problem_files\` to see which files have the most issues.
4. Review the output carefully — coverage gaps, lint errors, security flags, stale or missing documentation, and any other concerns surfaced.
5. Propose a concrete action plan: prioritised list of what to fix first, with a brief rationale for each item. Be specific about file paths and issue types.`;

function AgentPromptSection() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(AGENT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="agent-keys-modal__prompt-section">
      <button
        className="agent-keys-modal__prompt-toggle"
        onClick={() => setShow((v) => !v)}
      >
        {show ? "Hide" : "Generate"} agent prompt
      </button>
      {show && (
        <div className="agent-keys-modal__prompt-body">
          <pre className="agent-keys-modal__snippet agent-keys-modal__snippet--prompt">
            {AGENT_PROMPT}
          </pre>
          <button className="agent-keys-modal__copy-btn" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy prompt"}
          </button>
        </div>
      )}
    </div>
  );
}

export function NewKeyModal({
  created,
  onClose,
}: {
  created: CreatedApiKey;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const config = mcpConfig(created.key);

  function handleCopy() {
    void navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="agent-keys-modal__overlay" onClick={onClose}>
      <div
        className="agent-keys-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="agent-keys-modal__header">
          <span className="agent-keys-modal__title">
            API key created — copy it now
          </span>
          <button
            className="agent-keys-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="agent-keys-modal__body">
          <p className="agent-keys-modal__warning">
            This key will not be shown again. Copy it to your{" "}
            <code>.claude/.mcp.json.local</code>.
          </p>
          <pre className="agent-keys-modal__snippet">{config}</pre>
          <button className="agent-keys-modal__copy-btn" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
          <AgentPromptSection />
        </div>
      </div>
    </div>
  );
}

export function ViewKeyModal({
  apiKey,
  onClose,
}: {
  apiKey: ApiKeyRecord;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { data, isLoading, isError } = useGetFullApiKey(
    apiKey.collectionId,
    apiKey.id
  );
  const fullKey = data?.key;
  const keyUnavailable = !isLoading && (isError || !fullKey);

  function handleCopy() {
    if (!fullKey) return;
    void navigator.clipboard.writeText(mcpConfig(fullKey));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="agent-keys-modal__overlay" onClick={onClose}>
      <div
        className="agent-keys-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="agent-keys-modal__header">
          <span className="agent-keys-modal__title">
            MCP config — {apiKey.name}
          </span>
          <button
            className="agent-keys-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="agent-keys-modal__body">
          {isLoading && (
            <p className="agent-keys-modal__warning">Loading key…</p>
          )}
          {keyUnavailable && (
            <p className="agent-keys-modal__warning agent-keys-modal__warning--error">
              Full key not available — this key was created before encrypted
              storage was added. Revoke it and create a new one.
            </p>
          )}
          {!isLoading && fullKey && (
            <>
              <p className="agent-keys-modal__warning">
                Add this to <code>.claude/.mcp.json.local</code>:
              </p>
              <pre className="agent-keys-modal__snippet">
                {mcpConfig(fullKey)}
              </pre>
              <button
                className="agent-keys-modal__copy-btn"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
              <AgentPromptSection />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
