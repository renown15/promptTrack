import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePrompt, useCreatePromptVersion } from "@/hooks/usePrompts";
import { PromptEditor } from "@/components/features/prompts/PromptEditor";
import type { CreatePromptInput } from "@prompttrack/shared";
import "@/pages/PromptDetailPage.css";

export function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showVersionEditor, setShowVersionEditor] = useState(false);
  const { data: prompt, isLoading } = usePrompt(id ?? "");
  const createVersion = useCreatePromptVersion(id ?? "");

  if (isLoading) return <p className="prompt-detail__loading">Loading…</p>;
  if (!prompt)
    return <p className="prompt-detail__not-found">Prompt not found.</p>;

  const latestVersion = prompt.versions[prompt.versions.length - 1];

  const handleNewVersion = async (data: CreatePromptInput) => {
    await createVersion.mutateAsync({
      content: data.content,
      role: data.role,
      variables: data.variables,
      modelParameters: data.modelParameters,
    });
    setShowVersionEditor(false);
  };

  return (
    <div>
      <div className="prompt-detail__header">
        <div>
          <h1 className="prompt-detail__title">{prompt.name}</h1>
          <div className="prompt-detail__meta">
            <span className="prompt-detail__env">{prompt.environment}</span>
            <span className="prompt-detail__version">
              v{prompt.currentVersion}
            </span>
          </div>
        </div>
        <div className="prompt-detail__actions">
          <button
            className="prompt-detail__btn"
            onClick={() => navigate("/prompts")}
          >
            Back
          </button>
          <button
            className="prompt-detail__btn--primary"
            onClick={() => setShowVersionEditor(!showVersionEditor)}
          >
            New version
          </button>
        </div>
      </div>

      {showVersionEditor && (
        <PromptEditor
          onSubmit={handleNewVersion}
          onCancel={() => setShowVersionEditor(false)}
          {...(latestVersion !== undefined && {
            defaultValues: {
              content: latestVersion.content,
              role: latestVersion.role,
            },
          })}
          submitLabel="Save version"
        />
      )}

      <div className="prompt-detail__versions">
        <h2 className="prompt-detail__versions-title">
          Versions ({prompt.versions.length})
        </h2>
        {[...prompt.versions].reverse().map((version) => (
          <div key={version.id} className="prompt-detail__version-item">
            <div className="prompt-detail__version-header">
              <span className="prompt-detail__version-num">
                v{version.versionNumber} · {version.role}
              </span>
              <span className="prompt-detail__version-date">
                {new Date(version.createdAt).toLocaleDateString()}
              </span>
            </div>
            <pre className="prompt-detail__version-content">
              {version.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
