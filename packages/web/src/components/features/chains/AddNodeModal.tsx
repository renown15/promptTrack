import { useState } from "react";
import { usePrompts } from "@/hooks/usePrompts";
import "@/components/features/chains/AddNodeModal.css";

type Props = {
  onAdd: (promptId: string, refType: "link" | "copy") => void;
  onClose: () => void;
};

export function AddNodeModal({ onAdd, onClose }: Props) {
  const { data: prompts, isLoading } = usePrompts();
  const [selectedId, setSelectedId] = useState("");
  const [refType, setRefType] = useState<"link" | "copy">("link");

  const handleAdd = () => {
    if (!selectedId) return;
    onAdd(selectedId, refType);
    onClose();
  };

  return (
    <div className="add-node-modal__overlay" onClick={onClose}>
      <div
        className="add-node-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add node"
      >
        <h2 className="add-node-modal__title">Add prompt node</h2>

        {isLoading ? (
          <p className="add-node-modal__loading">Loading prompts…</p>
        ) : (
          <select
            className="add-node-modal__select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Select a prompt…</option>
            {prompts?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <div className="add-node-modal__ref-type">
          {(["link", "copy"] as const).map((type) => (
            <label key={type} className="add-node-modal__radio">
              <input
                type="radio"
                name="refType"
                value={type}
                checked={refType === type}
                onChange={() => setRefType(type)}
              />
              <span>{type === "link" ? "Link (live)" : "Copy (snapshot)"}</span>
            </label>
          ))}
        </div>

        <div className="add-node-modal__actions">
          <button className="add-node-modal__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="add-node-modal__add"
            onClick={handleAdd}
            disabled={!selectedId}
          >
            Add node
          </button>
        </div>
      </div>
    </div>
  );
}
