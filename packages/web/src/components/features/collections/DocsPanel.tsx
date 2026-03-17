import { useState } from "react";
import { useCollectionDocs, useDocContent } from "@/hooks/useCollections";
import { MarkdownViewer } from "@/components/features/collections/MarkdownViewer";
import "@/components/features/collections/DocsPanel.css";

type Props = {
  collectionId: string;
};

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
  const { data: files, isLoading } = useCollectionDocs(collectionId, true);

  return (
    <section className="docs-panel">
      <div className="docs-panel__header">
        <span className="docs-panel__title">Documentation</span>
      </div>
      <div className="docs-panel__file-list">
        {isLoading && <div className="docs-panel__loading">Scanning…</div>}
        {files?.length === 0 && (
          <div className="docs-panel__empty">No markdown files found</div>
        )}
        {files?.map((file) => (
          <button
            key={file.relativePath}
            className="docs-panel__file"
            onClick={() => setOpenFile(file.relativePath)}
            title={file.relativePath}
          >
            <span className="docs-panel__file-name">{file.name}</span>
            <span className="docs-panel__file-path">{file.relativePath}</span>
            <span className="docs-panel__file-meta">
              <span>{file.lineCount} lines</span>
              <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
            </span>
          </button>
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
