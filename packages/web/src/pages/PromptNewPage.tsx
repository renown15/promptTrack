import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PromptEditor } from "@/components/features/prompts/PromptEditor";
import { useCreatePrompt } from "@/hooks/usePrompts";
import { useProjectTree } from "@/hooks/useCollections";
import { collectionsApi } from "@/api/endpoints/collections";
import type { CreatePromptInput } from "@prompttrack/shared";
import "@/pages/PromptNewPage.css";

type LocationState = { collectionId?: string } | null;

export function PromptNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const { data: tree } = useProjectTree();
  const createPrompt = useCreatePrompt();

  const [selectedIds, setSelectedIds] = useState<string[]>(
    state?.collectionId ? [state.collectionId] : []
  );
  const [projectError, setProjectError] = useState("");

  const allCollections = tree?.collections ?? [];
  const selectedCollections = allCollections.filter((c) =>
    selectedIds.includes(c.id)
  );
  const availableCollections = allCollections.filter(
    (c) => !selectedIds.includes(c.id)
  );

  function addProject(collectionId: string) {
    setSelectedIds((prev) => [...prev, collectionId]);
    setProjectError("");
  }

  function removeProject(collectionId: string) {
    setSelectedIds((prev) => prev.filter((id) => id !== collectionId));
  }

  const handleSubmit = async (data: CreatePromptInput) => {
    if (selectedIds.length === 0) {
      setProjectError("Add this prompt to at least one collection.");
      return;
    }
    const prompt = await createPrompt.mutateAsync(data);
    await Promise.all(
      selectedIds.map((collectionId) =>
        collectionsApi.addPrompt(collectionId, prompt.id)
      )
    );
    navigate(`/prompts/${prompt.id}`);
  };

  return (
    <div className="prompt-new-page">
      <h1 className="prompt-new-page__title">New Prompt</h1>

      <div className="prompt-new-page__projects">
        <span className="prompt-new-page__projects-label">Collections</span>
        <div className="prompt-new-page__project-picker">
          {selectedCollections.map((c) => (
            <span key={c.id} className="prompt-new-page__tag">
              {c.name}
              <button
                type="button"
                className="prompt-new-page__tag-remove"
                onClick={() => removeProject(c.id)}
              >
                ×
              </button>
            </span>
          ))}
          {availableCollections.length > 0 && (
            <select
              className="prompt-new-page__project-select"
              value=""
              onChange={(e) => {
                if (e.target.value) addProject(e.target.value);
              }}
            >
              <option value="">+ Add to collection</option>
              {availableCollections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {projectError && (
          <span className="prompt-new-page__project-error">{projectError}</span>
        )}
      </div>

      <PromptEditor
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
        submitLabel="Create prompt"
      />
    </div>
  );
}
