import type { CSSProperties } from "react";

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

  const tooltipStyle: CSSProperties = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    border: "1px solid #e5e7eb",
    borderRadius: "0.75rem",
    padding: "0.875rem 1.25rem",
    boxShadow: "0 10px 35px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.08)",
    color: "#1f2937",
    fontSize: "0.875rem",
    zIndex: 1000,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    backdropFilter: "blur(8px)",
  };

  const labelStyle: CSSProperties = {
    fontWeight: 700,
    marginBottom: "0.75rem",
    color: "#111827",
    fontSize: "0.9375rem",
    borderBottom: "1px solid #f3f4f6",
    paddingBottom: "0.5rem",
  };

  const itemStyle: CSSProperties = {
    color: "#1f2937",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "0.5rem",
    alignItems: "center",
  };

  const labelPartStyle: CSSProperties = {
    fontWeight: 500,
  };

  const valuePartStyle: CSSProperties = {
    textAlign: "right" as const,
    fontWeight: 600,
  };

  const deltaContainerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.8125rem",
    marginTop: "0.375rem",
  };

  return (
    <div style={tooltipStyle}>
      {label && (
        <div style={labelStyle}>
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      {payload.map((entry, index) => {
        const name = entry.name || "";
        const value =
          typeof entry.value === "number"
            ? entry.value.toLocaleString()
            : entry.value;

        // Get previous value from the entry's payload (full data point from chart)
        const fullDataPoint = entry.payload;
        let prevValue: number | undefined;
        if (fullDataPoint && typeof fullDataPoint === "object") {
          // Strip leading dot from field name if present (e.g., ".ts" → "ts")
          const fieldName = name.startsWith(".") ? name.slice(1) : name;
          prevValue = fullDataPoint[`_prev_${fieldName}`] as number | undefined;
        }

        const change =
          typeof entry.value === "number" && prevValue !== undefined
            ? calculateChange(entry.value, prevValue)
            : null;

        const deltaColor =
          change && change.value > 0
            ? "#059669" // green for increase
            : change && change.value < 0
              ? "#dc2626" // red for decrease
              : "#6b7280"; // gray for no change

        return (
          <div key={`${name}-${index}`}>
            <div style={itemStyle}>
              <span
                style={{
                  ...labelPartStyle,
                  color: entry.color || "#6b7280",
                }}
              >
                {name}
              </span>
              <span
                style={{
                  ...valuePartStyle,
                  color: entry.color || "#1f2937",
                }}
              >
                {value}
              </span>
            </div>
            {change && (
              <div style={deltaContainerStyle}>
                <span style={{ color: deltaColor, fontSize: "0.75rem" }}>
                  {change.value > 0 ? "↑" : change.value < 0 ? "↓" : "→"}
                </span>
                <span style={{ color: deltaColor, fontWeight: 500 }}>
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
