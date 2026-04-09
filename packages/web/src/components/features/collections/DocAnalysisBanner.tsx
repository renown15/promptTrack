import type { DocAnalysisResult } from "@/hooks/useCollections";
import "@/components/features/collections/DocsPanel.css";

export function DocAnalysisBanner({
  analysis,
}: {
  analysis: DocAnalysisResult;
}) {
  return (
    <div
      className={`docs-panel__analysis docs-panel__analysis--${analysis.status}`}
    >
      <span className="docs-panel__analysis-summary">{analysis.summary}</span>
      {analysis.suggestions.length > 0 && (
        <ul className="docs-panel__analysis-suggestions">
          {analysis.suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
