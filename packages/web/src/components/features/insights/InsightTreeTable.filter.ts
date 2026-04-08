import type { FileSnapshotDTO, InsightFilter } from "@/api/endpoints/insights";

export function filterTreeTableFiles(
  files: FileSnapshotDTO[],
  viewMode: "tree" | "type" | "score" | "excluded",
  excludedPaths: Set<string>,
  activeFilter: InsightFilter | null
): FileSnapshotDTO[] {
  let result: FileSnapshotDTO[] = files;

  // Apply exclusion filtering based on view mode
  if (viewMode === "excluded") {
    // Show ONLY excluded items
    result = result.filter((f) => {
      const firstSegment = f.relativePath.split("/")[0] ?? "";
      return (
        excludedPaths.has(firstSegment) ||
        Array.from(excludedPaths).some((ex) =>
          f.relativePath.startsWith(ex + "/")
        )
      );
    });
  } else {
    // Show non-excluded items
    result = result.filter((f) => {
      const firstSegment = f.relativePath.split("/")[0] ?? "";
      return (
        !excludedPaths.has(firstSegment) &&
        !Array.from(excludedPaths).some((ex) =>
          f.relativePath.startsWith(ex + "/")
        )
      );
    });
  }

  // Apply active filter
  if (activeFilter) {
    result = result.filter((f) => {
      if (activeFilter.type === "git")
        return f.gitStatus === activeFilter.status;
      if (activeFilter.type === "coverage") return f.coverage !== null;
      if (activeFilter.type === "lint") return (f.lintErrors ?? 0) > 0;
      if (activeFilter.type === "near-blank") return f.lineCount <= 1;
      if (activeFilter.type === "security-refs") {
        const sec = f.metrics["security"];
        if (!sec || typeof sec !== "object" || "error" in sec) return false;
        const refs = (sec as { sensitiveRefs?: string[] }).sensitiveRefs ?? [];
        return activeFilter.paths.some((p) => refs.includes(p));
      }
      const v = f.metrics[activeFilter.name];
      if (activeFilter.status === "error")
        return (
          v === null || (typeof v === "object" && v !== null && "error" in v)
        );
      return (
        typeof v === "object" &&
        v !== null &&
        "status" in v &&
        v.status === activeFilter.status
      );
    });
  }

  return result;
}
