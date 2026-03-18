import type { InsightFilter } from "@/api/endpoints/insights";
import type { MetricHealth } from "@/components/features/insights/InsightSummaryPanel.utils";
import { filterMatches } from "@/components/features/insights/InsightSummaryPanel.utils";
import "@/components/features/insights/InsightSummaryPanel.css";

type Props = {
  metricEntries: [string, string][];
  health: Record<string, MetricHealth>;
  activeFilter: InsightFilter | null;
  onFilterToggle: (filter: InsightFilter) => void;
};

type DotStatus = "red" | "amber" | "green" | "error" | "pending";

function worstStatus(h: MetricHealth): DotStatus | null {
  if (h.red > 0) return "red";
  if (h.error > 0) return "error";
  if (h.amber > 0) return "amber";
  if (h.pending > 0) return "pending";
  if (h.green > 0) return "green";
  return null;
}

function worstCount(h: MetricHealth, status: DotStatus): number {
  return h[status === "error" ? "error" : status] ?? 0;
}

function breakdown(h: MetricHealth): string {
  const parts: string[] = [];
  if (h.red > 0) parts.push(`${h.red} critical`);
  if (h.amber > 0) parts.push(`${h.amber} warn`);
  if (h.green > 0) parts.push(`${h.green} ok`);
  if (h.error > 0) parts.push(`${h.error} error`);
  if (h.pending > 0) parts.push(`${h.pending} pending`);
  return parts.join(" · ");
}

export function InsightMetricPills({
  metricEntries,
  health,
  activeFilter,
  onFilterToggle,
}: Props) {
  if (metricEntries.length === 0) return null;

  return (
    <>
      <span className="insight-summary-panel__divider" />
      {metricEntries.map(([name, label]) => {
        const h = health[name];
        if (!h) return null;
        const worst = worstStatus(h);
        if (worst === null) return null;

        const count = worstCount(h, worst);
        const isClickable = worst !== "pending";
        const filter: InsightFilter | null = isClickable
          ? {
              type: "metric",
              name,
              status: worst === "error" ? "error" : worst,
            }
          : null;
        const isActive =
          filter !== null &&
          activeFilter !== null &&
          filterMatches(activeFilter, filter);

        const dotClass = [
          "insight-summary-panel__dot",
          `insight-summary-panel__dot--${worst}`,
          isActive ? "insight-summary-panel__dot--active" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const tooltipText = `${breakdown(h)}${isClickable ? ` — ${isActive ? "clear filter" : "click to filter"}` : ""}`;

        return (
          <span key={name} className="insight-summary-panel__metric">
            <span className="insight-summary-panel__metric-label">{label}</span>
            {filter ? (
              <button
                className={dotClass}
                onClick={() => onFilterToggle(filter)}
                title={tooltipText}
              >
                {count}
              </button>
            ) : (
              <span className={dotClass} title={tooltipText}>
                {count}
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}
