import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreatePromptSchema } from "@prompttrack/shared";
import type { CreatePromptInput } from "@prompttrack/shared";
import { usePromptsWithContent } from "@/hooks/usePrompts";
import { useCollections } from "@/hooks/useCollections";
import { useExecPromptBuilder } from "@/hooks/useExecPromptBuilder";
import { ExecContextPanel } from "@/components/features/prompts/ExecContextPanel";
import { ExecExpandedEditor } from "@/components/features/prompts/ExecExpandedEditor";
import { ExecPromptFormBody } from "@/components/features/prompts/ExecPromptFormBody";
import "@/components/features/prompts/ExecutivePromptModal.css";

type Props = {
  selectedIds: string[];
  collectionId?: string;
  onClose: () => void;
};

export function ExecutivePromptModal({
  selectedIds,
  collectionId,
  onClose,
}: Props) {
  const { data: prompts, isLoading } = usePromptsWithContent(selectedIds);
  const { data: collections } = useCollections();
  const targetCollection = collections?.find((c) => c.id === collectionId);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set(selectedIds));
  const [editorExpanded, setEditorExpanded] = useState(false);

  const activePrompts = prompts?.filter((p) => activeIds.has(p.id)) ?? [];

  function removePrompt(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const form = useForm<CreatePromptInput>({
    resolver: zodResolver(
      CreatePromptSchema
    ) as unknown as Resolver<CreatePromptInput>,
    defaultValues: {
      tags: [],
      variables: [],
      role: "user",
      modelParameters: { temperature: 0.7, maxTokens: 1000 },
      content: "",
    },
  });

  const { copied, handleCopy, handleCreate } = useExecPromptBuilder({
    ...(collectionId !== undefined && { collectionId }),
    activePrompts,
    getValues: form.getValues,
    setError: form.setError,
    onClose,
  });

  return (
    <div className="exec-modal__overlay" onClick={onClose}>
      <div
        className="exec-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Agent Instruction Builder"
      >
        <div className="exec-modal__header">
          <h2 className="exec-modal__title">Agent Instruction Builder</h2>
          <button
            className="exec-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <p className="exec-modal__loading">Loading prompt content…</p>
        ) : (
          <div className="exec-modal__body">
            <ExecContextPanel
              activePrompts={activePrompts}
              onRemove={removePrompt}
            />
            <form
              className="exec-modal__form"
              id="exec-prompt-form"
              onSubmit={form.handleSubmit(handleCreate)}
            >
              <ExecPromptFormBody
                form={form}
                collectionName={targetCollection?.name}
                onExpandEditor={() => setEditorExpanded(true)}
              />
            </form>
          </div>
        )}

        <div className="exec-modal__footer">
          <button className="exec-modal__btn-close" onClick={onClose}>
            Close
          </button>
          <button
            className="exec-modal__btn-copy"
            onClick={handleCopy}
            disabled={isLoading}
            type="button"
          >
            {copied ? "Copied!" : "Copy all"}
          </button>
          <button
            className="exec-modal__btn-create"
            form="exec-prompt-form"
            type="submit"
            disabled={form.formState.isSubmitting || isLoading}
          >
            {form.formState.isSubmitting ? "Creating…" : "Create prompt"}
          </button>
        </div>
      </div>

      {editorExpanded && (
        <ExecExpandedEditor
          value={form.watch("content") ?? ""}
          onChange={(v) => form.setValue("content", v)}
          onClose={() => setEditorExpanded(false)}
        />
      )}
    </div>
  );
}
