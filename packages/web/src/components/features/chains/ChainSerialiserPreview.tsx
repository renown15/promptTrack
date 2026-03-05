import type { SerialiserOutput } from "@prompttrack/shared";
import "@/components/features/chains/ChainSerialiserPreview.css";

type Props = {
  output: SerialiserOutput | null;
  isLoading: boolean;
};

export function ChainSerialiserPreview({ output, isLoading }: Props) {
  if (isLoading) {
    return <p className="chain-serialiser-preview__loading">Serialising…</p>;
  }

  if (!output) return null;

  return (
    <div className="chain-serialiser-preview">
      <div className="chain-serialiser-preview__meta">
        <span className="chain-serialiser-preview__token">
          ~{output.tokenEstimate} tokens
        </span>
        {output.unresolvedVariables.length > 0 && (
          <span className="chain-serialiser-preview__warn">
            Unresolved: {output.unresolvedVariables.join(", ")}
          </span>
        )}
      </div>

      <div className="chain-serialiser-preview__messages">
        {output.messages.map((msg, i) => (
          <div
            key={i}
            className={`chain-serialiser-preview__message chain-serialiser-preview__message--${msg.role}`}
          >
            <div className="chain-serialiser-preview__role">{msg.role}</div>
            <pre className="chain-serialiser-preview__content">
              {msg.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
