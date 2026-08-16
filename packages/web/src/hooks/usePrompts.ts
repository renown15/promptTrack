import { useQuery } from "@tanstack/react-query";
import { promptsApi } from "@/api/endpoints/prompts";
import { useMutate } from "@/hooks/useMutate";
import type {
  CreatePromptInput,
  UpdatePromptInput,
  CreatePromptVersionInput,
} from "@prompttrack/shared";

const KEYS = {
  all: ["prompts"] as const,
  tree: ["collections", "tree"] as const,
};

export function usePrompts(params?: {
  environment?: string;
  collectionId?: string;
}) {
  return useQuery({
    queryKey: ["prompts", params],
    queryFn: () => promptsApi.list(params),
  });
}

export function usePrompt(id: string) {
  return useQuery({
    queryKey: ["prompts", id],
    queryFn: () => promptsApi.getById(id),
    enabled: Boolean(id),
  });
}

export function usePromptChains(id: string) {
  return useQuery({
    queryKey: ["prompts", id, "chains"],
    queryFn: () => promptsApi.getChains(id),
    enabled: Boolean(id),
  });
}

export function usePromptsWithContent(ids: string[]) {
  const sorted = ids.slice().sort();
  return useQuery({
    queryKey: ["prompts-content", ...sorted],
    queryFn: () => Promise.all(ids.map((id) => promptsApi.getById(id))),
    enabled: ids.length > 0,
  });
}

export function usePromptSearchDetails(ids: string[]) {
  const sorted = ids.slice().sort();
  return useQuery({
    queryKey: ["prompt-search-details", ...sorted],
    queryFn: () =>
      Promise.all(
        ids.map(async (id) => {
          const [prompt, chains] = await Promise.all([
            promptsApi.getById(id),
            promptsApi.getChains(id),
          ]);
          return { ...prompt, chains };
        })
      ),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
}

export function useCreatePrompt() {
  return useMutate(
    (data: CreatePromptInput) => promptsApi.create(data),
    [KEYS.all]
  );
}

export function useUpdatePrompt(id: string) {
  return useMutate(
    (data: UpdatePromptInput) => promptsApi.update(id, data),
    [KEYS.all]
  );
}

export function useDeletePrompt() {
  return useMutate(
    (id: string) => promptsApi.archive(id),
    [KEYS.all, KEYS.tree]
  );
}

export function useCreatePromptVersion(id: string) {
  return useMutate(
    (data: CreatePromptVersionInput) => promptsApi.createVersion(id, data),
    [["prompts", id]]
  );
}
