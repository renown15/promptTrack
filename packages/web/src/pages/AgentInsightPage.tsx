import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useCollections } from "@/hooks/useCollections";
import {
  useInsights,
  useScanInsights,
  useOllamaConfig,
  useFileDetail,
  useInsightAggregate,
} from "@/hooks/useInsights";
import type { InsightFilter } from "@/hooks/useInsights";
import { useResizeHandle } from "@/hooks/useResizeHandle";
import { applyFilter } from "@/pages/AgentInsightPage.utils";
import { InsightSummaryPanel } from "@/components/features/insights/InsightSummaryPanel";
import { InsightTreeTable } from "@/components/features/insights/InsightTreeTable";
import { InsightActivityStack } from "@/components/features/insights/InsightActivityStack";
import { InsightDetailPanel } from "@/components/features/insights/InsightDetailPanel";
import { OllamaConfigModal } from "@/components/features/insights/OllamaConfigModal";
import "@/pages/AgentInsightPage.css";

const HANDLE_H = 8;

export function AgentInsightPage() {
  const { id } = useParams<{ id: string }>();
  const { data: collections } = useCollections();
  const collection = collections?.find((c) => c.id === id);

  const { data: state, isLoading } = useInsights(id ?? "");
  const scan = useScanInsights(id ?? "");
  const { data: ollamaCfg } = useOllamaConfig();
  const { data: aggregate } = useInsightAggregate(id ?? "");

  const [searchParams, setSearchParams] = useSearchParams();
  const [showConfig, setShowConfig] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
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
    setActiveFilter((prev) => {
      if (!prev) return filter;
      if (prev.type !== filter.type) return filter;
      if (
        prev.type === "git" &&
        filter.type === "git" &&
        prev.status === filter.status
      )
        return null;
      if (
        prev.type === "metric" &&
        filter.type === "metric" &&
        prev.name === filter.name &&
        prev.status === filter.status
      )
        return null;
      return filter;
    });
  }

  const panelBottom = detail.size + HANDLE_H;

  return (
    <div className="agent-insight-page">
      <div className="agent-insight-page__title-bar">
        <span className="agent-insight-page__title">Agent Insight</span>
        {collection?.name && (
          <span className="agent-insight-page__project">{collection.name}</span>
        )}
        {collection?.directory && (
          <span className="agent-insight-page__dir">
            {collection.directory}
          </span>
        )}
      </div>

      <InsightSummaryPanel
        files={files}
        metricLabels={metricLabels}
        lastScan={state?.lastScan ?? null}
        scanning={state?.scanning ?? false}
        onScan={() => scan.mutate()}
        onConfig={() => setShowConfig(true)}
        modelLabel={modelLabel}
        aggregate={aggregate ?? null}
        activeFilter={activeFilter}
        onFilterToggle={handleFilterToggle}
      />

      <div className="agent-insight-page__body">
        <div
          className="agent-insight-page__main-row"
          style={{ bottom: panelBottom }}
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
                  onFileSelect={(p) =>
                    setSelectedFile((prev) => (prev === p ? null : p))
                  }
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
                    setSelectedFile(p);
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
          <InsightDetailPanel
            relativePath={selectedFile}
            detail={selectedFile ? fileDetail : undefined}
            isLoading={selectedFile ? detailLoading : false}
            metricLabels={metricLabels}
            onClose={() => setSelectedFile(null)}
          />
        </div>
      </div>

      {showConfig && <OllamaConfigModal onClose={() => setShowConfig(false)} />}
    </div>
  );
}
