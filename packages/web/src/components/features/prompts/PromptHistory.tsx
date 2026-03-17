import { useState } from "react";
import type { PromptDTO } from "@prompttrack/shared";
import { usePrompts } from "@/hooks/usePrompts";
import "@/components/features/prompts/PromptHistory.css";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  collectionId: string;
  onBuild: (selectedIds: string[]) => void;
};

export function PromptHistory({ collectionId, onBuild }: Props) {
  const { data: prompts, isLoading } = usePrompts({ collectionId });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sorted: PromptDTO[] = prompts
    ? [...prompts].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  const allSelected = sorted.length > 0 && selectedIds.size === sorted.length;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="prompt-history">
      <div className="prompt-history__header">
        <h2 className="prompt-history__title">Input Prompts</h2>
        <div className="prompt-history__actions">
          {sorted.length > 0 && (
            <button className="prompt-history__select-all" onClick={toggleAll}>
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          )}
          <button
            className="prompt-history__build-btn"
            onClick={() => onBuild(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
          >
            + Agent Instruction
          </button>
        </div>
      </div>

      <div className="prompt-history__body">
        {isLoading && <p className="prompt-history__empty">Loading…</p>}

        {!isLoading && sorted.length === 0 && (
          <p className="prompt-history__empty">
            No prompts in this collection yet.
          </p>
        )}

        {sorted.length > 0 && (
          <div className="prompt-history__timeline">
            {sorted.map((prompt) => (
              <label key={prompt.id} className="prompt-history__item">
                <input
                  type="checkbox"
                  className="prompt-history__checkbox"
                  checked={selectedIds.has(prompt.id)}
                  onChange={() => toggleOne(prompt.id)}
                />
                <div className="prompt-history__dot" />
                <div className="prompt-history__item-body">
                  <span className="prompt-history__date">
                    {formatDate(prompt.createdAt)}
                  </span>
                  <span className="prompt-history__name">{prompt.name}</span>
                  {prompt.description && (
                    <span className="prompt-history__desc">
                      {prompt.description}
                    </span>
                  )}
                </div>
                <span
                  className={`prompt-history__env prompt-history__env--${prompt.environment}`}
                >
                  {prompt.environment}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
