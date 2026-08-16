import type {
  AggregateStatsDTO,
  CIStatusDTO,
  InsightFilter,
} from "@/api/endpoints/insights";
import {
  Badge,
  PipelineRow,
} from "@/components/features/insights/InsightSummaryPanel.helpers";
import {
  ciRag,
  ragCoverage,
  ragLint,
  timeAgo,
} from "@/components/features/insights/InsightSummaryPanel.utils";

type Props = {
  aggregate: AggregateStatsDTO | null;
  ciStatus: CIStatusDTO | null;
  activeFilter: InsightFilter | null;
  onFilterToggle: (filter: InsightFilter) => void;
  onCIClick: () => void;
};

export function PipelineTile({
  aggregate,
  ciStatus,
  activeFilter,
  onFilterToggle,
  onCIClick,
}: Props) {
  return (
    <>
      {aggregate?.coverage ? (
        <PipelineRow label="cov" age={timeAgo(aggregate.coverage.reportedAt)}>
          <Badge
            colorClass={ragCoverage(aggregate.coverage.linesPct)}
            clickable
            active={activeFilter?.type === "coverage"}
            onClick={() => onFilterToggle({ type: "coverage" })}
            title={
              activeFilter?.type === "coverage"
                ? "Clear filter"
                : "Filter by coverage"
            }
          >
            {aggregate.coverage.linesPct}%
          </Badge>
        </PipelineRow>
      ) : (
        <Badge
          colorClass="amber"
          title="No coverage report found (coverage/coverage-summary.json or coverage.json)"
        >
          no tests
        </Badge>
      )}
      {aggregate?.lint ? (
        <PipelineRow label="lint" age={timeAgo(aggregate.lint.reportedAt)}>
          <Badge
            colorClass={ragLint(aggregate.lint.errors)}
            clickable
            active={activeFilter?.type === "lint"}
            onClick={() => onFilterToggle({ type: "lint" })}
            title={
              activeFilter?.type === "lint"
                ? "Clear filter"
                : "Filter lint errors"
            }
          >
            {aggregate.lint.errors === 0
              ? "clean"
              : `${aggregate.lint.errors} err`}
          </Badge>
          {aggregate.lint.warnings > 0 && (
            <Badge colorClass="amber">{aggregate.lint.warnings} warn</Badge>
          )}
        </PipelineRow>
      ) : (
        <Badge
          colorClass="amber"
          title="No lint report found (.eslint-report.json or .ruff-report.json)"
        >
          no lint
        </Badge>
      )}
      {ciStatus?.run && (
        <PipelineRow label="CI" age={timeAgo(ciStatus.run.createdAt)}>
          <Badge
            colorClass={ciRag(ciStatus.run.conclusion, ciStatus.run.status)}
            clickable
            onClick={onCIClick}
            title="View CI details"
          >
            {ciStatus.run.status !== "completed"
              ? "running"
              : (ciStatus.run.conclusion ?? "—")}
          </Badge>
        </PipelineRow>
      )}
    </>
  );
}
