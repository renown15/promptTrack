import type {
  CoverageSnapshot,
  VolumeSnapshot,
} from "@/api/endpoints/collections";
import "@/components/features/analytics/Analytics.css";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  volumeSnapshots: VolumeSnapshot[];
  coverageSnapshots: CoverageSnapshot[];
};

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

function formatDate(dateStr: string): string {
  const [_year, month, day] = dateStr.split("-");
  return `${day}-${month}`;
}

function transformVolumeData(snapshots: VolumeSnapshot[]) {
  const allFileTypes = new Set<string>();
  snapshots.forEach((s) => {
    s.byFileType.forEach((item) => {
      allFileTypes.add(item.fileType);
    });
  });

  return snapshots.map((s) => {
    const dataPoint: Record<string, unknown> = {
      date: formatDate(s.date),
      total: s.totalLines,
    };
    s.byFileType.forEach((item) => {
      dataPoint[item.fileType] = item.lineCount;
    });
    return dataPoint;
  });
}

function transformCoverageData(snapshots: CoverageSnapshot[]) {
  return snapshots.map((s) => ({
    date: formatDate(s.date),
    coverage: s.avgCoverage,
  }));
}

export function TrendsSection({ volumeSnapshots, coverageSnapshots }: Props) {
  if (volumeSnapshots.length === 0 && coverageSnapshots.length === 0) {
    return null;
  }

  const volumeData = transformVolumeData(volumeSnapshots);
  const coverageData = transformCoverageData(coverageSnapshots);

  const allFileTypes = new Set<string>();
  volumeSnapshots.forEach((s) => {
    s.byFileType.forEach((item) => {
      allFileTypes.add(item.fileType);
    });
  });
  const fileTypeList = Array.from(allFileTypes).sort();

  return (
    <>
      {volumeData.length > 0 && (
        <div className="analytics__section">
          <h3 className="analytics__section-title">Code Volume Over Time</h3>
          <div className="analytics__card analytics__card--chart">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={volumeData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                  formatter={(value) => {
                    if (typeof value === "number") {
                      return value.toLocaleString();
                    }
                    return value;
                  }}
                />
                <Legend />
                {fileTypeList.map((ft) => (
                  <Bar
                    key={ft}
                    dataKey={ft}
                    stackId="a"
                    fill={FILE_TYPE_COLORS[ft] || FILE_TYPE_COLORS.other}
                    name={`.${ft}`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {coverageData.length > 1 && (
        <div className="analytics__section">
          <h3 className="analytics__section-title">Test Coverage Trend</h3>
          <div className="analytics__card analytics__card--chart">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={coverageData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                  formatter={(value) => {
                    if (typeof value === "number") {
                      return value.toFixed(1) + "%";
                    }
                    return value;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="coverage"
                  stroke="#10b981"
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Average Coverage %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
