import { useState } from "react";
import { DocAnalysisBanner } from "@/components/features/collections/DocAnalysisBanner";
import { DocsFileCard } from "@/components/features/collections/DocsFileCard";
import { MarkdownViewer } from "@/components/features/collections/MarkdownViewer";
import {
  useCollectionDocs,
  useDocAnalysis,
  useDocContent,
  useMarkDocFresh,
  useRemoveDocFreshOverride,
} from "@/hooks/useCollections";
import "@/components/features/collections/DocsPanel.css";

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
  const { data: analysis } = useDocAnalysis(collectionId);
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
          Files not updated in 30+ days are flagged as stale
        </span>
      </div>
      {analysis && <DocAnalysisBanner analysis={analysis} />}
      <div className="docs-panel__file-list">
        {isLoading && <div className="docs-panel__loading">Scanning…</div>}
        {files?.length === 0 && (
          <div className="docs-panel__empty">No markdown files found</div>
        )}
        {files?.map((file) => (
          <DocsFileCard
            key={file.relativePath}
            file={file}
            isReviewing={reviewingFile === file.relativePath}
            reviewComment={reviewComment}
            savePending={markFresh.isPending}
            onOpen={() => setOpenFile(file.relativePath)}
            onStartReview={() => setReviewingFile(file.relativePath)}
            onCancelReview={() => {
              setReviewingFile(null);
              setReviewComment("");
            }}
            onCommentChange={setReviewComment}
            onSubmitReview={() => submitReview(file.relativePath)}
            onRemoveFresh={() => removeFresh.mutate(file.relativePath)}
          />
        ))}
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
