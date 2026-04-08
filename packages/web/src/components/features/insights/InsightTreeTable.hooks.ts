import { useEffect } from "react";
import type { FileSnapshotDTO } from "@/api/endpoints/insights";
import { rowId } from "@/components/features/insights/InsightTreeTable.utils";

type UseHighlightPathProps = {
  highlightedPath: string | null;
  viewMode: "tree" | "type" | "score" | "excluded";
  files: FileSnapshotDTO[];
  onSetFlash: (path: string | null) => void;
  onSetExpanded: (fn: (prev: Set<string>) => Set<string>) => void;
};

export function useHighlightPath({
  highlightedPath,
  viewMode,
  files,
  onSetFlash,
  onSetExpanded,
}: UseHighlightPathProps) {
  useEffect(() => {
    if (!highlightedPath) return;
    if (viewMode === "type") {
      const file = files.find((f) => f.relativePath === highlightedPath);
      if (file) {
        onSetExpanded((prev) => {
          const next = new Set(prev);
          next.add(`__type__${file.fileType}`);
          return next;
        });
      }
    } else {
      const parts = highlightedPath.split("/");
      const ancestors = parts
        .slice(0, -1)
        .map((_, i) => parts.slice(0, i + 1).join("/"))
        .filter(Boolean);
      onSetExpanded((prev) => {
        const next = new Set(prev);
        ancestors.forEach((p) => next.add(p));
        return next;
      });
    }
    onSetFlash(highlightedPath);
    setTimeout(() => {
      document
        .getElementById(rowId(highlightedPath))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    const timer = setTimeout(() => onSetFlash(null), 1800);
    return () => clearTimeout(timer);
  }, [highlightedPath, viewMode, files, onSetFlash, onSetExpanded]);
}
