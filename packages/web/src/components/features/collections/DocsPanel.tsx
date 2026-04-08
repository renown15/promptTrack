import { useState } from "react";
import {
  useCollectionDocs,
  useDocContent,
  useMarkDocFresh,
  useRemoveDocFreshOverride,
} from "@/hooks/useCollections";
import { MarkdownViewer } from "@/components/features/collections/MarkdownViewer";
import "@/components/features/collections/DocsPanel.css";

const STALE_DAYS = 30;

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

type Props = { collectionId: string };

function DocModal({
  collectionId,
  relativePath,
  onClose,
}: {
  collectionId: string;
  relativePath: string;
  onClose: () => void;
}) {
  const { data: content, isLoading } = useDocContent(
    collectionId,
    relativePath
  );
  return (
    <div className="docs-modal__overlay" onClick={onClose}>
      <div
        className="docs-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="docs-modal__header">
          <span className="docs-modal__path">{relativePath}</span>
          <button
            className="docs-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="docs-modal__body">
          {isLoading && <div className="docs-modal__loading">Loading…</div>}
          {content !== undefined && <MarkdownViewer content={content} />}
        </div>
      </div>
    </div>
  );
}

export function DocsPanel({ collectionId }: Props) {
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [reviewingFile, setReviewingFile] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const { data: files, isLoading } = useCollectionDocs(collectionId, true);
  const markFresh = useMarkDocFresh(collectionId);
  const removeFresh = useRemoveDocFreshOverride(collectionId);

  function submitReview(relativePath: string) {
    markFresh.mutate(
      {
        relativePath,
        comment: reviewComment.trim() || "Reviewed — content is current",
      },
      {
        onSuccess: () => {
          setReviewingFile(null);
          setReviewComment("");
        },
      }
    );
  }

  return (
    <section className="docs-panel">
      <div className="docs-panel__header">
        <span className="docs-panel__title">Documentation</span>
        <span className="docs-panel__stale-legend">
          Files not updated in {STALE_DAYS}+ days are flagged as stale
        </span>
      </div>
      <div className="docs-panel__file-list">
        {isLoading && <div className="docs-panel__loading">Scanning…</div>}
        {files?.length === 0 && (
          <div className="docs-panel__empty">No markdown files found</div>
        )}
        {files?.map((file) => {
          const isReviewing = reviewingFile === file.relativePath;
          return (
            <div
              key={file.relativePath}
              className={`docs-panel__file${file.isStale ? " docs-panel__file--stale" : ""}${file.freshnessOverride ? " docs-panel__file--reviewed" : ""}`}
            >
              <button
                className="docs-panel__file-content"
                onClick={() => setOpenFile(file.relativePath)}
                title={file.relativePath}
              >
                <span className="docs-panel__file-name">{file.name}</span>
                <span className="docs-panel__file-path">
                  {file.relativePath}
                </span>
                <span className="docs-panel__file-meta">
                  <span>{file.lineCount} lines</span>
                  <span
                    className={file.isStale ? "docs-panel__age--stale" : ""}
                  >
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
                    onClick={() => removeFresh.mutate(file.relativePath)}
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
                      onChange={(e) => setReviewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitReview(file.relativePath);
                        if (e.key === "Escape") {
                          setReviewingFile(null);
                          setReviewComment("");
                        }
                      }}
                      autoFocus
                    />
                    <button
                      className="docs-panel__review-save"
                      onClick={() => submitReview(file.relativePath)}
                      disabled={markFresh.isPending}
                    >
                      Save
                    </button>
                    <button
                      className="docs-panel__review-cancel"
                      onClick={() => {
                        setReviewingFile(null);
                        setReviewComment("");
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    className="docs-panel__mark-reviewed"
                    onClick={() => setReviewingFile(file.relativePath)}
                  >
                    Mark as reviewed
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      {openFile && (
        <DocModal
          collectionId={collectionId}
          relativePath={openFile}
          onClose={() => setOpenFile(null)}
        />
      )}
    </section>
  );
}
