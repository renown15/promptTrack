import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { promptsApi } from "@/api/endpoints/prompts";
import type {
  CreatePromptInput,
  UpdatePromptInput,
  CreatePromptVersionInput,
} from "@prompttrack/shared";

export function usePrompts(params?: {
  environment?: string;
  collectionId?: string;
}) {
  return useQuery({
    queryKey: ["prompts", params],
    queryFn: () => promptsApi.list(params),
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

export function usePrompt(id: string) {
  return useQuery({
    queryKey: ["prompts", id],
    queryFn: () => promptsApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePromptInput) => promptsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
}

export function useUpdatePrompt(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePromptInput) => promptsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => promptsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["collections", "tree"] });
    },
  });
}

export function useCreatePromptVersion(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePromptVersionInput) =>
      promptsApi.createVersion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts", id] });
    },
  });
}
