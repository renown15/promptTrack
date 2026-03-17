import type { FileSnapshotDTO } from "@/api/endpoints/insights";
import { MetricBadge } from "@/components/features/insights/MetricBadge";
import "@/components/features/insights/InsightActivityStack.css";

type Props = {
  files: FileSnapshotDTO[];
  metricLabels: Record<string, string>;
  scanning: boolean;
  onFileClick: (relativePath: string) => void;
};

const MAX_CARDS = 12;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isPending(file: FileSnapshotDTO): boolean {
  return Object.values(file.metrics).some((v) => v === "pending");
}

export function InsightActivityStack({
  files,
  metricLabels,
  scanning,
  onFileClick,
}: Props) {
  const metricEntries = Object.entries(metricLabels);

  const recent = [...files]
    .sort((a, b) => {
      // During scan: pending files float to top, then sort by mtime
      if (scanning) {
        const aPending = isPending(a) ? 0 : 1;
        const bPending = isPending(b) ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, MAX_CARDS);

  return (
    <div className="insight-activity-stack">
      <div className="insight-activity-stack__header">Recent activity</div>
      <div className="insight-activity-stack__cards">
        {recent.map((file) => {
          const analyzing = isPending(file);
          return (
            <button
              key={file.relativePath}
              className={`insight-activity-stack__card${analyzing ? " insight-activity-stack__card--analyzing" : ""}`}
              onClick={() => onFileClick(file.relativePath)}
            >
              <div className="insight-activity-stack__card-top">
                <span
                  className={`insight-activity-stack__card-name${file.gitStatus && file.gitStatus !== "clean" ? ` insight-activity-stack__card-name--${file.gitStatus}` : ""}`}
                >
                  {file.name}
                </span>
                {file.gitStatus === "modified" && (
                  <span className="insight-activity-stack__git-badge insight-activity-stack__git-badge--modified">
                    M
                  </span>
                )}
                {file.gitStatus === "untracked" && (
                  <span className="insight-activity-stack__git-badge insight-activity-stack__git-badge--untracked">
                    U
                  </span>
                )}
                <span className="insight-activity-stack__card-right">
                  {file.lineDelta !== null && file.lineDelta !== 0 && (
                    <span
                      className={`insight-activity-stack__line-delta${file.lineDelta > 0 ? " insight-activity-stack__line-delta--add" : " insight-activity-stack__line-delta--remove"}`}
                    >
                      {file.lineDelta > 0
                        ? `+${file.lineDelta}`
                        : file.lineDelta}
                    </span>
                  )}
                  <span className="insight-activity-stack__card-time">
                    {analyzing ? "analyzing…" : timeAgo(file.updatedAt)}
                  </span>
                </span>
              </div>
              <div className="insight-activity-stack__card-path">
                {file.relativePath}
              </div>
              {metricEntries.length > 0 && (
                <div className="insight-activity-stack__card-metrics">
                  {metricEntries.map(([name, label]) => (
                    <MetricBadge
                      key={name}
                      label={label}
                      value={file.metrics[name]}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
        {recent.length === 0 && (
          <div className="insight-activity-stack__empty">No files yet</div>
        )}
      </div>
    </div>
  );
}
