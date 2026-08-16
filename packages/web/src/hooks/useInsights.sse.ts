import type { DocAnalysisResult } from "@/api/endpoints/collections";
import type {
  ActiveLlmCallDTO,
  FileSnapshotDTO,
  LlmCallLogEntryDTO,
} from "@/api/endpoints/insights";
import type { insightsApi } from "@/api/endpoints/insights";
import type { QueryClient } from "@tanstack/react-query";

type StateSnapshot =
  ReturnType<typeof insightsApi.getState> extends Promise<infer T> ? T : never;

function patchState(
  qc: QueryClient,
  collectionId: string,
  patch: (prev: StateSnapshot) => StateSnapshot
) {
  qc.setQueryData(["insights", collectionId], (prev: StateSnapshot) => {
    if (!prev) return prev;
    return patch(prev);
  });
}

export function attachInsightSSEHandlers(
  es: EventSource,
  collectionId: string,
  queryClient: QueryClient,
  mergeFile: (snap: FileSnapshotDTO) => void,
  onScanComplete: () => void
): void {
  es.addEventListener("state", (e) => {
    queryClient.setQueryData(["insights", collectionId], JSON.parse(e.data));
  });

  es.addEventListener("file_updated", (e) => {
    mergeFile(JSON.parse(e.data) as FileSnapshotDTO);
  });

  es.addEventListener("file_removed", (e) => {
    const { relativePath } = JSON.parse(e.data) as { relativePath: string };
    patchState(queryClient, collectionId, (prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.relativePath !== relativePath),
    }));
  });

  es.addEventListener("scan_complete", (e) => {
    const data = JSON.parse(e.data) as { timestamp: string };
    patchState(queryClient, collectionId, (prev) => ({
      ...prev,
      scanning: false,
      lastScan: data.timestamp,
    }));
    onScanComplete();
  });

  es.addEventListener("gitignore_updated", (e) => {
    const { warnings } = JSON.parse(e.data) as { warnings: string[] };
    patchState(queryClient, collectionId, (prev) => ({
      ...prev,
      gitignoreWarnings: warnings,
    }));
  });

  es.addEventListener("analysis_complete", () => {
    patchState(queryClient, collectionId, (prev) => ({
      ...prev,
      analysing: false,
      activeLlmCall: null,
    }));
  });

  es.addEventListener("llm_call_start", (e) => {
    const data = JSON.parse(e.data) as ActiveLlmCallDTO;
    patchState(queryClient, collectionId, (prev) => ({
      ...prev,
      activeLlmCall: data,
    }));
    queryClient.setQueryData(
      ["llm-log", collectionId],
      (prev: LlmCallLogEntryDTO[] | undefined) => {
        const row: LlmCallLogEntryDTO = {
          id: `pending-${data.metric}-${data.file}`,
          collectionId,
          relativePath: data.file,
          metric: data.metric,
          model: data.model,
          startedAt: data.startedAt,
          durationMs: 0,
          promptChars: 0,
          promptTokens: null,
          responseTokens: null,
          status: "running",
          errorReason: null,
        };
        return [row, ...(prev ?? [])];
      }
    );
  });

  es.addEventListener("llm_call_end", () => {
    patchState(queryClient, collectionId, (prev) => ({
      ...prev,
      activeLlmCall: null,
    }));
    void queryClient.invalidateQueries({ queryKey: ["llm-log", collectionId] });
  });

  es.addEventListener("doc_analysis", (e) => {
    queryClient.setQueryData(
      ["collections", collectionId, "docs", "analysis"],
      JSON.parse(e.data) as DocAnalysisResult
    );
  });
}
