import { useState } from "react";
import { useParams } from "react-router-dom";
import { useChain, useSerialiseChain } from "@/hooks/useChain";
import { useChainVariables } from "@/hooks/useChainVariables";
import { ChainCanvas } from "@/components/features/chains/ChainCanvas";
import { ChainVariableForm } from "@/components/features/chains/ChainVariableForm";
import { ChainSerialiserPreview } from "@/components/features/chains/ChainSerialiserPreview";
import type { SerialiserOutput } from "@prompttrack/shared";
import "@/pages/ChainDetailPage.css";

export function ChainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const chainId = id ?? "";

  const { data: chain, isLoading } = useChain(chainId);
  const { data: variablesData } = useChainVariables(chainId);
  const serialise = useSerialiseChain(chainId);

  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {}
  );
  const [preview, setPreview] = useState<SerialiserOutput | null>(null);

  const variables = variablesData?.variables ?? [];

  const handleSerialise = () => {
    serialise.mutate(
      { variables: variableValues },
      { onSuccess: (output) => setPreview(output) }
    );
  };

  if (isLoading) {
    return <p className="chain-detail-page__loading">Loading chain…</p>;
  }

  if (!chain) {
    return <p className="chain-detail-page__error">Chain not found.</p>;
  }

  return (
    <div className="chain-detail-page">
      <div className="chain-detail-page__header">
        <h1 className="chain-detail-page__title">{chain.name}</h1>
        {chain.description && (
          <p className="chain-detail-page__description">{chain.description}</p>
        )}
      </div>

      <div className="chain-detail-page__canvas">
        <ChainCanvas
          chainId={chainId}
          initialVersion={chain.currentVersionData}
        />
      </div>

      <div className="chain-detail-page__sidebar">
        {variables.length > 0 && (
          <ChainVariableForm
            variables={variables}
            values={variableValues}
            onChange={setVariableValues}
          />
        )}

        <button
          className="chain-detail-page__serialise-btn"
          onClick={handleSerialise}
          disabled={serialise.isPending || !chain.currentVersionData}
        >
          {serialise.isPending ? "Serialising…" : "Serialise"}
        </button>

        <ChainSerialiserPreview
          output={preview}
          isLoading={serialise.isPending}
        />
      </div>
    </div>
  );
}
