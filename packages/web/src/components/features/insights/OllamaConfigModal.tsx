import { useState } from "react";
import {
  useOllamaConfig,
  useUpdateOllamaConfig,
  useTestOllamaConnection,
  useOllamaRecommended,
  useOllamaPull,
} from "@/hooks/useOllamaConfig";
import { OllamaRecommendedModels } from "@/components/features/insights/OllamaRecommendedModels";
import "@/components/features/insights/OllamaConfigModal.css";

type Props = { onClose: () => void };

export function OllamaConfigModal({ onClose }: Props) {
  const { data: cfg, isLoading } = useOllamaConfig();
  const { data: recommended } = useOllamaRecommended();
  const update = useUpdateOllamaConfig();
  const test = useTestOllamaConnection();
  const { pulling, pull } = useOllamaPull();

  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [metricsOverride, setMetricsOverride] = useState<Record<
    string,
    boolean
  > | null>(null);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  if (isLoading || !cfg) {
    return (
      <div className="ollama-modal__overlay" onClick={onClose}>
        <div className="ollama-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ollama-modal__loading">Loading…</div>
        </div>
      </div>
    );
  }

  const currentEndpoint = endpoint ?? cfg.endpoint;
  const currentModel = model ?? cfg.model;
  const currentMetrics = metricsOverride ?? cfg.metrics;

  function toggleMetric(name: string) {
    const next = {
      ...currentMetrics,
      [name]: currentMetrics[name] === false ? true : false,
    };
    setMetricsOverride(next);
  }

  async function handleTest() {
    setTestResult(null);
    setTestResult(await test.mutateAsync(currentEndpoint));
  }

  async function handleSave() {
    await update.mutateAsync({
      endpoint: currentEndpoint,
      model: currentModel,
      metrics: currentMetrics,
    });
    onClose();
  }

  function handleSelectModel(name: string) {
    setModel(name);
  }

  return (
    <div className="ollama-modal__overlay" onClick={onClose}>
      <div
        className="ollama-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="ollama-modal__header">
          <span className="ollama-modal__title">Ollama Configuration</span>
          <button
            className="ollama-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="ollama-modal__body">
          <div className="ollama-modal__field">
            <label className="ollama-modal__label">Endpoint</label>
            <div className="ollama-modal__input-row">
              <input
                className="ollama-modal__input"
                value={currentEndpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:11434"
              />
              <button
                className="ollama-modal__test-btn"
                onClick={handleTest}
                disabled={test.isPending}
              >
                {test.isPending ? "Testing…" : "Test"}
              </button>
            </div>
            {testResult === true && (
              <span className="ollama-modal__test-ok">Connected</span>
            )}
            {testResult === false && (
              <span className="ollama-modal__test-fail">Cannot connect</span>
            )}
          </div>

          <div className="ollama-modal__field">
            <label className="ollama-modal__label">
              Model{" "}
              {model && model !== cfg.model && (
                <span className="ollama-modal__test-ok">
                  {" "}
                  (changed — save to apply)
                </span>
              )}
            </label>
            {recommended ? (
              <OllamaRecommendedModels
                models={recommended.models.map((m) => ({
                  ...m,
                  isCurrent: m.name === currentModel,
                }))}
                pulling={pulling}
                onPull={(name) => void pull(name)}
                onSelect={handleSelectModel}
              />
            ) : (
              <input
                className="ollama-modal__input"
                value={currentModel}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. qwen2.5-coder:7b"
              />
            )}
          </div>

          <div className="ollama-modal__field">
            <label className="ollama-modal__label">Metrics</label>
            <div className="ollama-modal__metrics">
              {cfg.defaultMetrics.map((m) => {
                const enabled = currentMetrics[m.name] !== false;
                return (
                  <label key={m.name} className="ollama-modal__metric">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleMetric(m.name)}
                    />
                    <span className="ollama-modal__metric-label">
                      {m.label}
                    </span>
                    <span className="ollama-modal__metric-desc">
                      {m.description}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="ollama-modal__footer">
          <button className="ollama-modal__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ollama-modal__save"
            onClick={handleSave}
            disabled={update.isPending}
          >
            {update.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
