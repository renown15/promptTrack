import type { LlmCallLogEntryDTO } from "@/api/endpoints/insights";
import "@/components/features/insights/LlmCallLogPanel.css";

type Props = {
  entries: LlmCallLogEntryDTO[];
  isLoading: boolean;
  onClear: () => void;
  onClose: () => void;
};

function statusClass(status: string): string {
  if (status === "green") return "llm-log__status--green";
  if (status === "amber") return "llm-log__status--amber";
  if (status === "red") return "llm-log__status--red";
  if (status === "running") return "llm-log__status--running";
  return "llm-log__status--error";
}

function fmt(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function LlmCallLogPanel({
  entries,
  isLoading,
  onClear,
  onClose,
}: Props) {
  return (
    <div className="llm-log">
      <div className="llm-log__header">
        <span className="llm-log__title">LLM Call Log</span>
        <span className="llm-log__count">{entries.length} entries</span>
        <div className="llm-log__actions">
          <button className="llm-log__clear-btn" onClick={onClear}>
            Clear
          </button>
          <button className="llm-log__close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      {isLoading && <div className="llm-log__loading">Loading…</div>}

      {!isLoading && entries.length === 0 && (
        <div className="llm-log__empty">No calls recorded yet.</div>
      )}

      {!isLoading && entries.length > 0 && (
        <div className="llm-log__table-wrap">
          <table className="llm-log__table">
            <thead>
              <tr>
                <th>File</th>
                <th>Metric</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Chars</th>
                <th>Tokens in/out</th>
                <th>Model</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className={`llm-log__row llm-log__row--${e.status}`}
                >
                  <td className="llm-log__cell--path" title={e.relativePath}>
                    {e.relativePath.split("/").pop()}
                  </td>
                  <td>{e.metric}</td>
                  <td>
                    <span
                      className={`llm-log__status ${statusClass(e.status)}`}
                    >
                      {e.status}
                    </span>
                    {e.errorReason && (
                      <span className="llm-log__error" title={e.errorReason}>
                        {" "}
                        ⚠
                      </span>
                    )}
                  </td>
                  <td className="llm-log__cell--num">
                    {e.status === "running"
                      ? `${Math.round((Date.now() - new Date(e.startedAt).getTime()) / 1000)}s…`
                      : fmt(e.durationMs)}
                  </td>
                  <td className="llm-log__cell--num">
                    {e.promptChars.toLocaleString()}
                  </td>
                  <td className="llm-log__cell--num">
                    {e.promptTokens ?? "—"} / {e.responseTokens ?? "—"}
                  </td>
                  <td className="llm-log__cell--model">{e.model}</td>
                  <td className="llm-log__cell--time">
                    {new Date(e.startedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
