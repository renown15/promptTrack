import { filterMatches } from "@/components/features/insights/InsightSummaryPanel.utils";
import { useUpdateInScopeDirectories } from "@/hooks/useCollections";
import type { InsightFilter } from "@/hooks/useInsights";
import { useCallback, useState } from "react";

export function useInsightPageHandlers(collectionId: string) {
  const [excludedPaths, setExcludedPaths] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<InsightFilter | null>(null);
  const updateExclusions = useUpdateInScopeDirectories(collectionId ?? "");

  const handleFilterToggle = useCallback(
    (filter: InsightFilter) =>
      setActiveFilter((prev) =>
        prev && filterMatches(prev, filter) ? null : filter
      ),
    []
  );

  const handleExcludePath = useCallback(
    (path: string) => {
      const newExcluded = new Set(excludedPaths);
      if (newExcluded.has(path)) newExcluded.delete(path);
      else newExcluded.add(path);
      setExcludedPaths(newExcluded);
      updateExclusions.mutate(Array.from(newExcluded));
    },
    [excludedPaths, updateExclusions]
  );

  return {
    excludedPaths,
    setExcludedPaths,
    activeFilter,
    setActiveFilter,
    handleFilterToggle,
    handleExcludePath,
  };
}
