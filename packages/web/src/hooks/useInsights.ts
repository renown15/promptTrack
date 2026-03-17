import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insightsApi, type FileSnapshotDTO } from "@/api/endpoints/insights";
import { useAuthStore } from "@/stores/authStore";

export type {
  FileSnapshotDTO,
  InsightStateDTO,
  FileMetric,
  FileMetricError,
  FileDetailDTO,
  CoverageDetailDTO,
  LintDetailDTO,
  LintMessageDTO,
  AggregateStatsDTO,
  CIStatusDTO,
  CIJobDTO,
  CIStepDTO,
  InsightFilter,
} from "@/api/endpoints/insights";

// Read-only: shares cache with useInsights but does not open an SSE connection
export function useInsightFilesCache(collectionId: string) {
  return useQuery({
    queryKey: ["insights", collectionId],
    queryFn: () => insightsApi.getState(collectionId),
    enabled: !!collectionId,
  });
}

export function useInsights(collectionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["insights", collectionId],
    queryFn: () => insightsApi.getState(collectionId),
    enabled: !!collectionId,
  });

  const mergeFile = useCallback(
    (snap: FileSnapshotDTO) => {
      queryClient.setQueryData(
        ["insights", collectionId],
        (
          prev: ReturnType<typeof insightsApi.getState> extends Promise<infer T>
            ? T
            : never
        ) => {
          if (!prev) return prev;
          const existing = prev.files.findIndex(
            (f) => f.relativePath === snap.relativePath
          );
          const files =
            existing >= 0
              ? prev.files.map((f, i) => (i === existing ? snap : f))
              : [snap, ...prev.files];
          return {
            ...prev,
            files: files.sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
            ),
          };
        }
      );
    },
    [collectionId, queryClient]
  );

  useEffect(() => {
    if (!collectionId) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const url = insightsApi.streamUrl(collectionId, token);
    const es = new EventSource(url);

    es.addEventListener("state", (e) => {
      const data = JSON.parse(e.data);
      queryClient.setQueryData(["insights", collectionId], data);
    });

    es.addEventListener("file_updated", (e) => {
      mergeFile(JSON.parse(e.data) as FileSnapshotDTO);
    });

    es.addEventListener("file_removed", (e) => {
      const { relativePath } = JSON.parse(e.data) as { relativePath: string };
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
            files: prev.files.filter((f) => f.relativePath !== relativePath),
          };
        }
      );
    });

    es.addEventListener("scan_complete", (e) => {
      const data = JSON.parse(e.data) as { timestamp: string };
      queryClient.setQueryData(
        ["insights", collectionId],
        (
          prev: ReturnType<typeof insightsApi.getState> extends Promise<infer T>
            ? T
            : never
        ) => {
          if (!prev) return prev;
          return { ...prev, scanning: false, lastScan: data.timestamp };
        }
      );
    });

    return () => es.close();
  }, [collectionId, mergeFile, queryClient]);

  return query;
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

export function useCIStatus(collectionId: string) {
  return useQuery({
    queryKey: ["ci-status", collectionId],
    queryFn: () => insightsApi.getCIStatus(collectionId),
    enabled: !!collectionId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
