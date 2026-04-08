import type { MetricOverrideDTO } from "@/api/endpoints/insights";
import "@/components/features/insights/FileOverrideDialog.css";
import { OverrideHistory } from "@/components/features/insights/OverrideHistory";
import { useOverrideHistory } from "@/hooks/useInsights";
import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "red", label: "Red" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
] as const;

type StatusOption = (typeof STATUS_OPTIONS)[number]["value"];

type Props = {
  collectionId: string;
  relativePath: string;
  metric: string;
  metricLabel: string;
  existing: MetricOverrideDTO | null;
  onSave: (status: string, comment: string) => void;
  onRemove: () => void;
  onClose: () => void;
  saving: boolean;
};

export function FileOverrideDialog({
  collectionId,
  relativePath,
  metric,
  metricLabel,
  existing,
  onSave,
  onRemove,
  onClose,
  saving,
}: Props) {
  const [status, setStatus] = useState<StatusOption>(
    (existing?.status as StatusOption) ?? "accepted"
  );
  const [comment, setComment] = useState(existing?.comment ?? "");
  const { data: history } = useOverrideHistory(collectionId, relativePath);
  const metricHistory = (history ?? []).filter((h) => h.metric === metric);

  return (
    <div className="file-override-dialog__overlay" onClick={onClose}>
      <div
        className="file-override-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="file-override-dialog__header">
          <div>
            <div className="file-override-dialog__title">
              Override · {metricLabel}
            </div>
            <div className="file-override-dialog__subtitle">{relativePath}</div>
          </div>
          <button className="file-override-dialog__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="file-override-dialog__body">
          {existing && (
            <div className="file-override-dialog__existing">
              <span className="file-override-dialog__existing-label">
                Current override ({existing.source}):
              </span>
              {existing.status} — {existing.comment}
            </div>
          )}

          <div className="file-override-dialog__field">
            <span className="file-override-dialog__label">New status</span>
            <div className="file-override-dialog__status-row">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`file-override-dialog__status-btn file-override-dialog__status-btn--${opt.value}${status === opt.value ? " file-override-dialog__status-btn--active" : ""}`}
                  onClick={() => setStatus(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="file-override-dialog__field">
            <span className="file-override-dialog__label">Comment</span>
            <textarea
              className="file-override-dialog__textarea"
              rows={3}
              placeholder="Explain why you are overriding this status…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {metricHistory.length > 0 && (
            <OverrideHistory history={metricHistory} />
          )}
        </div>

        <div className="file-override-dialog__footer">
          {existing ? (
            <button
              className="file-override-dialog__remove-btn"
              onClick={onRemove}
              disabled={saving}
            >
              Remove override
            </button>
          ) : (
            <span />
          )}
          <div className="file-override-dialog__actions">
            <button
              className="file-override-dialog__cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="file-override-dialog__save-btn"
              onClick={() => onSave(status, comment)}
              disabled={saving || comment.trim().length === 0}
            >
              {saving ? "Saving…" : "Save override"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
