import type { CodeMakeup } from "@/api/endpoints/collections";
import "@/components/features/analytics/Analytics.css";

const FILE_TYPE_COLORS: Record<string, string> = {
  ts: "#3b82f6",
  tsx: "#8b5cf6",
  js: "#f59e0b",
  jsx: "#f97316",
  py: "#10b981",
  css: "#ec4899",
  md: "#6366f1",
  go: "#14b8a6",
  rs: "#ef4444",
  json: "#6b7280",
  other: "#9ca3af",
};

type Props = {
  makeup: CodeMakeup[];
  totalLines: number;
};

export function CodeMakeupSection({ makeup, totalLines }: Props) {
  if (makeup.length === 0) return null;

  return (
    <div className="analytics__section">
      <h3 className="analytics__section-title">Current Code Composition</h3>
      <div className="analytics__card">
        <div className="analytics__composition-grid">
          {makeup.map((item) => (
            <div
              key={item.fileType}
              className="analytics__composition-item-horizontal"
              style={
                {
                  "--type-color":
                    FILE_TYPE_COLORS[item.fileType] || FILE_TYPE_COLORS.other,
                } as React.CSSProperties & { "--type-color": string }
              }
            >
              <div className="analytics__composition-item-header">
                <div className="analytics__composition-swatch" />
                <span className="analytics__composition-type">
                  {item.fileType}
                </span>
              </div>
              <div className="analytics__composition-stats-horizontal">
                <span title={`${item.fileCount} files`}>{item.fileCount}f</span>
                <span title={`${item.lineCount.toLocaleString()} lines`}>
                  {item.lineCount < 1000
                    ? item.lineCount
                    : (item.lineCount / 1000).toFixed(1)}
                  k
                </span>
                <span title="percentage of total">
                  {((item.lineCount / totalLines) * 100).toFixed(1)}%
                </span>
                {item.nearBlankCount > 0 && (
                  <span
                    title="files with 1 line or less"
                    className="analytics__near-blank"
                  >
                    {item.nearBlankCount}⊘
                  </span>
                )}
                {item.avgCoverage !== null && (
                  <span
                    className="analytics__composition-coverage"
                    title="test coverage"
                  >
                    {item.avgCoverage.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
