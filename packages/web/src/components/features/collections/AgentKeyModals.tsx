import { useState } from "react";
import type { ApiKeyRecord } from "@/hooks/useCollections";
import type { CreatedApiKey } from "@/api/endpoints/collections";
import "@/components/features/collections/AgentKeysPanel.css";

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
  const config = mcpConfig(`${apiKey.keyPrefix}...`);

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
          <p className="agent-keys-modal__warning">
            Replace <code>{apiKey.keyPrefix}...</code> with your actual key. The
            full key was only shown once at creation time.
          </p>
          <pre className="agent-keys-modal__snippet">{config}</pre>
          <button className="agent-keys-modal__copy-btn" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
