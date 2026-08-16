import type {
  CoverageSnapshot,
  VolumeSnapshot,
} from "@/api/endpoints/collections";
import "@/components/features/analytics/Analytics.css";
import { AnalyticsTooltip } from "@/components/features/analytics/AnalyticsTooltip";
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

  let prevDataPoint: Record<string, unknown> | null = null;
  return snapshots.map((s) => {
    const dataPoint: Record<string, unknown> = {
      date: formatDate(s.date),
      total: s.totalLines,
    };
    s.byFileType.forEach((item) => {
      dataPoint[item.fileType] = item.lineCount;
    });

    // Add previous values for change calculation
    if (prevDataPoint) {
      dataPoint._prev_total = prevDataPoint.total;
      Array.from(allFileTypes).forEach((ft) => {
        dataPoint[`_prev_${ft}`] = prevDataPoint![ft] || 0;
      });
    }

    prevDataPoint = dataPoint;
    return dataPoint;
  });
}

function transformCoverageData(snapshots: CoverageSnapshot[]) {
  let prevCoverage: number | null = null;
  return snapshots.map((s) => {
    const dataPoint: Record<string, unknown> = {
      date: formatDate(s.date),
      coverage: s.avgCoverage,
    };
    if (prevCoverage !== null) {
      dataPoint._prev_coverage = prevCoverage;
    }
    prevCoverage = s.avgCoverage;
    return dataPoint;
  });
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
                <Tooltip content={<AnalyticsTooltip />} />
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
                  content={<AnalyticsTooltip />}
                  formatter={(value): string => {
                    if (typeof value === "number") {
                      return value.toFixed(1) + "%";
                    }
                    return String(value);
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
