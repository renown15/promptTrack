import { usePrompts } from "@/hooks/usePrompts";
import { PromptCard } from "@/components/features/prompts/PromptCard";
import "@/components/features/prompts/PromptList.css";

export function PromptList({ collectionId }: { collectionId?: string }) {
  const params = collectionId !== undefined ? { collectionId } : undefined;
  const { data: prompts, isLoading, isError } = usePrompts(params);

  if (isLoading) {
    return (
      <div className="prompt-list">
        <p className="prompt-list__empty">Loading prompts…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="prompt-list">
        <p className="prompt-list__error">Failed to load prompts.</p>
      </div>
    );
  }

  if (!prompts?.length) {
    return (
      <div className="prompt-list">
        <p className="prompt-list__empty">
          No prompts yet. Create your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="prompt-list">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  );
}
