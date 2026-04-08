import { InsightActivityStack } from "@/components/features/insights/InsightActivityStack";
import { InsightPageModals } from "@/components/features/insights/InsightPageModals";
import { InsightSummaryPanel } from "@/components/features/insights/InsightSummaryPanel";
import { InsightTitleBar } from "@/components/features/insights/InsightTitleBar";
import { InsightTreeTable } from "@/components/features/insights/InsightTreeTable";
import { useCollections } from "@/hooks/useCollections";
import { useInsightPageHandlers } from "@/hooks/useInsightPageHandlers";
import {
  useCIStatus,
  useFileDetail,
  useGenerateRepoSummary,
  useInsightAggregate,
  useInsights,
  useScanInsights,
} from "@/hooks/useInsights";
import { useOllamaConfig } from "@/hooks/useOllamaConfig";
import { useResizeHandle } from "@/hooks/useResizeHandle";
import "@/pages/AgentInsightPage.css";
import {
  applyFilter,
  filterByExcludedPaths,
} from "@/pages/AgentInsightPage.utils";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

const HANDLE_H = 8;

export function AgentInsightPage() {
  const { id } = useParams<{ id: string }>();
  const { data: collections } = useCollections();
  const collection = collections?.find((c) => c.id === id);

  const [showSummary, setShowSummary] = useState(false);
  const {
    excludedPaths,
    setExcludedPaths,
    activeFilter,
    setActiveFilter,
    handleFilterToggle,
    handleExcludePath,
  } = useInsightPageHandlers(id ?? "");
  const [showConfig, setShowConfig] = useState(false);
  const [inspectedFile, setInspectedFile] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showCIDetail, setShowCIDetail] = useState(false);
  const [showLlmLog, setShowLlmLog] = useState(false);
  const summary = useGenerateRepoSummary(id ?? "");
  const { data: state, isLoading } = useInsights(id ?? "", () => {
    setShowSummary(true);
    summary.mutate();
  });
  const scan = useScanInsights(id ?? "");
  const { data: ollamaCfg } = useOllamaConfig();
  const { data: aggregate } = useInsightAggregate(id ?? "");
  const { data: ciStatus } = useCIStatus(id ?? "");
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
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const file = searchParams.get("file");
    if (file) {
      setSelectedFile(file);
      setHighlightedPath(file);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  useEffect(() => {
    setExcludedPaths(new Set(collection?.inScopeDirectories ?? []));
  }, [collection?.inScopeDirectories]);

  const metricLabels: Record<string, string> = Object.fromEntries(
    (ollamaCfg?.defaultMetrics ?? []).map((m) => [m.name, m.label])
  );
  const modelLabel = ollamaCfg
    ? `${ollamaCfg.model} @ ${ollamaCfg.endpoint.replace("http://", "")}`
    : null;
  const allFiles = state?.files ?? [];
  const files = filterByExcludedPaths(allFiles, excludedPaths);
  const pendingFileCount = allFiles.filter((f) =>
    Object.values(f.metrics).some((v) => v === "pending")
  ).length;
  const filteredFiles = applyFilter(files, activeFilter);
  const { data: fileDetail, isLoading: detailLoading } = useFileDetail(
    id ?? "",
    selectedFile
  );
  const handleCIClick = () => {
    setShowSummary(false);
    setShowCIDetail((prev) => !prev);
    setSelectedFile(null);
  };
  const handleFileSelect = (path: string) => {
    setShowSummary(false);
    setShowCIDetail(false);
    setSelectedFile((prev) => (prev === path ? null : path));
  };

  return (
    <div className="agent-insight-page">
      <InsightTitleBar
        collectionName={collection?.name}
        collectionDir={collection?.directory ?? undefined}
        lastScan={state?.lastScan ?? undefined}
        scanning={state?.scanning ?? false}
        analysing={state?.analysing ?? false}
        pendingFileCount={pendingFileCount}
        activeLlmCall={state?.activeLlmCall ?? null}
        modelLabel={modelLabel}
        filteredCount={activeFilter !== null ? filteredFiles.length : null}
        onScan={() => scan.mutate()}
        onConfig={() => setShowConfig(true)}
        onLlmLog={() => setShowLlmLog((v) => !v)}
      />

      <InsightSummaryPanel
        files={files.length > 0 ? files : allFiles}
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
                  collectionId={id ?? ""}
                  files={allFiles}
                  metricLabels={metricLabels}
                  highlightedPath={highlightedPath}
                  selectedPath={selectedFile}
                  onFileSelect={handleFileSelect}
                  onInspect={setInspectedFile}
                  activeFilter={activeFilter}
                  onClearFilter={() => setActiveFilter(null)}
                  excludedPaths={excludedPaths}
                  onExcludePath={handleExcludePath}
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
                  activeLlmCall={state?.activeLlmCall ?? null}
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
          {id && (
            <InsightPageModals
              showConfig={showConfig}
              onConfigClose={() => setShowConfig(false)}
              inspectedFile={inspectedFile}
              onInspectedFileClose={() => setInspectedFile(null)}
              collectionId={id}
              showCIDetail={showCIDetail}
              ciStatus={ciStatus}
              onCIDetailClose={() => setShowCIDetail(false)}
              showSummary={showSummary}
              summary={summary}
              onSummaryClose={() => setShowSummary(false)}
              showLlmLog={showLlmLog}
              onLlmLogClose={() => setShowLlmLog(false)}
              selectedFile={selectedFile}
              fileDetail={fileDetail}
              detailLoading={detailLoading}
              metricLabels={metricLabels}
              onDetailClose={() => setSelectedFile(null)}
              detail={detail}
            />
          )}
        </div>
      </div>
    </div>
  );
}
