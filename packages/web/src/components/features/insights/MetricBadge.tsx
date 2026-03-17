import type { FileMetric, FileMetricError } from "@/api/endpoints/insights";
import "@/components/features/insights/MetricBadge.css";

type Props = {
  label: string;
  value: FileMetric | FileMetricError | "pending" | null | undefined;
};

const STATUS_DOT: Record<FileMetric["status"], string> = {
  green: "metric-badge__dot--green",
  amber: "metric-badge__dot--amber",
  red: "metric-badge__dot--red",
};

function isMetricError(v: unknown): v is FileMetricError {
  return typeof v === "object" && v !== null && "error" in v;
}

export function MetricBadge({ label, value }: Props) {
  let dotClass: string;
  let title: string;

  if (value === "pending") {
    dotClass = "metric-badge__dot--pending";
    title = "Analysing…";
  } else if (value === undefined) {
    dotClass = "metric-badge__dot--unrun";
    title = "Not yet analysed";
  } else if (value === null) {
    dotClass = "metric-badge__dot--error";
    title = "Analysis failed";
  } else if (isMetricError(value)) {
    dotClass = "metric-badge__dot--error";
    title = value.error;
  } else {
    dotClass = STATUS_DOT[value.status];
    title = value.summary;
  }

  return (
    <span className="metric-badge" title={title}>
      <span className={`metric-badge__dot ${dotClass}`} />
      <span className="metric-badge__label">{label}</span>
    </span>
  );
}
