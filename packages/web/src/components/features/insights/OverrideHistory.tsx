import type { FileStatusOverrideDTO } from "@/api/endpoints/insights.overrides";
import "@/components/features/insights/OverrideHistory.css";
import { useState } from "react";

const REASON_LABEL: Record<string, string> = {
  file_changed: "file changed",
  user_update: "replaced",
  user_delete: "removed",
};

type Props = {
  history: FileStatusOverrideDTO[];
};

export function OverrideHistory({ history }: Props) {
  const [open, setOpen] = useState(false);

  if (history.length === 0) return null;

  return (
    <div className="override-history">
      <button
        className="override-history__toggle"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "▾" : "▸"} History ({history.length})
      </button>
      {open && (
        <div className="override-history__list">
          {history.map((entry) => {
            const isActive = entry.supersededAt === null;
            return (
              <div
                key={entry.createdAt}
                className={`override-history__entry ${isActive ? "override-history__entry--active" : "override-history__entry--superseded"}`}
              >
                <div className="override-history__entry-header">
                  <span className="override-history__status">
                    {entry.status}
                  </span>
                  <span className="override-history__source">
                    by {entry.source}
                  </span>
                  {!isActive && entry.supersededBy && (
                    <span className="override-history__reason">
                      {REASON_LABEL[entry.supersededBy] ?? entry.supersededBy}
                    </span>
                  )}
                  {isActive && (
                    <span className="override-history__reason">active</span>
                  )}
                </div>
                <div className="override-history__comment">{entry.comment}</div>
                <div className="override-history__date">
                  {new Date(entry.createdAt).toLocaleString()}
                  {entry.supersededAt &&
                    ` → ${new Date(entry.supersededAt).toLocaleString()}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
