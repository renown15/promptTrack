import type {
  FileDetailDTO,
  FileMetric,
  FileMetricError,
} from "@/api/endpoints/insights";
import {
  CoverageSection,
  LintSection,
} from "@/components/features/insights/InsightDetailPanel.sections";
import "@/components/features/insights/InsightDetailPanel.css";

type Props = {
  relativePath: string | null;
  detail: FileDetailDTO | undefined;
  isLoading: boolean;
  metricLabels: Record<string, string>;
  onClose: () => void;
};

function isMetricError(v: unknown): v is FileMetricError {
  return typeof v === "object" && v !== null && "error" in v;
}

export function InsightDetailPanel({
  relativePath,
  detail,
  isLoading,
  metricLabels,
  onClose,
}: Props) {
  if (!relativePath) {
    return (
      <div className="insight-detail-panel">
        <div className="insight-detail-panel__empty">
          Select a file to view details
        </div>
      </div>
    );
  }

  const parts = relativePath.split("/");
  const name = parts[parts.length - 1] ?? relativePath;

  return (
    <div className="insight-detail-panel">
      <div className="insight-detail-panel__header">
        <span className="insight-detail-panel__filename">{name}</span>
        <span className="insight-detail-panel__path">{relativePath}</span>
        <button
          className="insight-detail-panel__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {isLoading && (
        <div className="insight-detail-panel__loading">Loading…</div>
      )}

      {!isLoading && detail && (
        <div className="insight-detail-panel__body">
          <div className="insight-detail-panel__section">
            <div className="insight-detail-panel__section-header">
              <span>Analysis</span>
            </div>
            <div className="insight-detail-panel__metrics">
              {Object.entries(metricLabels).map(([name, label]) => {
                const v = detail.metrics[name];
                let statusClass = "insight-detail-panel__metric--unrun";
                let statusText = "Not analysed";
                let summary = "";
                if (v === "pending") {
                  statusClass = "insight-detail-panel__metric--pending";
                  statusText = "Analysing…";
                } else if (v === null) {
                  statusClass = "insight-detail-panel__metric--error";
                  statusText = "Failed";
                } else if (isMetricError(v)) {
                  statusClass = "insight-detail-panel__metric--error";
                  statusText = "Failed";
                  summary = v.error;
                } else if (v !== undefined) {
                  const m = v as FileMetric;
                  statusClass = `insight-detail-panel__metric--${m.status}`;
                  statusText = m.status;
                  summary = m.summary;
                }
                return (
                  <div
                    key={name}
                    className={`insight-detail-panel__metric ${statusClass}`}
                  >
                    <div className="insight-detail-panel__metric-header">
                      <span className="insight-detail-panel__metric-dot" />
                      <span className="insight-detail-panel__metric-label">
                        {label}
                      </span>
                      <span className="insight-detail-panel__metric-status">
                        {statusText}
                      </span>
                    </div>
                    {summary && (
                      <p className="insight-detail-panel__metric-summary">
                        {summary}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {detail.coverage && <CoverageSection coverage={detail.coverage} />}
          {!detail.coverage && (
            <div className="insight-detail-panel__section">
              <div className="insight-detail-panel__section-header">
                <span>Coverage</span>
                <span className="insight-detail-panel__unavailable">
                  not found
                </span>
              </div>
            </div>
          )}

          {detail.lint && <LintSection lint={detail.lint} />}
          {!detail.lint && (
            <div className="insight-detail-panel__section">
              <div className="insight-detail-panel__section-header">
                <span>Lint</span>
                <span className="insight-detail-panel__unavailable">
                  not found
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
