import { useState, useCallback } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import {
  usePrompt,
  useCreatePromptVersion,
  usePromptChains,
  useDeletePrompt,
} from "@/hooks/usePrompts";
import { PromptEditor } from "@/components/features/prompts/PromptEditor";
import { ProjectPicker } from "@/components/features/collections/ProjectPicker";
import type { CreatePromptInput } from "@prompttrack/shared";
import "@/pages/PromptDetailPage.css";

export function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showVersionEditor, setShowVersionEditor] = useState(false);
  const { data: prompt, isLoading } = usePrompt(id ?? "");
  const createVersion = useCreatePromptVersion(id ?? "");
  const deletePrompt = useDeletePrompt();
  const { data: chains } = usePromptChains(id ?? "");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback((content: string, versionId: string) => {
    void navigator.clipboard.writeText(content).then(() => {
      setCopiedId(versionId);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  async function handleDelete() {
    if (
      !id ||
      !window.confirm(`Delete "${prompt?.name}"? This cannot be undone.`)
    )
      return;
    await deletePrompt.mutateAsync(id);
    navigate(-1);
  }

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
          <div className="prompt-detail__meta-row">
            <div className="prompt-detail__meta-section">
              <span className="prompt-detail__meta-label">Collections</span>
              <ProjectPicker resourceId={prompt.id} resourceType="prompt" />
            </div>
            <div className="prompt-detail__meta-section">
              <span className="prompt-detail__meta-label">
                Used in Agent Instructions
              </span>
              <div className="prompt-detail__chain-list">
                {!chains && (
                  <span className="prompt-detail__meta-empty">Loading…</span>
                )}
                {chains && chains.length === 0 && (
                  <span className="prompt-detail__meta-empty">None</span>
                )}
                {chains?.map((chain) => (
                  <NavLink
                    key={chain.id}
                    to={`/chains/${chain.id}`}
                    className="prompt-detail__chain-link"
                  >
                    &#128279; {chain.name}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="prompt-detail__actions">
          <button className="prompt-detail__btn" onClick={() => navigate(-1)}>
            Back
          </button>
          <button
            className="prompt-detail__btn--danger"
            onClick={handleDelete}
            disabled={deletePrompt.isPending}
          >
            Delete
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
          hidePromptMeta
          defaultValues={{
            name: prompt.name,
            ...(latestVersion !== undefined && {
              content: latestVersion.content,
              role: latestVersion.role,
            }),
          }}
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
              <div className="prompt-detail__version-header-right">
                <span className="prompt-detail__version-date">
                  {new Date(version.createdAt).toLocaleDateString()}
                </span>
                <button
                  className="prompt-detail__copy-btn"
                  onClick={() => handleCopy(version.content, version.id)}
                >
                  {copiedId === version.id ? "Copied!" : "Copy"}
                </button>
              </div>
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
