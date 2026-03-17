import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { UseFormGetValues, UseFormSetError } from "react-hook-form";
import type {
  CreatePromptInput,
  PromptWithVersionsDTO,
} from "@prompttrack/shared";
import { useCreatePrompt } from "@/hooks/usePrompts";
import { chainsApi } from "@/api/endpoints/chains";
import { collectionsApi } from "@/api/endpoints/collections";

type Params = {
  collectionId?: string;
  activePrompts: PromptWithVersionsDTO[];
  getValues: UseFormGetValues<CreatePromptInput>;
  setError: UseFormSetError<CreatePromptInput>;
  onClose: () => void;
};

export function useExecPromptBuilder({
  collectionId,
  activePrompts,
  getValues,
  setError,
  onClose,
}: Params) {
  const navigate = useNavigate();
  const createPrompt = useCreatePrompt();
  const [copied, setCopied] = useState(false);

  function buildContextText(): string {
    return activePrompts
      .map((p) => {
        const latest = p.versions[p.versions.length - 1];
        return `=== Context: ${p.name} ===\n${latest?.content ?? ""}`;
      })
      .join("\n\n");
  }

  async function handleCopy() {
    const content = getValues("content");
    const ctx = buildContextText();
    const parts: string[] = [];
    if (ctx) parts.push(ctx);
    if (content.trim()) parts.push(`=== New Prompt ===\n${content.trim()}`);
    await navigator.clipboard.writeText(parts.join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCreate(data: CreatePromptInput) {
    try {
      const prompt = await createPrompt.mutateAsync(data);
      if (collectionId) {
        await collectionsApi.addPrompt(collectionId, prompt.id);
      }
      const contextNodes = activePrompts.map((p, i) => {
        const latest = p.versions[p.versions.length - 1];
        return {
          nodeId: `node-${i}`,
          promptId: p.id,
          promptVersionNumber: latest?.versionNumber ?? p.currentVersion,
          refType: "link" as const,
          positionX: i * 250,
          positionY: 0,
        };
      });
      const newNode = {
        nodeId: `node-${contextNodes.length}`,
        promptId: prompt.id,
        promptVersionNumber: prompt.currentVersion,
        refType: "link" as const,
        positionX: contextNodes.length * 250,
        positionY: 0,
      };
      const chain = await chainsApi.create({ name: data.name, tags: [] });
      if (collectionId) {
        await collectionsApi.addChain(collectionId, chain.id);
      }
      await chainsApi.createVersion(chain.id, {
        nodes: [...contextNodes, newNode],
        edges: [],
      });
      onClose();
      navigate(`/prompts/${prompt.id}`);
    } catch {
      setError("root", {
        message: "Failed to create prompt. Please try again.",
      });
    }
  }

  return {
    copied,
    handleCopy,
    handleCreate,
    isSubmitting: createPrompt.isPending,
  };
}
