import type { FileSnapshotDTO, InsightFilter } from "@/api/endpoints/insights";

export function filterByExcludedPaths(
  files: FileSnapshotDTO[],
  excludedPaths: Set<string>
): FileSnapshotDTO[] {
  return files.filter((f) => {
    const firstSegment = f.relativePath.split("/")[0] ?? "";
    return (
      !excludedPaths.has(firstSegment) &&
      !Array.from(excludedPaths).some((ex) =>
        f.relativePath.startsWith(ex + "/")
      )
    );
  });
}

export function applyFilter(
  files: FileSnapshotDTO[],
  filter: InsightFilter | null
): FileSnapshotDTO[] {
  if (!filter) return files;
  if (filter.type === "git")
    return files.filter((f) => f.gitStatus === filter.status);
  if (filter.type === "coverage")
    return files.filter((f) => f.coverage !== null);
  if (filter.type === "lint")
    return files.filter((f) => (f.lintErrors ?? 0) > 0);
  if (filter.type === "security-refs")
    return files.filter((f) => {
      const sec = f.metrics["security"];
      if (!sec || typeof sec !== "object" || "error" in sec) return false;
      const refs = (sec as { sensitiveRefs?: string[] }).sensitiveRefs ?? [];
      return filter.paths.some((p) => refs.includes(p));
    });
  return files.filter((f) => {
    const v = f.metrics[filter.name];
    if (filter.status === "error")
      return (
        v === null || (typeof v === "object" && v !== null && "error" in v)
      );
    return (
      typeof v === "object" &&
      v !== null &&
      "status" in v &&
      v.status === filter.status
    );
  });
}
