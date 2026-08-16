import "@/components/features/analytics/Analytics.css";

type Props = {
  totalLines: number;
  totalFiles: number;
  avgCoverage: number | null;
  lineGrowth: number;
  totalLineChange: number;
};

export function KeyMetricsSection({
  totalLines,
  totalFiles,
  avgCoverage,
  lineGrowth,
  totalLineChange,
}: Props) {
  return (
    <div className="analytics__metrics-grid">
      <div className="analytics__metric-card">
        <span className="analytics__metric-card-label">
          Total Lines of Code
        </span>
        <div className="analytics__metric-card-value">
          <span>{totalLines.toLocaleString()}</span>
          {lineGrowth !== 0 && (
            <span
              className={`analytics__metric-card-change ${
                lineGrowth > 0
                  ? "analytics__metric-card-change--positive"
                  : "analytics__metric-card-change--negative"
              }`}
            >
              {lineGrowth > 0 ? "+" : ""}
              {lineGrowth.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <div className="analytics__metric-card">
        <span className="analytics__metric-card-label">Total Files</span>
        <div className="analytics__metric-card-value">
          <span>{totalFiles}</span>
        </div>
      </div>

      {avgCoverage !== null && (
        <div className="analytics__metric-card">
          <span className="analytics__metric-card-label">Avg Coverage</span>
          <div className="analytics__metric-card-value">
            <span>{avgCoverage.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {totalLineChange !== 0 && (
        <div className="analytics__metric-card">
          <span className="analytics__metric-card-label">Period Growth</span>
          <div className="analytics__metric-card-value">
            <span>{totalLineChange.toLocaleString()} lines</span>
          </div>
        </div>
      )}
    </div>
  );
}
