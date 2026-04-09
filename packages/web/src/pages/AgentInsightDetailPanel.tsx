import { InsightPageModals } from "@/components/features/insights/InsightPageModals";
import type { CIStatusDTO } from "@/api/endpoints/insights";

interface InsightDetailPanelProps {
  id: string | undefined;
  showConfig: boolean;
  onConfigClose: () => void;
  inspectedFile: string | null;
  onInspectedFileClose: () => void;
  showCIDetail: boolean;
  ciStatus: CIStatusDTO | undefined;
  onCIDetailClose: () => void;
  showSummary: boolean;
  summary: any;
  onSummaryClose: () => void;
  showLlmLog: boolean;
  onLlmLogClose: () => void;
  selectedFile: string | null;
  fileDetail: any;
  detailLoading: boolean;
  metricLabels: Record<string, string>;
  detail: any;
}

export function InsightDetailPanel({
  id,
  showConfig,
  onConfigClose,
  inspectedFile,
  onInspectedFileClose,
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
  detail,
}: InsightDetailPanelProps) {
  return (
    <div
      className="agent-insight-page__detail-panel"
      style={{ height: detail.size }}
    >
      {id && (
        <InsightPageModals
          showConfig={showConfig}
          onConfigClose={onConfigClose}
          inspectedFile={inspectedFile}
          onInspectedFileClose={onInspectedFileClose}
          collectionId={id}
          showCIDetail={showCIDetail}
          ciStatus={ciStatus}
          onCIDetailClose={onCIDetailClose}
          showSummary={showSummary}
          summary={summary}
          onSummaryClose={onSummaryClose}
          showLlmLog={showLlmLog}
          onLlmLogClose={onLlmLogClose}
          selectedFile={selectedFile}
          fileDetail={fileDetail}
          detailLoading={detailLoading}
          metricLabels={metricLabels}
          onDetailClose={() => null}
          detail={detail}
        />
      )}
    </div>
  );
}
