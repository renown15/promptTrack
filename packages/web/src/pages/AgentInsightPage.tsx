import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useCollections } from "@/hooks/useCollections";
import {
  useInsights,
  useScanInsights,
  useFileDetail,
  useInsightAggregate,
  useCIStatus,
  useGenerateRepoSummary,
} from "@/hooks/useInsights";
import type { InsightFilter } from "@/hooks/useInsights";
import { useOllamaConfig } from "@/hooks/useOllamaConfig";
import { useResizeHandle } from "@/hooks/useResizeHandle";
import { applyFilter } from "@/pages/AgentInsightPage.utils";
import { filterMatches } from "@/components/features/insights/InsightSummaryPanel.utils";
import { InsightTitleBar } from "@/components/features/insights/InsightTitleBar";
import { InsightSummaryPanel } from "@/components/features/insights/InsightSummaryPanel";
import { InsightTreeTable } from "@/components/features/insights/InsightTreeTable";
import { InsightActivityStack } from "@/components/features/insights/InsightActivityStack";
import { InsightDetailPanel } from "@/components/features/insights/InsightDetailPanel";
import { CIDetailPanel } from "@/components/features/insights/CIDetailPanel";
import { InsightRepoSummaryPanel } from "@/components/features/insights/InsightRepoSummaryPanel";
import { OllamaConfigModal } from "@/components/features/insights/OllamaConfigModal";
import { FileInspectorModal } from "@/components/features/insights/FileInspectorModal";
import "@/pages/AgentInsightPage.css";

const HANDLE_H = 8;

export function AgentInsightPage() {
  const { id } = useParams<{ id: string }>();
  const { data: collections } = useCollections();
  const collection = collections?.find((c) => c.id === id);

  const [showSummary, setShowSummary] = useState(false);
  const summary = useGenerateRepoSummary(id ?? "");
  const { data: state, isLoading } = useInsights(id ?? "", () => {
    setShowSummary(true);
    summary.mutate();
  });
  const scan = useScanInsights(id ?? "");
  const { data: ollamaCfg } = useOllamaConfig();
  const { data: aggregate } = useInsightAggregate(id ?? "");
  const { data: ciStatus } = useCIStatus(id ?? "");

  const [searchParams, setSearchParams] = useSearchParams();
  const [showConfig, setShowConfig] = useState(false);
  const [inspectedFile, setInspectedFile] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showCIDetail, setShowCIDetail] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InsightFilter | null>(null);

  const detail = useResizeHandle(
    "insight-detail-height",
    240,
    120,
    600,
    "y",
    true
  );
  const stack = useResizeHandle(
    "insight-stack-width",
    288,
    160,
    600,
    "x",
    true
  );

  useEffect(() => {
    const file = searchParams.get("file");
    if (file) {
      setSelectedFile(file);
      setHighlightedPath(file);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const metricLabels: Record<string, string> = Object.fromEntries(
    (ollamaCfg?.defaultMetrics ?? []).map((m) => [m.name, m.label])
  );
  const modelLabel = ollamaCfg
    ? `${ollamaCfg.model} @ ${ollamaCfg.endpoint.replace("http://", "")}`
    : null;

  const files = state?.files ?? [];
  const filteredFiles = applyFilter(files, activeFilter);
  const { data: fileDetail, isLoading: detailLoading } = useFileDetail(
    id ?? "",
    selectedFile
  );

  function handleFilterToggle(filter: InsightFilter) {
    setActiveFilter((prev) =>
      prev && filterMatches(prev, filter) ? null : filter
    );
  }

  function handleCIClick() {
    setShowSummary(false);
    setShowCIDetail((prev) => !prev);
    setSelectedFile(null);
  }

  function handleFileSelect(path: string) {
    setShowSummary(false);
    setShowCIDetail(false);
    setSelectedFile((prev) => (prev === path ? null : path));
  }

  return (
    <div className="agent-insight-page">
      <InsightTitleBar
        collectionName={collection?.name ?? undefined}
        collectionDir={collection?.directory ?? undefined}
        lastScan={state?.lastScan ?? undefined}
        scanning={state?.scanning ?? false}
        modelLabel={modelLabel}
        filteredCount={activeFilter !== null ? filteredFiles.length : null}
        onScan={() => scan.mutate()}
        onConfig={() => setShowConfig(true)}
      />

      <InsightSummaryPanel
        files={files}
        metricLabels={metricLabels}
        aggregate={aggregate ?? null}
        ciStatus={ciStatus ?? null}
        activeFilter={activeFilter}
        gitignoreWarnings={state?.gitignoreWarnings ?? []}
        onFilterToggle={handleFilterToggle}
        onCIClick={handleCIClick}
      />

      <div className="agent-insight-page__body">
        <div
          className="agent-insight-page__main-row"
          style={{ bottom: detail.size + HANDLE_H }}
        >
          {isLoading && (
            <div className="agent-insight-page__loading">Loading</div>
          )}
          {!isLoading && files.length === 0 && !state?.scanning && (
            <div className="agent-insight-page__empty">
              No files indexed yet. Click Scan to index the repo.
            </div>
          )}
          {files.length > 0 && (
            <>
              <div className="agent-insight-page__table-col">
                <InsightTreeTable
                  files={filteredFiles}
                  metricLabels={metricLabels}
                  highlightedPath={highlightedPath}
                  selectedPath={selectedFile}
                  onFileSelect={handleFileSelect}
                  onInspect={setInspectedFile}
                  activeFilter={activeFilter}
                  onClearFilter={() => setActiveFilter(null)}
                />
              </div>
              <div
                className="agent-insight-page__col-handle"
                onMouseDown={stack.onMouseDown}
              />
              <div
                className="agent-insight-page__stack-col"
                style={{ width: stack.size }}
              >
                <InsightActivityStack
                  files={files}
                  metricLabels={metricLabels}
                  scanning={state?.scanning ?? false}
                  onFileClick={(p) => {
                    setHighlightedPath(null);
                    setTimeout(() => setHighlightedPath(p), 0);
                    handleFileSelect(p);
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div
          className="agent-insight-page__row-handle"
          style={{ bottom: detail.size, height: HANDLE_H }}
          onMouseDown={detail.onMouseDown}
        />

        <div
          className="agent-insight-page__detail-panel"
          style={{ height: detail.size }}
        >
          {showCIDetail && ciStatus ? (
            <CIDetailPanel
              ciStatus={ciStatus}
              onClose={() => setShowCIDetail(false)}
            />
          ) : showSummary ? (
            <InsightRepoSummaryPanel
              summary={summary.data}
              isLoading={summary.isPending}
              onClose={() => setShowSummary(false)}
            />
          ) : (
            <InsightDetailPanel
              relativePath={selectedFile}
              detail={selectedFile ? fileDetail : undefined}
              isLoading={selectedFile ? detailLoading : false}
              metricLabels={metricLabels}
              onClose={() => setSelectedFile(null)}
            />
          )}
        </div>
      </div>

      {showConfig && <OllamaConfigModal onClose={() => setShowConfig(false)} />}
      {inspectedFile && id && (
        <FileInspectorModal
          collectionId={id}
          relativePath={inspectedFile}
          metricLabels={metricLabels}
          onClose={() => setInspectedFile(null)}
        />
      )}
    </div>
  );
}
