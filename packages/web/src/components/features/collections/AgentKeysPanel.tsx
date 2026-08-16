import { useState } from "react";
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  type ApiKeyRecord,
} from "@/hooks/useCollections";
import type { CreatedApiKey } from "@/api/endpoints/collections";
import {
  NewKeyModal,
  ViewKeyModal,
} from "@/components/features/collections/AgentKeyModals";
import "@/components/features/collections/AgentKeysPanel.css";

type Props = {
  collectionId: string;
};

function KeyRow({
  apiKey,
  onRevoke,
}: {
  apiKey: ApiKeyRecord;
  onRevoke: (id: string) => void;
}) {
  const isRevoked = apiKey.revokedAt !== null;
  const [showConfig, setShowConfig] = useState(false);
  return (
    <>
      <div
        className={`agent-keys__row${isRevoked ? " agent-keys__row--revoked" : ""}`}
      >
        <div className="agent-keys__row-info">
          <span className="agent-keys__row-name">{apiKey.name}</span>
          <span className="agent-keys__row-prefix">{apiKey.keyPrefix}…</span>
          <span className="agent-keys__row-date">
            {isRevoked
              ? `Revoked ${new Date(apiKey.revokedAt!).toLocaleDateString()}`
              : `Created ${new Date(apiKey.createdAt).toLocaleDateString()}`}
          </span>
        </div>
        {!isRevoked && (
          <div className="agent-keys__row-actions">
            <button
              className="agent-keys__view-btn"
              onClick={() => setShowConfig(true)}
            >
              View config
            </button>
            <button
              className="agent-keys__revoke-btn"
              onClick={() => onRevoke(apiKey.id)}
            >
              Revoke
            </button>
          </div>
        )}
      </div>
      {showConfig && (
        <ViewKeyModal apiKey={apiKey} onClose={() => setShowConfig(false)} />
      )}
    </>
  );
}

export function AgentKeysPanel({ collectionId }: Props) {
  const { data: keys, isLoading } = useApiKeys(collectionId);
  const createKey = useCreateApiKey(collectionId);
  const revokeKey = useRevokeApiKey(collectionId);
  const [nameInput, setNameInput] = useState("");
  const [justCreated, setJustCreated] = useState<CreatedApiKey | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    createKey.mutate(name, {
      onSuccess: (created) => {
        setNameInput("");
        setJustCreated(created);
      },
    });
  }

  return (
    <section className="agent-keys">
      <div className="agent-keys__header">
        <span className="agent-keys__title">Agent Keys</span>
      </div>

      <form className="agent-keys__form" onSubmit={handleCreate}>
        <input
          className="agent-keys__input"
          placeholder="Key name (e.g. Claude Code)"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
        />
        <button
          className="agent-keys__add-btn"
          type="submit"
          disabled={createKey.isPending || !nameInput.trim()}
        >
          {createKey.isPending ? "Creating…" : "Add key"}
        </button>
      </form>

      <div className="agent-keys__list">
        {isLoading && <div className="agent-keys__empty">Loading…</div>}
        {!isLoading && keys?.length === 0 && (
          <div className="agent-keys__empty">No keys yet</div>
        )}
        {keys?.map((k) => (
          <KeyRow
            key={k.id}
            apiKey={k}
            onRevoke={(id) => revokeKey.mutate(id)}
          />
        ))}
      </div>

      {justCreated && (
        <NewKeyModal
          created={justCreated}
          onClose={() => setJustCreated(null)}
        />
      )}
    </section>
  );
}
