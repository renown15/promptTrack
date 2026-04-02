import type {
  FileSnapshotDTO,
  FileMetricError,
} from "@/api/endpoints/insights";
import { MetricBadge } from "@/components/features/insights/MetricBadge";
import "@/components/features/insights/FileInsightCard.css";

type Props = {
  file: FileSnapshotDTO;
  metricLabels: Record<string, string>;
  onRetry?: () => void;
  onInspect?: (path: string) => void;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isMetricError(v: unknown): v is FileMetricError {
  return typeof v === "object" && v !== null && "error" in v;
}

export function FileInsightCard({
  file,
  metricLabels,
  onRetry,
  onInspect,
}: Props) {
  const labelEntries = Object.entries(metricLabels);

  const failedMetrics = labelEntries.flatMap(([name, label]) => {
    const v = file.metrics[name];
    if (v === null) return [{ label, reason: "Analysis failed" }];
    if (isMetricError(v)) return [{ label, reason: v.error }];
    return [];
  });

  return (
    <div className="file-insight-card">
      <div className="file-insight-card__header">
        <span className="file-insight-card__name">{file.name}</span>
        <span className="file-insight-card__type">.{file.fileType}</span>
        {onInspect && (
          <button
            className="file-insight-card__inspect-btn"
            title="Inspect file"
            onClick={() => onInspect(file.relativePath)}
          >
            👓
          </button>
        )}
      </div>
      <div className="file-insight-card__meta">
        <span>{file.lineCount}L</span>
        <span>{timeAgo(file.updatedAt)}</span>
        {file.coverage !== null && (
          <span className="file-insight-card__coverage">
            Cov: {Math.round(file.coverage)}%
          </span>
        )}
        {file.problemScore > 0 && (
          <span
            className={`file-insight-card__score file-insight-card__score--${file.problemScore >= 10 ? "high" : file.problemScore >= 5 ? "mid" : "low"}`}
          >
            ⚠ {file.problemScore}
          </span>
        )}
      </div>
      {labelEntries.length > 0 && (
        <div className="file-insight-card__metrics">
          {labelEntries.map(([name, label]) => (
            <MetricBadge key={name} label={label} value={file.metrics[name]} />
          ))}
        </div>
      )}
      {failedMetrics.length > 0 && (
        <div className="file-insight-card__error-row">
          <span className="file-insight-card__error-label">
            {failedMetrics
              .map(({ label, reason }) => `${label}: ${reason}`)
              .join(" · ")}
          </span>
          {onRetry && (
            <button className="file-insight-card__retry-btn" onClick={onRetry}>
              ↻ Retry
            </button>
          )}
        </div>
      )}
      <div className="file-insight-card__path">{file.relativePath}</div>
    </div>
  );
}
