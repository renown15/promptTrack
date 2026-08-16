import type {
  FileMetric,
  FileMetricError,
  MetricOverrideDTO,
} from "@/api/endpoints/insights";
import "@/components/features/insights/MetricBadge.css";

type Props = {
  label: string;
  value: FileMetric | FileMetricError | "pending" | null | undefined;
  override?: MetricOverrideDTO;
};

const STATUS_DOT: Record<string, string> = {
  green: "metric-badge__dot--green",
  amber: "metric-badge__dot--amber",
  red: "metric-badge__dot--red",
  accepted: "metric-badge__dot--accepted",
  rejected: "metric-badge__dot--rejected",
};

function isMetricError(v: unknown): v is FileMetricError {
  return typeof v === "object" && v !== null && "error" in v;
}

export function MetricBadge({ label, value, override }: Props) {
  let dotClass: string;
  let title: string;

  if (override) {
    dotClass = STATUS_DOT[override.status] ?? "metric-badge__dot--override";
    title = `[Override by ${override.source}] ${override.status}: ${override.comment}`;
  } else if (value === "pending") {
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
    dotClass = STATUS_DOT[value.status] ?? "";
    title = value.summary;
  }

  return (
    <span
      className={`metric-badge${override ? " metric-badge--overridden" : ""}`}
      title={title}
    >
      <span className={`metric-badge__dot ${dotClass}`} />
      <span className="metric-badge__label">{label}</span>
    </span>
  );
}
