import { insightsApi } from "@/api/endpoints/insights";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type {
  AggregateStatsDTO,
  CIJobDTO,
  CIStatusDTO,
  CIStepDTO,
  CoverageDetailDTO,
  FileDetailDTO,
  FileMetric,
  FileMetricError,
  FileSnapshotDTO,
  InsightFilter,
  InsightStateDTO,
  LintDetailDTO,
  LintMessageDTO,
} from "@/api/endpoints/insights";

// Read-only: shares cache with useInsights but does not open an SSE connection
export function useInsightFilesCache(collectionId: string) {
  return useQuery({
    queryKey: ["insights", collectionId],
    queryFn: () => insightsApi.getState(collectionId),
    enabled: !!collectionId,
  });
}

export function useScanInsights(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => insightsApi.scan(collectionId),
    onSuccess: () => {
      queryClient.setQueryData(
        ["insights", collectionId],
        (
          prev: ReturnType<typeof insightsApi.getState> extends Promise<infer T>
            ? T
            : never
        ) => {
          if (!prev) return prev;
          return {
            ...prev,
            scanning: true,
            files: prev.files.map((f) => {
              const hasErrors = Object.values(f.metrics).some(
                (v) =>
                  v === null ||
                  (typeof v === "object" && v !== null && "error" in v)
              );
              return hasErrors ? { ...f, metrics: {} } : f;
            }),
          };
        }
      );
      void queryClient.invalidateQueries({
        queryKey: ["insight-aggregate", collectionId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["ci-status", collectionId],
      });
    },
  });
}

export function useFileDetail(
  collectionId: string,
  relativePath: string | null
) {
  return useQuery({
    queryKey: ["insight-detail", collectionId, relativePath],
    queryFn: () => insightsApi.getFileDetail(collectionId, relativePath!),
    enabled: !!collectionId && !!relativePath,
    staleTime: 0,
  });
}

export function useRetryInsightFile(collectionId: string) {
  return useMutation({
    mutationFn: (relativePath: string) =>
      insightsApi.retryFile(collectionId, relativePath),
  });
}

export function useInsightAggregate(collectionId: string) {
  return useQuery({
    queryKey: ["insight-aggregate", collectionId],
    queryFn: () => insightsApi.getAggregateStats(collectionId),
    enabled: !!collectionId,
    staleTime: 60_000,
  });
}

export function useGenerateRepoSummary(collectionId: string) {
  return useMutation({
    mutationFn: () => insightsApi.generateRepoSummary(collectionId),
  });
}

export function useCIStatus(collectionId: string) {
  return useQuery({
    queryKey: ["ci-status", collectionId],
    queryFn: () => insightsApi.getCIStatus(collectionId),
    enabled: !!collectionId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
