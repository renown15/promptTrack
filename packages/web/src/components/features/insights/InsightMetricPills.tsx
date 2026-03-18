import type { InsightFilter } from "@/api/endpoints/insights";
import type { MetricHealth } from "@/components/features/insights/InsightSummaryPanel.utils";
import { filterMatches } from "@/components/features/insights/InsightSummaryPanel.utils";
import "@/components/features/insights/InsightSummaryPanel.css";

type ChipProps = {
  filter: InsightFilter;
  count: number;
  label: string;
  colorClass: string;
  activeFilter: InsightFilter | null;
  onFilterToggle: (f: InsightFilter) => void;
};

function MetricChip({
  filter,
  count,
  label,
  colorClass,
  activeFilter,
  onFilterToggle,
}: ChipProps) {
  const isActive = activeFilter !== null && filterMatches(activeFilter, filter);
  return (
    <button
      className={`insight-summary-panel__chip insight-summary-panel__chip--${colorClass}${isActive ? " insight-summary-panel__chip--active" : ""}`}
      onClick={() => onFilterToggle(filter)}
      title={isActive ? "Clear filter" : `Filter: ${count} ${label}`}
    >
      <span className="insight-summary-panel__chip-count">{count}</span>
      <span className="insight-summary-panel__chip-label">{label}</span>
    </button>
  );
}

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
  if (metricEntries.length === 0) return null;

  return (
    <div className="insight-summary-panel__cards">
      {metricEntries.map(([name, label]) => {
        const h = health[name];
        if (!h) return null;
        const total = h.green + h.amber + h.red + h.error + h.pending;
        if (total === 0) return null;
        return (
          <div key={name} className="insight-summary-panel__card">
            <span className="insight-summary-panel__card-name">{label}</span>
            {h.red > 0 && (
              <MetricChip
                filter={{ type: "metric", name, status: "red" }}
                count={h.red}
                label="critical"
                colorClass="red"
                activeFilter={activeFilter}
                onFilterToggle={onFilterToggle}
              />
            )}
            {h.amber > 0 && (
              <MetricChip
                filter={{ type: "metric", name, status: "amber" }}
                count={h.amber}
                label="warn"
                colorClass="amber"
                activeFilter={activeFilter}
                onFilterToggle={onFilterToggle}
              />
            )}
            {h.green > 0 && (
              <MetricChip
                filter={{ type: "metric", name, status: "green" }}
                count={h.green}
                label="ok"
                colorClass="green"
                activeFilter={activeFilter}
                onFilterToggle={onFilterToggle}
              />
            )}
            {h.error > 0 && (
              <MetricChip
                filter={{ type: "metric", name, status: "error" }}
                count={h.error}
                label="error"
                colorClass="error"
                activeFilter={activeFilter}
                onFilterToggle={onFilterToggle}
              />
            )}
            {h.pending > 0 && (
              <span className="insight-summary-panel__chip insight-summary-panel__chip--pending">
                <span className="insight-summary-panel__chip-count">
                  {h.pending}
                </span>
                <span className="insight-summary-panel__chip-label">
                  pending
                </span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
