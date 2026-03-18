import type { ReactNode } from "react";
import "@/components/features/insights/InsightSummaryPanel.css";

export function Tile({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="insight-summary-panel__tile">
      <span className="insight-summary-panel__tile-label">{label}</span>
      {children}
    </div>
  );
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="insight-summary-panel__stat-row">
      <span className="insight-summary-panel__stat-value">{value}</span>
      <span className="insight-summary-panel__stat-label">{label}</span>
    </div>
  );
}

export function PipelineRow({
  label,
  age,
  children,
}: {
  label: string;
  age?: string;
  children: ReactNode;
}) {
  return (
    <div className="insight-summary-panel__pipeline-row">
      <span className="insight-summary-panel__pipeline-label">{label}</span>
      <span className="insight-summary-panel__pipeline-badge">{children}</span>
      {age && (
        <span className="insight-summary-panel__pipeline-age">{age}</span>
      )}
    </div>
  );
}

export function Badge({
  children,
  colorClass,
  clickable,
  active,
  onClick,
  title,
}: {
  children: ReactNode;
  colorClass: string;
  clickable?: boolean;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const cls = [
    "insight-summary-panel__badge",
    `insight-summary-panel__badge--${colorClass}`,
    clickable ? "insight-summary-panel__badge--clickable" : "",
    active ? "insight-summary-panel__badge--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (clickable && onClick) {
    return (
      <button className={cls} onClick={onClick} title={title}>
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}
