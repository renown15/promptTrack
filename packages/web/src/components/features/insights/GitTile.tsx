import type { InsightFilter } from "@/api/endpoints/insights";
import { Badge } from "@/components/features/insights/InsightSummaryPanel.helpers";
import { filterMatches } from "@/components/features/insights/InsightSummaryPanel.utils";

type Props = {
  modifiedCount: number;
  untrackedCount: number;
  activeFilter: InsightFilter | null;
  onFilterToggle: (filter: InsightFilter) => void;
};

export function GitTile({
  modifiedCount,
  untrackedCount,
  activeFilter,
  onFilterToggle,
}: Props) {
  const noChanges = modifiedCount === 0 && untrackedCount === 0;

  function gitActive(status: "modified" | "untracked") {
    return (
      activeFilter !== null &&
      filterMatches(activeFilter, { type: "git", status })
    );
  }

  return (
    <>
      {noChanges && (
        <span className="insight-summary-panel__tile-clean">clean</span>
      )}
      {!noChanges && (
        <div className="insight-summary-panel__tile-badges">
          {modifiedCount > 0 && (
            <Badge
              colorClass="amber"
              clickable
              active={gitActive("modified")}
              onClick={() =>
                onFilterToggle({ type: "git", status: "modified" })
              }
              title={
                gitActive("modified") ? "Clear filter" : "Filter modified files"
              }
            >
              {modifiedCount} modified
            </Badge>
          )}
          {untrackedCount > 0 && (
            <Badge
              colorClass="red"
              clickable
              active={gitActive("untracked")}
              onClick={() =>
                onFilterToggle({ type: "git", status: "untracked" })
              }
              title={
                gitActive("untracked")
                  ? "Clear filter"
                  : "Filter untracked files"
              }
            >
              {untrackedCount} untracked
            </Badge>
          )}
        </div>
      )}
    </>
  );
}
