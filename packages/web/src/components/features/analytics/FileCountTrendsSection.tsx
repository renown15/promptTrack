import type { FileCountSnapshot } from "@/api/endpoints/collections";
import "@/components/features/analytics/Analytics.css";
import { AnalyticsTooltip } from "@/components/features/analytics/AnalyticsTooltip";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  fileCountSnapshots: FileCountSnapshot[];
};

function formatDate(dateStr: string): string {
  const [_year, month, day] = dateStr.split("-");
  return `${day}-${month}`;
}

function transformData(snapshots: FileCountSnapshot[]) {
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
    };
    s.byFileType.forEach((item) => {
      dataPoint[item.fileType] = item.fileCount;
    });

    // Add previous values for change calculation
    if (prevDataPoint) {
      Array.from(allFileTypes).forEach((ft) => {
        dataPoint[`_prev_${ft}`] = prevDataPoint![ft] || 0;
      });
    }

    prevDataPoint = dataPoint;
    return dataPoint;
  });
}

export function FileCountTrendsSection({ fileCountSnapshots }: Props) {
  if (fileCountSnapshots.length === 0) {
    return null;
  }

  const data = transformData(fileCountSnapshots);

  const allFileTypes = new Set<string>();
  fileCountSnapshots.forEach((s) => {
    s.byFileType.forEach((item) => {
      allFileTypes.add(item.fileType);
    });
  });
  const fileTypeList = Array.from(allFileTypes).sort();

  return (
    <div className="analytics__section">
      <h3 className="analytics__section-title">File Count Over Time</h3>
      <div className="analytics__card analytics__card--chart">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
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
  );
}
