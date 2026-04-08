import type { FileSnapshotDTO } from "@/api/endpoints/insights";
import { FileOverrideDialog } from "@/components/features/insights/FileOverrideDialog";
import { useDeleteOverride, useUpsertOverride } from "@/hooks/useInsights";
import { useState } from "react";

type OverrideTarget = { relativePath: string; metric: string };

export function useOverrideDialog(
  collectionId: string,
  files: FileSnapshotDTO[],
  metricLabels: Record<string, string>
) {
  const [overrideTarget, setOverrideTarget] = useState<OverrideTarget | null>(
    null
  );
  const upsertOverride = useUpsertOverride(collectionId);
  const deleteOverride = useDeleteOverride(collectionId);

  function openOverride(relativePath: string, metric: string) {
    setOverrideTarget({ relativePath, metric });
  }

  function closeOverride() {
    setOverrideTarget(null);
  }

  const dialog = overrideTarget
    ? (() => {
        const file = files.find(
          (f) => f.relativePath === overrideTarget.relativePath
        );
        const existing = file?.overrides[overrideTarget.metric] ?? null;
        return (
          <FileOverrideDialog
            collectionId={collectionId}
            relativePath={overrideTarget.relativePath}
            metric={overrideTarget.metric}
            metricLabel={
              metricLabels[overrideTarget.metric] ?? overrideTarget.metric
            }
            existing={existing}
            saving={upsertOverride.isPending || deleteOverride.isPending}
            onSave={(status, comment) => {
              upsertOverride.mutate(
                {
                  relativePath: overrideTarget.relativePath,
                  metric: overrideTarget.metric,
                  status,
                  comment,
                  source: "human",
                },
                { onSuccess: closeOverride }
              );
            }}
            onRemove={() => {
              deleteOverride.mutate(
                {
                  relativePath: overrideTarget.relativePath,
                  metric: overrideTarget.metric,
                },
                { onSuccess: closeOverride }
              );
            }}
            onClose={closeOverride}
          />
        );
      })()
    : null;

  return { openOverride, dialog };
}
