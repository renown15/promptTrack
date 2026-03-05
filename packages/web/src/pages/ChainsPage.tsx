import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useChains, useCreateChain } from "@/hooks/useChain";
import "@/pages/ChainsPage.css";

export function ChainsPage() {
  const navigate = useNavigate();
  const { data: chains, isLoading } = useChains();
  const createChain = useCreateChain();
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createChain.mutate(
      { name: newName.trim(), tags: [] },
      {
        onSuccess: (chain) => {
          navigate(`/chains/${chain.id}`);
        },
      }
    );
  };

  return (
    <div className="chains-page">
      <div className="chains-page__header">
        <h1 className="chains-page__title">Chains</h1>
        <button
          className="chains-page__new-btn"
          onClick={() => setShowForm((v) => !v)}
        >
          + New chain
        </button>
      </div>

      {showForm && (
        <form className="chains-page__form" onSubmit={handleCreate}>
          <input
            className="chains-page__form-input"
            type="text"
            placeholder="Chain name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <button
            className="chains-page__form-submit"
            type="submit"
            disabled={!newName.trim() || createChain.isPending}
          >
            Create
          </button>
          <button
            className="chains-page__form-cancel"
            type="button"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>
        </form>
      )}

      {isLoading && <p className="chains-page__loading">Loading…</p>}

      <ul className="chains-page__list">
        {chains?.map((chain) => (
          <li key={chain.id} className="chains-page__item">
            <Link className="chains-page__link" to={`/chains/${chain.id}`}>
              <span className="chains-page__name">{chain.name}</span>
              <span className="chains-page__meta">
                v{chain.currentVersion} · {chain.tags.join(", ")}
              </span>
            </Link>
          </li>
        ))}
        {chains?.length === 0 && (
          <li className="chains-page__empty">No chains yet.</li>
        )}
      </ul>
    </div>
  );
}
