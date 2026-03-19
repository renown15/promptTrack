import { useEffect } from "react";
import {
  useFileContent,
  useGenerateFileSummary,
  useGenerateRefactorIdeas,
} from "@/hooks/useFileInspector";
import { useFileDetail } from "@/hooks/useInsights";
import "@/components/features/insights/FileInspectorModal.css";
import type { FileMetric, FileMetricError } from "@/api/endpoints/insights";

type Props = {
  collectionId: string;
  relativePath: string;
  metricLabels: Record<string, string>;
  onClose: () => void;
};

function isError(v: unknown): v is FileMetricError {
  return typeof v === "object" && v !== null && "error" in v;
}

function statusClass(v: unknown): string {
  if (!v || v === "pending") return "file-inspector__metric--pending";
  if (isError(v)) return "file-inspector__metric--error";
  return `file-inspector__metric--${(v as FileMetric).status}`;
}

function MetricRow({ label, value }: { label: string; value: unknown }) {
  const text =
    !value || value === "pending"
      ? "pending"
      : isError(value)
        ? `error: ${(value as FileMetricError).error}`
        : `${(value as FileMetric).status} — ${(value as FileMetric).summary}`;

  return (
    <div className={`file-inspector__metric ${statusClass(value)}`}>
      <span className="file-inspector__metric-dot" />
      <span className="file-inspector__metric-label">{label}</span>
      <span className="file-inspector__metric-text">{text}</span>
    </div>
  );
}

export function FileInspectorModal({
  collectionId,
  relativePath,
  metricLabels,
  onClose,
}: Props) {
  const content = useFileContent(collectionId, relativePath);
  const detail = useFileDetail(collectionId, relativePath);
  const summary = useGenerateFileSummary(collectionId);
  const refactor = useGenerateRefactorIdeas(collectionId);

  useEffect(() => {
    summary.mutate(relativePath);
    refactor.mutate(relativePath);
  }, [relativePath]);

  const lineCount = content.data?.content.split("\n").length ?? null;

  const filename = relativePath.split("/").pop() ?? relativePath;

  return (
    <div className="file-inspector__overlay" onClick={onClose}>
      <div
        className="file-inspector__modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="file-inspector__header">
          <span className="file-inspector__title">{filename}</span>
          <span className="file-inspector__path">{relativePath}</span>
          {lineCount !== null && (
            <span className="file-inspector__line-count">{lineCount}L</span>
          )}
          <button
            className="file-inspector__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="file-inspector__body">
          {/* Left — file content */}
          <div className="file-inspector__pane file-inspector__pane--content">
            {content.isPending && (
              <div className="file-inspector__loading">Loading…</div>
            )}
            {content.isError && (
              <div className="file-inspector__error">Could not load file</div>
            )}
            {content.data && (
              <pre className="file-inspector__code">
                <code>{content.data.content}</code>
              </pre>
            )}
          </div>

          {/* Right — summary + metrics */}
          <div className="file-inspector__pane file-inspector__pane--meta">
            <section className="file-inspector__section">
              <h3 className="file-inspector__section-title">Summary</h3>
              {summary.isPending && (
                <p className="file-inspector__summary-loading">Generating…</p>
              )}
              {summary.isError && (
                <p className="file-inspector__summary-error">
                  Summary unavailable
                </p>
              )}
              {summary.data && (
                <p className="file-inspector__summary">
                  {summary.data.summary}
                </p>
              )}
            </section>

            <section className="file-inspector__section">
              <h3 className="file-inspector__section-title">Refactor Ideas</h3>
              {refactor.isPending && (
                <p className="file-inspector__summary-loading">Generating…</p>
              )}
              {refactor.isError && (
                <p className="file-inspector__summary-error">Unavailable</p>
              )}
              {refactor.data && (
                <p className="file-inspector__summary">{refactor.data.ideas}</p>
              )}
            </section>

            <section className="file-inspector__section">
              <h3 className="file-inspector__section-title">Metrics</h3>
              {detail.isPending && (
                <div className="file-inspector__loading">Loading…</div>
              )}
              {detail.data &&
                Object.entries(metricLabels).map(([name, label]) => (
                  <MetricRow
                    key={name}
                    label={label}
                    value={detail.data!.metrics[name]}
                  />
                ))}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
