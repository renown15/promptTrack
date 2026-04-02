import type { FileSnapshotDTO } from "@/api/endpoints/insights";
import {
  Badge,
  StatRow,
} from "@/components/features/insights/InsightSummaryPanel.helpers";

type Props = {
  files: FileSnapshotDTO[];
  gitignoreWarnings: string[];
};

export function CodebaseTile({ files, gitignoreWarnings }: Props) {
  const totalLines = files.reduce((s, f) => s + f.lineCount, 0);
  const avgLines = files.length > 0 ? Math.round(totalLines / files.length) : 0;
  const mdCount = files.filter((f) => f.relativePath.endsWith(".md")).length;
  const hasScanned = files.length > 0;
  const hasClaude = files.some((f) => f.relativePath === "CLAUDE.md");
  const hasMemory = files.some((f) => f.relativePath === "MEMORY.md");

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
      {hasScanned && !hasMemory && (
        <Badge colorClass="amber" title="No MEMORY.md found in repo root">
          no MEMORY.md
        </Badge>
      )}
      {gitignoreWarnings.length > 0 && (
        <Badge
          colorClass="amber"
          title={`Sensitive paths not covered by .gitignore:\n${gitignoreWarnings.join("\n")}`}
        >
          {gitignoreWarnings.length} unignored ref
          {gitignoreWarnings.length !== 1 ? "s" : ""}
        </Badge>
      )}
    </>
  );
}
