import "@/components/features/insights/InsightRepoSummaryPanel.css";

type Props = {
  summary: string | undefined;
  isLoading: boolean;
  onClose: () => void;
};

export function InsightRepoSummaryPanel({
  summary,
  isLoading,
  onClose,
}: Props) {
  return (
    <div className="insight-repo-summary-panel">
      <div className="insight-repo-summary-panel__header">
        <span className="insight-repo-summary-panel__title">
          Repo Health Summary
        </span>
        <button className="insight-repo-summary-panel__close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="insight-repo-summary-panel__body">
        {isLoading && (
          <span className="insight-repo-summary-panel__loading">
            Analysing with Ollama…
          </span>
        )}
        {!isLoading && summary && (
          <p className="insight-repo-summary-panel__text">{summary}</p>
        )}
        {!isLoading && !summary && (
          <span className="insight-repo-summary-panel__empty">
            No summary available.
          </span>
        )}
      </div>
    </div>
  );
}
