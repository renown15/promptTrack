import type { PromptWithVersionsDTO } from "@prompttrack/shared";
import "@/components/features/prompts/ExecutivePromptModal.css";

type Props = {
  activePrompts: PromptWithVersionsDTO[];
  onRemove: (id: string) => void;
};

export function ExecContextPanel({ activePrompts, onRemove }: Props) {
  return (
    <div className="exec-modal__context-panel">
      <div className="exec-modal__panel-label">
        Context ({activePrompts.length}{" "}
        {activePrompts.length === 1 ? "prompt" : "prompts"})
      </div>
      <div className="exec-modal__context-list">
        {activePrompts.map((p) => {
          const latest = p.versions[p.versions.length - 1];
          return (
            <div key={p.id} className="exec-modal__context-block">
              <div className="exec-modal__context-header">
                <span className="exec-modal__context-icon">≡</span>
                <span className="exec-modal__context-name">{p.name}</span>
                <button
                  className="exec-modal__context-remove"
                  onClick={() => onRemove(p.id)}
                  type="button"
                  aria-label={`Remove ${p.name}`}
                >
                  ✕
                </button>
              </div>
              <pre className="exec-modal__context-content">
                {latest?.content ?? "(no content)"}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
