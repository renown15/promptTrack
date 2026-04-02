import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ollamaApi } from "@/api/endpoints/ollama";
import type { PullProgressChunk } from "@/api/endpoints/ollama";

export type {
  OllamaConfigDTO,
  MetricDefinition,
  ModelStatusDTO,
  RecommendedModelsDTO,
  PullProgressChunk,
} from "@/api/endpoints/ollama";

export function useOllamaConfig() {
  return useQuery({
    queryKey: ["ollama-config"],
    queryFn: () => ollamaApi.getConfig(),
  });
}

export function useUpdateOllamaConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ollamaApi.updateConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(["ollama-config"], (prev: typeof data) =>
        prev ? { ...prev, ...data } : data
      );
    },
  });
}

export function useTestOllamaConnection() {
  return useMutation({
    mutationFn: (endpoint: string) => ollamaApi.testConnection(endpoint),
  });
}

export function useOllamaModels(endpoint: string) {
  return useQuery({
    queryKey: ["ollama-models", endpoint],
    queryFn: () => ollamaApi.listModels(endpoint),
    enabled: !!endpoint,
    staleTime: 30_000,
  });
}

export function useOllamaRecommended() {
  return useQuery({
    queryKey: ["ollama-recommended"],
    queryFn: () => ollamaApi.getRecommended(),
    staleTime: 30_000,
  });
}

export type PullState = { status: string; progress: number | undefined };

export function useOllamaPull() {
  const queryClient = useQueryClient();
  const [pulling, setPulling] = useState<Record<string, PullState>>({});

  const pull = useCallback(
    async (model: string) => {
      setPulling((prev) => ({
        ...prev,
        [model]: { status: "starting…", progress: undefined },
      }));
      try {
        await ollamaApi.pullModel(model, (chunk: PullProgressChunk) => {
          if (chunk.done || chunk.status === "error") return;
          setPulling((prev) => ({
            ...prev,
            [model]: {
              status: chunk.status,
              progress: chunk.progress ?? undefined,
            },
          }));
        });
      } finally {
        setPulling((prev) => {
          const next = { ...prev };
          delete next[model];
          return next;
        });
        void queryClient.invalidateQueries({
          queryKey: ["ollama-recommended"],
        });
        void queryClient.invalidateQueries({ queryKey: ["ollama-models"] });
      }
    },
    [queryClient]
  );

  return { pulling, pull };
}
