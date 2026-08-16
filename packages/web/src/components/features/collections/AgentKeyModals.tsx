import type { CreatedApiKey } from "@/api/endpoints/collections";
import "@/components/features/collections/AgentKeysPanel.css";
import { buildAgentPrompt } from "@/components/features/collections/agentPrompt";
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

function AgentPromptSection({ apiKey }: { apiKey?: string }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const prompt = buildAgentPrompt(apiKey);

  function handleCopy() {
    void navigator.clipboard.writeText(prompt);
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
            {prompt}
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
          <AgentPromptSection apiKey={created.key} />
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
              <AgentPromptSection apiKey={fullKey} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
