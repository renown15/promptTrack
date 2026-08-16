import { AgentKeysPanel } from "@/components/features/collections/AgentKeysPanel";
import { DirPicker } from "@/components/features/collections/DirPicker";
import { DocsPanel } from "@/components/features/collections/DocsPanel";
import { ExecutivePromptModal } from "@/components/features/prompts/ExecutivePromptModal";
import { PromptHistory } from "@/components/features/prompts/PromptHistory";
import { PromptList } from "@/components/features/prompts/PromptList";
import { useCollections, useUpdateCollection } from "@/hooks/useCollections";
import "@/pages/ProjectPage.css";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: collections } = useCollections();
  const [executiveIds, setExecutiveIds] = useState<string[] | null>(null);
  const [pickingDir, setPickingDir] = useState(false);
  const updateCollection = useUpdateCollection(id ?? "");

  const collection = collections?.find((c) => c.id === id);

  function handleDirSelect(path: string) {
    if (!id) return;
    updateCollection.mutate({ directory: path });
    setPickingDir(false);
  }

  return (
    <div className="project-page">
      <div className="project-page__header">
        <h1 className="project-page__title">
          {collection?.name ?? "Collection"}
        </h1>
        <div className="project-page__dir">
          <button
            className="project-page__dir-display"
            onClick={() => setPickingDir(true)}
          >
            <span className="project-page__dir-icon">📁</span>
            <span className="project-page__dir-path">
              {collection?.directory ?? "Set repo directory…"}
            </span>
          </button>
        </div>
      </div>

      <div className="project-page__body">
        <section className="project-page__panel">
          <div className="project-page__panel-header">
            <span className="project-page__panel-title">Prompts</span>
            <button
              className="project-page__new-btn"
              onClick={() =>
                navigate("/prompts/new", { state: { collectionId: id } })
              }
            >
              + New prompt
            </button>
          </div>
          <div className="project-page__panel-body">
            {id && <PromptList collectionId={id} />}
          </div>
        </section>

        <section className="project-page__panel">
          {id && (
            <PromptHistory
              collectionId={id}
              onBuild={(ids) => setExecutiveIds(ids)}
            />
          )}
        </section>
      </div>

      {id && collection?.directory && <DocsPanel collectionId={id} />}
      {id && <AgentKeysPanel collectionId={id} />}

      {executiveIds && id && (
        <ExecutivePromptModal
          selectedIds={executiveIds}
          collectionId={id}
          onClose={() => setExecutiveIds(null)}
        />
      )}

      {pickingDir && (
        <DirPicker
          onSelect={handleDirSelect}
          onClose={() => setPickingDir(false)}
        />
      )}
    </div>
  );
}
