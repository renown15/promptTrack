import type { FileSnapshotDTO } from "@/api/endpoints/insights";
import { insightsApi } from "@/api/endpoints/insights";
import { attachInsightSSEHandlers } from "@/hooks/useInsights.sse";
import { useAuthStore } from "@/stores/authStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

export type {
  ActiveLlmCallDTO,
  AggregateStatsDTO,
  FileStatusOverrideDTO,
  LlmCallLogEntryDTO,
  MetricOverrideDTO,
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
  useClearLlmLog,
  useDeleteOverride,
  useFileDetail,
  useGenerateRepoSummary,
  useInsightAggregate,
  useInsightFilesCache,
  useLlmLog,
  useOverrideHistory,
  useRetryInsightFile,
  useScanInsights,
  useUpsertOverride,
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

    attachInsightSSEHandlers(es, collectionId, queryClient, mergeFile, () => {
      onScanCompleteRef.current?.();
    });

    return () => es.close();
  }, [collectionId, mergeFile, queryClient]);

  return query;
}
