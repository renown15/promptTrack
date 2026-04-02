import React from "react";
import type { ModelStatusDTO, PullState } from "@/hooks/useOllamaConfig";
import "@/components/features/insights/OllamaConfigModal.css";

type Props = {
  models: ModelStatusDTO[];
  pulling: Record<string, PullState>;
  onPull: (model: string) => void;
  onSelect: (model: string) => void;
};

export function OllamaRecommendedModels({
  models,
  pulling,
  onPull,
  onSelect,
}: Props) {
  return (
    <div className="ollama-models">
      {models.map((m) => {
        const pullState = pulling[m.name];
        const isPulling = !!pullState;
        return (
          <div
            key={m.name}
            className={`ollama-models__row${m.isCurrent ? " ollama-models__row--current" : ""}${m.isBetter && !m.installed ? " ollama-models__row--better" : ""}`}
          >
            <div className="ollama-models__info">
              <span className="ollama-models__name">{m.label}</span>
              <span className="ollama-models__size">{m.sizeGb} GB</span>
              {m.isCurrent && (
                <span className="ollama-models__badge ollama-models__badge--current">
                  active
                </span>
              )}
              {m.isBetter && !m.isCurrent && (
                <span className="ollama-models__badge ollama-models__badge--better">
                  better
                </span>
              )}
            </div>
            <div className="ollama-models__actions">
              {isPulling ? (
                <div className="ollama-models__pull-progress">
                  <span className="ollama-models__pull-status">
                    {pullState.status}
                  </span>
                  {pullState.progress !== undefined && (
                    <div className="ollama-models__progress-bar">
                      <div
                        className="ollama-models__progress-fill"
                        style={
                          {
                            "--pct": `${pullState.progress}%`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                  )}
                </div>
              ) : m.installed ? (
                !m.isCurrent && (
                  <button
                    className="ollama-models__action-btn"
                    onClick={() => onSelect(m.name)}
                  >
                    Use
                  </button>
                )
              ) : (
                <button
                  className="ollama-models__action-btn ollama-models__action-btn--install"
                  onClick={() => onPull(m.name)}
                >
                  Install
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
