import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insightsApi } from "@/api/endpoints/insights";

export type {
  OllamaConfigDTO,
  MetricDefinition,
} from "@/api/endpoints/insights";

export function useOllamaConfig() {
  return useQuery({
    queryKey: ["ollama-config"],
    queryFn: () => insightsApi.getOllamaConfig(),
  });
}

export function useUpdateOllamaConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: insightsApi.updateOllamaConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(["ollama-config"], (prev: typeof data) =>
        prev ? { ...prev, ...data } : data
      );
    },
  });
}

export function useTestOllamaConnection() {
  return useMutation({
    mutationFn: (endpoint: string) =>
      insightsApi.testOllamaConnection(endpoint),
  });
}

export function useOllamaModels(endpoint: string) {
  return useQuery({
    queryKey: ["ollama-models", endpoint],
    queryFn: () => insightsApi.getOllamaModels(endpoint),
    enabled: !!endpoint,
    staleTime: 30_000,
  });
}
