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
  hidden?: boolean;
};

function MetricChip({
  filter,
  count,
  label,
  colorClass,
  activeFilter,
  onFilterToggle,
  hidden,
}: ChipProps) {
  const isActive = activeFilter !== null && filterMatches(activeFilter, filter);
  return (
    <button
      className={`insight-summary-panel__chip insight-summary-panel__chip--${colorClass}${isActive ? " insight-summary-panel__chip--active" : ""}`}
      onClick={() => onFilterToggle(filter)}
      title={isActive ? "Clear filter" : `Filter: ${count} ${label}`}
      style={hidden ? { visibility: "hidden" } : undefined}
      tabIndex={hidden ? -1 : undefined}
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
  return (
    <>
      {metricEntries.map(([name, label]) => {
        const h = health[name];
        if (!h) return null;
        const total = h.green + h.amber + h.red + h.error + h.pending;
        if (total === 0) return null;
        const hasFooter = h.error > 0 || h.pending > 0;
        return (
          <div key={name} className="insight-summary-panel__tile">
            <span className="insight-summary-panel__tile-label">{label}</span>
            <div className="insight-summary-panel__chips">
              {/* fixed order: ok → warn → critical (placeholder keeps alignment) */}
              <MetricChip
                filter={{ type: "metric", name, status: "green" }}
                count={h.green}
                label="ok"
                colorClass="green"
                activeFilter={activeFilter}
                onFilterToggle={onFilterToggle}
                hidden={h.green === 0}
              />
              <MetricChip
                filter={{ type: "metric", name, status: "amber" }}
                count={h.amber}
                label="warn"
                colorClass="amber"
                activeFilter={activeFilter}
                onFilterToggle={onFilterToggle}
                hidden={h.amber === 0}
              />
              <MetricChip
                filter={{ type: "metric", name, status: "red" }}
                count={h.red}
                label="critical"
                colorClass="red"
                activeFilter={activeFilter}
                onFilterToggle={onFilterToggle}
                hidden={h.red === 0}
              />
              {/* error + pending share a row, shown only when present */}
              {hasFooter && (
                <div className="insight-summary-panel__chips-footer">
                  {h.error > 0 && (
                    <MetricChip
                      filter={{ type: "metric", name, status: "error" }}
                      count={h.error}
                      label="err"
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
                        …
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
