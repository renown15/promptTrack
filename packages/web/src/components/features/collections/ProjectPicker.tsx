import { useProjectTree } from "@/hooks/useCollections";
import {
  useAddPromptToCollection,
  useRemovePromptFromCollection,
  useAddChainToCollection,
  useRemoveChainFromCollection,
} from "@/hooks/useCollections";
import { useQueryClient } from "@tanstack/react-query";
import "@/components/features/collections/ProjectPicker.css";

type Props = {
  resourceId: string;
  resourceType: "prompt" | "chain";
};

export function ProjectPicker({ resourceId, resourceType }: Props) {
  const queryClient = useQueryClient();
  const { data: tree } = useProjectTree();

  const addPrompt = useAddPromptToCollection();
  const removePrompt = useRemovePromptFromCollection();
  const addChain = useAddChainToCollection();
  const removeChain = useRemoveChainFromCollection();

  if (!tree) return null;

  const memberIds = new Set(
    tree.collections
      .filter((c) =>
        resourceType === "prompt"
          ? c.prompts.some((p) => p.id === resourceId)
          : c.chains.some((ch) => ch.id === resourceId)
      )
      .map((c) => c.id)
  );

  const nonMembers = tree.collections.filter((c) => !memberIds.has(c.id));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["collections", "tree"] });
  };

  const handleAdd = (collectionId: string) => {
    if (resourceType === "prompt") {
      addPrompt.mutate(
        { collectionId, promptId: resourceId },
        { onSuccess: invalidate }
      );
    } else {
      addChain.mutate(
        { collectionId, chainId: resourceId },
        { onSuccess: invalidate }
      );
    }
  };

  const handleRemove = (collectionId: string) => {
    if (resourceType === "prompt") {
      removePrompt.mutate(
        { collectionId, promptId: resourceId },
        { onSuccess: invalidate }
      );
    } else {
      removeChain.mutate(
        { collectionId, chainId: resourceId },
        { onSuccess: invalidate }
      );
    }
  };

  return (
    <div className="project-picker">
      <span className="project-picker__label">Projects</span>
      <div className="project-picker__tags">
        {tree.collections
          .filter((c) => memberIds.has(c.id))
          .map((c) => (
            <span key={c.id} className="project-picker__tag">
              {c.name}
              <button
                className="project-picker__remove"
                onClick={() => handleRemove(c.id)}
                title="Remove from project"
              >
                ×
              </button>
            </span>
          ))}
        {nonMembers.length > 0 && (
          <select
            className="project-picker__select"
            value=""
            onChange={(e) => {
              if (e.target.value) handleAdd(e.target.value);
            }}
          >
            <option value="">+ Add to project</option>
            {nonMembers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
