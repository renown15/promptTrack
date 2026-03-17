import type {
  CoverageDetailDTO,
  LintDetailDTO,
  LintMessageDTO,
} from "@/api/endpoints/insights";
import "@/components/features/insights/InsightDetailPanel.css";

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CoverageBar({ pct }: { pct: number }) {
  const cls =
    pct >= 80
      ? "insight-detail-panel__cov-fill--green"
      : pct >= 50
        ? "insight-detail-panel__cov-fill--amber"
        : "insight-detail-panel__cov-fill--red";
  return (
    <span className="insight-detail-panel__cov-bar">
      <span
        className={`insight-detail-panel__cov-fill ${cls}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

export function CoverageSection({ coverage }: { coverage: CoverageDetailDTO }) {
  const rows: [string, { pct: number }][] = [
    ["Lines", coverage.lines],
    ["Branches", coverage.branches],
    ["Functions", coverage.functions],
    ["Statements", coverage.statements],
  ];
  return (
    <div className="insight-detail-panel__section">
      <div className="insight-detail-panel__section-header">
        <span>Coverage</span>
        <span className="insight-detail-panel__section-age">
          {timeAgo(coverage.reportedAt)}
        </span>
      </div>
      <div className="insight-detail-panel__cov-grid">
        {rows.map(([label, stat]) => (
          <div key={label} className="insight-detail-panel__cov-row">
            <span className="insight-detail-panel__cov-label">{label}</span>
            <CoverageBar pct={stat.pct} />
            <span className="insight-detail-panel__cov-pct">{stat.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LintSection({ lint }: { lint: LintDetailDTO }) {
  return (
    <div className="insight-detail-panel__section">
      <div className="insight-detail-panel__section-header">
        <span>
          Lint
          {lint.errors > 0 && (
            <span className="insight-detail-panel__lint-badge insight-detail-panel__lint-badge--error">
              {lint.errors} error{lint.errors !== 1 ? "s" : ""}
            </span>
          )}
          {lint.warnings > 0 && (
            <span className="insight-detail-panel__lint-badge insight-detail-panel__lint-badge--warn">
              {lint.warnings} warning{lint.warnings !== 1 ? "s" : ""}
            </span>
          )}
          {lint.errors === 0 && lint.warnings === 0 && (
            <span className="insight-detail-panel__lint-badge insight-detail-panel__lint-badge--ok">
              clean
            </span>
          )}
        </span>
        <span className="insight-detail-panel__section-age">
          {timeAgo(lint.reportedAt)}
        </span>
      </div>
      {lint.messages.length > 0 && (
        <div className="insight-detail-panel__lint-messages">
          {lint.messages.map((m: LintMessageDTO, i: number) => (
            <div
              key={i}
              className={`insight-detail-panel__lint-msg${m.severity === 2 ? " insight-detail-panel__lint-msg--error" : " insight-detail-panel__lint-msg--warn"}`}
            >
              <span className="insight-detail-panel__lint-loc">
                {m.line}:{m.column}
              </span>
              <span className="insight-detail-panel__lint-text">
                {m.message}
              </span>
              {m.ruleId && (
                <span className="insight-detail-panel__lint-rule">
                  {m.ruleId}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
