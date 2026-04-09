import "@/components/features/analytics/AnalyticsTooltip.css";

type TooltipPayload = {
  name: string;
  value: number | string;
  color: string;
  payload?: Record<string, unknown>;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  labelFormatter?: (label: string) => string;
};

function calculateChange(
  current: number,
  previous: number | undefined
): { value: number; percent: number } | null {
  if (previous === undefined || previous === 0) return null;
  const value = current - previous;
  const percent = (value / previous) * 100;
  return { value, percent };
}

export function AnalyticsTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="analytics-tooltip">
      {label && (
        <div className="analytics-tooltip__label">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      {payload.map((entry, index) => {
        const name = entry.name || "";
        const value =
          typeof entry.value === "number"
            ? entry.value.toLocaleString()
            : entry.value;

        const fullDataPoint = entry.payload;
        let prevValue: number | undefined;
        if (fullDataPoint && typeof fullDataPoint === "object") {
          const fieldName = name.startsWith(".") ? name.slice(1) : name;
          prevValue = fullDataPoint[`_prev_${fieldName}`] as number | undefined;
        }

        const change =
          typeof entry.value === "number" && prevValue !== undefined
            ? calculateChange(entry.value, prevValue)
            : null;

        const deltaColor =
          change && change.value > 0
            ? "#059669"
            : change && change.value < 0
              ? "#dc2626"
              : "#6b7280";

        return (
          <div key={`${name}-${index}`}>
            <div className="analytics-tooltip__item">
              <span
                className="analytics-tooltip__item-label"
                style={
                  {
                    "--entry-color": entry.color || "#6b7280",
                  } as React.CSSProperties
                }
              >
                {name}
              </span>
              <span
                className="analytics-tooltip__item-value"
                style={
                  {
                    "--entry-color": entry.color || "#1f2937",
                  } as React.CSSProperties
                }
              >
                {value}
              </span>
            </div>
            {change && (
              <div
                className="analytics-tooltip__delta"
                style={{ "--delta-color": deltaColor } as React.CSSProperties}
              >
                <span className="analytics-tooltip__delta-arrow">
                  {change.value > 0 ? "↑" : change.value < 0 ? "↓" : "→"}
                </span>
                <span className="analytics-tooltip__delta-value">
                  {Math.abs(change.value).toLocaleString()} (
                  {change.value > 0 ? "+" : ""}
                  {change.percent.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
