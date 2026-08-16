import type { ActiveLlmCallDTO } from "@/api/endpoints/insights";
import "@/pages/AgentInsightPage.css";

type Props = {
  collectionName: string | undefined;
  collectionDir: string | undefined;
  lastScan: string | undefined;
  scanning: boolean;
  analysing: boolean;
  pendingFileCount: number;
  activeLlmCall: ActiveLlmCallDTO | null;
  modelLabel: string | null;
  filteredCount: number | null;
  onScan: () => void;
  onConfig: () => void;
  onLlmLog: () => void;
};

export function InsightTitleBar({
  collectionName,
  collectionDir,
  lastScan,
  scanning,
  analysing,
  pendingFileCount,
  activeLlmCall,
  modelLabel,
  filteredCount,
  onScan,
  onConfig,
  onLlmLog,
}: Props) {
  return (
    <div className="agent-insight-page__title-bar">
      <span className="agent-insight-page__title">Agent Insight</span>
      {collectionName && (
        <span className="agent-insight-page__project">{collectionName}</span>
      )}
      {collectionDir && (
        <span className="agent-insight-page__dir">{collectionDir}</span>
      )}
      {filteredCount !== null && (
        <span className="agent-insight-page__filter-badge">
          ● {filteredCount} filtered
        </span>
      )}
      <div className="agent-insight-page__title-actions">
        {lastScan && (
          <span className="agent-insight-page__last-scan">
            {new Date(lastScan).toLocaleTimeString()}
          </span>
        )}
        {activeLlmCall && (
          <span
            className="agent-insight-page__llm-call"
            title={`${activeLlmCall.model} · ${activeLlmCall.file}`}
          >
            ◉ {activeLlmCall.metric} · {activeLlmCall.file.split("/").pop()}
            {pendingFileCount > 1 && (
              <span className="agent-insight-page__llm-queue">
                {" "}
                ({pendingFileCount} remaining)
              </span>
            )}
          </span>
        )}
        {analysing && !activeLlmCall && pendingFileCount > 0 && (
          <span className="agent-insight-page__llm-call">
            ◌ {pendingFileCount} queued…
          </span>
        )}
        {scanning && !activeLlmCall && !analysing && (
          <span className="agent-insight-page__scanning">Scanning…</span>
        )}
        <button
          className="agent-insight-page__scan-btn"
          onClick={onScan}
          disabled={scanning}
        >
          ↻ Scan
        </button>
        <button
          className="agent-insight-page__log-btn"
          onClick={onLlmLog}
          title="View LLM call log"
        >
          LLM Log
        </button>
        <button
          className="agent-insight-page__config-btn"
          onClick={onConfig}
          title={modelLabel ?? "Configure Ollama"}
        >
          ⚙ {modelLabel ?? "Ollama"}
        </button>
      </div>
    </div>
  );
}
