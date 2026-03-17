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

export function InsightMetricPills({
  metricEntries,
  health,
  activeFilter,
  onFilterToggle,
}: Props) {
  function pill(filter: InsightFilter, colorClass: string, label: string) {
    const active = activeFilter !== null && filterMatches(activeFilter, filter);
    return (
      <button
        className={`insight-summary-panel__count insight-summary-panel__count--${colorClass}${active ? " insight-summary-panel__count--active" : ""}`}
        onClick={() => onFilterToggle(filter)}
        title={active ? "Clear filter" : `Filter: ${label}`}
      >
        {label}
      </button>
    );
  }

  if (metricEntries.length === 0) return null;

  return (
    <>
      <span className="insight-summary-panel__divider" />
      {metricEntries.map(([name, label]) => {
        const h = health[name];
        if (!h) return null;
        const total = h.green + h.amber + h.red + h.error + h.pending;
        if (total === 0) return null;
        return (
          <span key={name} className="insight-summary-panel__metric">
            <span className="insight-summary-panel__metric-label">{label}</span>
            {h.red > 0 &&
              pill(
                { type: "metric", name, status: "red" },
                "red",
                `${h.red} critical`
              )}
            {h.amber > 0 &&
              pill(
                { type: "metric", name, status: "amber" },
                "amber",
                `${h.amber} warn`
              )}
            {h.green > 0 &&
              pill(
                { type: "metric", name, status: "green" },
                "green",
                `${h.green} ok`
              )}
            {h.error > 0 &&
              pill(
                { type: "metric", name, status: "error" },
                "error",
                `${h.error} err`
              )}
            {h.pending > 0 && (
              <span className="insight-summary-panel__count insight-summary-panel__count--pending">
                {h.pending} pending
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}
