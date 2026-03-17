import { RichTextEditor } from "@/components/features/prompts/RichTextEditor";
import "@/components/features/prompts/ExecutivePromptModal.css";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
};

export function ExecExpandedEditor({ value, onChange, onClose }: Props) {
  return (
    <div className="exec-modal__expand-overlay" onClick={onClose}>
      <div
        className="exec-modal__expand-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="exec-modal__expand-header">
          <span className="exec-modal__expand-title">Edit content</span>
          <button
            type="button"
            className="exec-modal__close"
            onClick={onClose}
            aria-label="Close expanded editor"
          >
            ✕
          </button>
        </div>
        <div className="exec-modal__expand-body">
          <RichTextEditor value={value} onChange={onChange} />
        </div>
        <div className="exec-modal__expand-footer">
          <button
            type="button"
            className="exec-modal__btn-create"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
