import type {
  ActiveLlmCallDTO,
  FileSnapshotDTO,
} from "@/api/endpoints/insights";
import { insightsApi } from "@/api/endpoints/insights";
import { useAuthStore } from "@/stores/authStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

export type {
  ActiveLlmCallDTO,
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

export {
  useCIStatus,
  useFileDetail,
  useGenerateRepoSummary,
  useInsightAggregate,
  useInsightFilesCache,
  useRetryInsightFile,
  useScanInsights,
} from "@/hooks/useInsights.auxiliary";

export function useInsights(collectionId: string, onScanComplete?: () => void) {
  const onScanCompleteRef = useRef(onScanComplete);
  useEffect(() => {
    onScanCompleteRef.current = onScanComplete;
  });
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
      onScanCompleteRef.current?.();
    });

    es.addEventListener("gitignore_updated", (e) => {
      const data = JSON.parse(e.data) as { warnings: string[] };
      queryClient.setQueryData(
        ["insights", collectionId],
        (
          prev: ReturnType<typeof insightsApi.getState> extends Promise<infer T>
            ? T
            : never
        ) => {
          if (!prev) return prev;
          return { ...prev, gitignoreWarnings: data.warnings };
        }
      );
    });

    es.addEventListener("llm_call_start", (e) => {
      const data = JSON.parse(e.data) as ActiveLlmCallDTO;
      queryClient.setQueryData(
        ["insights", collectionId],
        (
          prev: ReturnType<typeof insightsApi.getState> extends Promise<infer T>
            ? T
            : never
        ) => {
          if (!prev) return prev;
          return { ...prev, activeLlmCall: data };
        }
      );
    });

    es.addEventListener("llm_call_end", (e) => {
      void e;
      queryClient.setQueryData(
        ["insights", collectionId],
        (
          prev: ReturnType<typeof insightsApi.getState> extends Promise<infer T>
            ? T
            : never
        ) => {
          if (!prev) return prev;
          return { ...prev, activeLlmCall: null };
        }
      );
    });

    return () => es.close();
  }, [collectionId, mergeFile, queryClient]);

  return query;
}
