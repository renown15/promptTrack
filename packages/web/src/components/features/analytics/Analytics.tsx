import "@/components/features/analytics/Analytics.css";
import { CodeMakeupSection } from "@/components/features/analytics/CodeMakeupSection";
import { FileCountTrendsSection } from "@/components/features/analytics/FileCountTrendsSection";
import { KeyMetricsSection } from "@/components/features/analytics/KeyMetricsSection";
import { TrendsSection } from "@/components/features/analytics/TrendsSection";
import { useAnalytics } from "@/hooks/useCollections";
import { useState } from "react";

type Props = {
  collectionId: string;
};

export function Analytics({ collectionId }: Props) {
  const [days, setDays] = useState(30);
  const { data: allData, isLoading: isLoadingAll } = useAnalytics(
    collectionId,
    days
  );

  if (isLoadingAll) {
    return <div className="analytics__loading">Loading analytics...</div>;
  }

  if (!allData) {
    return (
      <div className="analytics__error">
        Unable to load analytics data. Please try again.
      </div>
    );
  }

  const volumeSnapshots = allData.volume || [];
  const coverageSnapshots = allData.coverage || [];
  const fileCountSnapshots = allData.fileCount || [];
  const makeup = allData.makeup || [];
  const growth = allData.growth;

  const latestVolume =
    volumeSnapshots.length > 0
      ? volumeSnapshots[volumeSnapshots.length - 1]
      : null;
  const latestCoverage =
    coverageSnapshots.length > 0
      ? coverageSnapshots[coverageSnapshots.length - 1]
      : null;
  const earliestVolume = volumeSnapshots.length > 0 ? volumeSnapshots[0] : null;

  const totalLines = latestVolume?.totalLines || 0;
  const totalFiles = latestVolume?.totalFiles || 0;
  const totalLineChange = earliestVolume
    ? latestVolume!.totalLines - earliestVolume.totalLines
    : 0;
  const lineGrowth = growth
    ? ((growth.endLines - growth.startLines) / (growth.startLines || 1)) * 100
    : 0;

  return (
    <div className="analytics">
      <div className="analytics__header">
        <h2 className="analytics__title">Codebase Analytics</h2>
        <div className="analytics__range-selector">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              className={`analytics__range-btn ${
                days === d ? "analytics__range-btn--active" : ""
              }`}
              onClick={() => setDays(d)}
            >
              {d === 365 ? "1y" : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      <KeyMetricsSection
        totalLines={totalLines}
        totalFiles={totalFiles}
        avgCoverage={latestCoverage?.avgCoverage ?? null}
        lineGrowth={lineGrowth}
        totalLineChange={totalLineChange}
      />

      <CodeMakeupSection makeup={makeup} totalLines={totalLines} />

      <FileCountTrendsSection fileCountSnapshots={fileCountSnapshots} />

      <TrendsSection
        volumeSnapshots={volumeSnapshots}
        coverageSnapshots={coverageSnapshots}
      />
    </div>
  );
}
