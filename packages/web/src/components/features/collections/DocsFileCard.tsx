import type { DocFile } from "@/hooks/useCollections";
import "@/components/features/collections/DocsPanel.css";

function ageLabel(ageMs: number): string {
  const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)}y ago`;
}

interface Props {
  file: DocFile;
  isReviewing: boolean;
  reviewComment: string;
  savePending: boolean;
  onOpen: () => void;
  onStartReview: () => void;
  onCancelReview: () => void;
  onCommentChange: (v: string) => void;
  onSubmitReview: () => void;
  onRemoveFresh: () => void;
}

export function DocsFileCard({
  file,
  isReviewing,
  reviewComment,
  savePending,
  onOpen,
  onStartReview,
  onCancelReview,
  onCommentChange,
  onSubmitReview,
  onRemoveFresh,
}: Props) {
  return (
    <div
      className={`docs-panel__file${file.isStale ? " docs-panel__file--stale" : ""}${file.freshnessOverride ? " docs-panel__file--reviewed" : ""}`}
    >
      <button
        className="docs-panel__file-content"
        onClick={onOpen}
        title={file.relativePath}
      >
        <span className="docs-panel__file-name">{file.name}</span>
        <span className="docs-panel__file-path">{file.relativePath}</span>
        <span className="docs-panel__file-meta">
          <span>{file.lineCount} lines</span>
          <span className={file.isStale ? "docs-panel__age--stale" : ""}>
            {ageLabel(file.ageMs)}
          </span>
          {file.isStale && (
            <span className="docs-panel__stale-badge">stale</span>
          )}
          {file.freshnessOverride && (
            <span
              className="docs-panel__reviewed-badge"
              title={file.freshnessOverride.comment}
            >
              ✓ reviewed
            </span>
          )}
        </span>
      </button>
      {file.freshnessOverride && (
        <div className="docs-panel__override-row">
          <span
            className="docs-panel__override-comment"
            title={file.freshnessOverride.comment}
          >
            {file.freshnessOverride.comment}
          </span>
          <button
            className="docs-panel__override-remove"
            onClick={onRemoveFresh}
            title="Remove reviewed mark"
          >
            ✕
          </button>
        </div>
      )}
      {(file.isStale || isReviewing) &&
        !file.freshnessOverride &&
        (isReviewing ? (
          <div className="docs-panel__review-form">
            <input
              className="docs-panel__review-input"
              placeholder="Why is this current? (optional)"
              value={reviewComment}
              onChange={(e) => onCommentChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmitReview();
                if (e.key === "Escape") onCancelReview();
              }}
              autoFocus
            />
            <button
              className="docs-panel__review-save"
              onClick={onSubmitReview}
              disabled={savePending}
            >
              Save
            </button>
            <button
              className="docs-panel__review-cancel"
              onClick={onCancelReview}
            >
              ✕
            </button>
          </div>
        ) : (
          <button className="docs-panel__mark-reviewed" onClick={onStartReview}>
            Mark as reviewed
          </button>
        ))}
    </div>
  );
}
