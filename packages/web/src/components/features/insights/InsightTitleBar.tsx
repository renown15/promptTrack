import "@/pages/AgentInsightPage.css";

type Props = {
  collectionName: string | undefined;
  collectionDir: string | undefined;
  lastScan: string | undefined;
  scanning: boolean;
  modelLabel: string | null;
  onScan: () => void;
  onConfig: () => void;
};

export function InsightTitleBar({
  collectionName,
  collectionDir,
  lastScan,
  scanning,
  modelLabel,
  onScan,
  onConfig,
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
      <div className="agent-insight-page__title-actions">
        {lastScan && (
          <span className="agent-insight-page__last-scan">
            {new Date(lastScan).toLocaleTimeString()}
          </span>
        )}
        {scanning && (
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
