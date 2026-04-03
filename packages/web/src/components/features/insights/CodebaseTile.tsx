import type { FileSnapshotDTO, InsightFilter } from "@/api/endpoints/insights";
import { filterMatches } from "@/components/features/insights/InsightSummaryPanel.utils";
import {
  Badge,
  StatRow,
} from "@/components/features/insights/InsightSummaryPanel.helpers";

type Props = {
  files: FileSnapshotDTO[];
  gitignoreWarnings: string[];
  activeFilter: InsightFilter | null;
  onFilterToggle: (filter: InsightFilter) => void;
};

export function CodebaseTile({
  files,
  gitignoreWarnings,
  activeFilter,
  onFilterToggle,
}: Props) {
  const totalLines = files.reduce((s, f) => s + f.lineCount, 0);
  const avgLines = files.length > 0 ? Math.round(totalLines / files.length) : 0;
  const mdCount = files.filter((f) => f.relativePath.endsWith(".md")).length;
  const hasScanned = files.length > 0;
  const hasClaude = files.some((f) => f.relativePath === "CLAUDE.md");

  const secFilter: InsightFilter = {
    type: "security-refs",
    paths: gitignoreWarnings,
  };
  const secActive =
    activeFilter !== null && filterMatches(activeFilter, secFilter);

  return (
    <>
      <StatRow label="files" value={String(files.length)} />
      <StatRow label="lines" value={totalLines.toLocaleString()} />
      {avgLines > 0 && <StatRow label="avg / file" value={String(avgLines)} />}
      {mdCount > 0 && <StatRow label="md files" value={String(mdCount)} />}
      {hasScanned && !hasClaude && (
        <Badge colorClass="red" title="No CLAUDE.md found in repo root">
          no CLAUDE.md
        </Badge>
      )}
      {gitignoreWarnings.length > 0 && (
        <Badge
          colorClass="amber"
          clickable
          active={secActive}
          onClick={() => onFilterToggle(secFilter)}
          title={
            secActive
              ? "Clear filter"
              : `Filter to files referencing:\n${gitignoreWarnings.join("\n")}`
          }
        >
          {gitignoreWarnings.length} unignored ref
          {gitignoreWarnings.length !== 1 ? "s" : ""}
        </Badge>
      )}
    </>
  );
}
