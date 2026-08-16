import { useState } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import { useChain, useSerialiseChain } from "@/hooks/useChain";
import { useChainVariables } from "@/hooks/useChainVariables";
import { usePromptsWithContent } from "@/hooks/usePrompts";
import { ChainVariableForm } from "@/components/features/chains/ChainVariableForm";
import { ChainSerialiserPreview } from "@/components/features/chains/ChainSerialiserPreview";
import { ProjectPicker } from "@/components/features/collections/ProjectPicker";
import type { SerialiserOutput } from "@prompttrack/shared";
import "@/pages/ChainDetailPage.css";

export function ChainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const chainId = id ?? "";

  const { data: chain, isLoading } = useChain(chainId);
  const { data: variablesData } = useChainVariables(chainId);
  const serialise = useSerialiseChain(chainId);

  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {}
  );
  const [preview, setPreview] = useState<SerialiserOutput | null>(null);
  const [copied, setCopied] = useState(false);

  const nodes = chain?.currentVersionData?.nodes ?? [];
  const orderedNodes = [...nodes].sort((a, b) => a.positionX - b.positionX);
  const promptIds = orderedNodes.map((n) => n.promptId);

  const { data: prompts } = usePromptsWithContent(promptIds);
  const promptMap = new Map((prompts ?? []).map((p) => [p.id, p]));

  const variables = variablesData?.variables ?? [];

  const handleSerialise = () => {
    serialise.mutate(
      { variables: variableValues },
      { onSuccess: (output) => setPreview(output) }
    );
  };

  async function handleCopyAll() {
    const parts = orderedNodes.map((node, i) => {
      const prompt = promptMap.get(node.promptId);
      const name = prompt?.name ?? `Prompt ${i + 1}`;
      const version = prompt?.versions.find(
        (v) => v.versionNumber === node.promptVersionNumber
      );
      const content = version?.content ?? node.snapshotContent ?? "";
      return `=== ${name} ===\n${content}`;
    });
    await navigator.clipboard.writeText(parts.join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading)
    return <p className="chain-detail-page__loading">Loading chain…</p>;
  if (!chain)
    return <p className="chain-detail-page__error">Chain not found.</p>;

  const showSidebar = variables.length > 0 || preview !== null;

  return (
    <div className="chain-detail-page">
      <div className="chain-detail-page__header">
        <div className="chain-detail-page__header-top">
          <div className="chain-detail-page__title-group">
            <h1 className="chain-detail-page__title">{chain.name}</h1>
            {chain.description && (
              <p className="chain-detail-page__description">
                {chain.description}
              </p>
            )}
          </div>
          <div className="chain-detail-page__actions">
            <button
              className="chain-detail-page__btn"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
            <button
              className="chain-detail-page__btn"
              onClick={() => void handleCopyAll()}
              disabled={orderedNodes.length === 0}
            >
              {copied ? "Copied!" : "Copy all"}
            </button>
            <button
              className="chain-detail-page__btn--primary"
              onClick={handleSerialise}
              disabled={serialise.isPending || !chain.currentVersionData}
            >
              {serialise.isPending ? "Serialising…" : "Serialise"}
            </button>
          </div>
        </div>
        <div className="chain-detail-page__meta">
          <ProjectPicker resourceId={chainId} resourceType="chain" />
        </div>
      </div>

      <div
        className={`chain-detail-page__body${showSidebar ? " chain-detail-page__body--with-sidebar" : ""}`}
      >
        <div className="chain-detail-page__prompts">
          {orderedNodes.length === 0 && (
            <p className="chain-detail-page__empty">
              No prompts in this chain yet.
            </p>
          )}
          {orderedNodes.map((node, i) => {
            const prompt = promptMap.get(node.promptId);
            const version = prompt?.versions.find(
              (v) => v.versionNumber === node.promptVersionNumber
            );
            const content =
              version?.content ?? node.snapshotContent ?? "(no content)";
            const name = prompt?.name ?? `Prompt ${i + 1}`;
            return (
              <div key={node.id} className="chain-detail-page__prompt-block">
                <div className="chain-detail-page__prompt-header">
                  <span className="chain-detail-page__prompt-index">
                    {i + 1}
                  </span>
                  <span className="chain-detail-page__prompt-name">{name}</span>
                  <span className="chain-detail-page__prompt-version">
                    v{node.promptVersionNumber}
                  </span>
                  {prompt && (
                    <NavLink
                      to={`/prompts/${prompt.id}`}
                      className="chain-detail-page__prompt-link"
                    >
                      ↗
                    </NavLink>
                  )}
                </div>
                <pre className="chain-detail-page__prompt-content">
                  {content}
                </pre>
              </div>
            );
          })}
        </div>

        {showSidebar && (
          <div className="chain-detail-page__sidebar">
            {variables.length > 0 && (
              <ChainVariableForm
                variables={variables}
                values={variableValues}
                onChange={setVariableValues}
              />
            )}
            <ChainSerialiserPreview
              output={preview}
              isLoading={serialise.isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}
