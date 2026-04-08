import type React from "react";
import type { CIStatusDTO, FileDetailDTO } from "@/api/endpoints/insights";
import "@/components/features/insights/InsightPageModals.css";
import { CIDetailPanel } from "@/components/features/insights/CIDetailPanel";
import { FileInspectorModal } from "@/components/features/insights/FileInspectorModal";
import { InsightDetailPanel } from "@/components/features/insights/InsightDetailPanel";
import { InsightRepoSummaryPanel } from "@/components/features/insights/InsightRepoSummaryPanel";
import { LlmCallLogPanel } from "@/components/features/insights/LlmCallLogPanel";
import { OllamaConfigModal } from "@/components/features/insights/OllamaConfigModal";
import { useClearLlmLog, useLlmLog } from "@/hooks/useInsights";
import type { UseMutationResult } from "@tanstack/react-query";

type Props = {
  showConfig: boolean;
  onConfigClose: () => void;
  inspectedFile: string | null;
  onInspectedFileClose: () => void;
  collectionId: string;
  showCIDetail: boolean;
  ciStatus: CIStatusDTO | undefined;
  onCIDetailClose: () => void;
  showSummary: boolean;
  summary: UseMutationResult<string, Error, void, unknown>;
  onSummaryClose: () => void;
  showLlmLog: boolean;
  onLlmLogClose: () => void;
  selectedFile: string | null;
  fileDetail: FileDetailDTO | undefined;
  detailLoading: boolean;
  metricLabels: Record<string, string>;
  onDetailClose: () => void;
  detail: { size: number };
};

export function InsightPageModals({
  showConfig,
  onConfigClose,
  inspectedFile,
  onInspectedFileClose,
  collectionId,
  showCIDetail,
  ciStatus,
  onCIDetailClose,
  showSummary,
  summary,
  onSummaryClose,
  showLlmLog,
  onLlmLogClose,
  selectedFile,
  fileDetail,
  detailLoading,
  metricLabels,
  onDetailClose,
  detail,
}: Props) {
  const { data: llmLog = [], isLoading: llmLogLoading } = useLlmLog(
    collectionId,
    showLlmLog
  );
  const clearLog = useClearLlmLog(collectionId);

  return (
    <>
      <div
        className="insight-page-modals__panel"
        style={{ "--panel-h": `${detail.size}px` } as React.CSSProperties}
      >
        {showLlmLog ? (
          <LlmCallLogPanel
            entries={llmLog}
            isLoading={llmLogLoading}
            onClear={() => clearLog.mutate()}
            onClose={onLlmLogClose}
          />
        ) : showCIDetail && ciStatus ? (
          <CIDetailPanel ciStatus={ciStatus} onClose={onCIDetailClose} />
        ) : showSummary ? (
          <InsightRepoSummaryPanel
            summary={summary.data}
            isLoading={summary.isPending}
            onClose={onSummaryClose}
          />
        ) : (
          <InsightDetailPanel
            relativePath={selectedFile}
            detail={selectedFile ? fileDetail : undefined}
            isLoading={selectedFile ? detailLoading : false}
            metricLabels={metricLabels}
            onClose={onDetailClose}
          />
        )}
      </div>
      {showConfig && <OllamaConfigModal onClose={onConfigClose} />}
      {inspectedFile && collectionId && (
        <FileInspectorModal
          collectionId={collectionId}
          relativePath={inspectedFile}
          metricLabels={metricLabels}
          onClose={onInspectedFileClose}
        />
      )}
    </>
  );
}
