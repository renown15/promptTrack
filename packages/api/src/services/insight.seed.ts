import { fileSnapshotRepository } from "@/repositories/file-snapshot.repository.js";
import { fileStatusOverrideRepository } from "@/repositories/file-status-override.repository.js";
import {
  getOrCreateState,
  type MetricOverride,
  type MetricResult,
} from "@/services/insight.cache.js";
import { getGitStatus } from "@/services/insight.scanner.js";

export async function applyOverridesToState(
  collectionId: string,
  state: ReturnType<typeof getOrCreateState>
): Promise<void> {
  const overrides =
    await fileStatusOverrideRepository.listForCollection(collectionId);
  for (const ov of overrides) {
    const snap = state.files.get(ov.relativePath);
    if (!snap) continue;
    snap.overrides[ov.metric] = {
      status: ov.status,
      comment: ov.comment,
      source: ov.source as "human" | "agent",
      updatedAt: ov.createdAt.toISOString(),
    } satisfies MetricOverride;
  }
}

export async function seedCache(
  collectionId: string,
  directory: string
): Promise<void> {
  const records = await fileSnapshotRepository.getLatestPerFile(collectionId);
  if (records.length === 0) return;
  const [baselines, gitStatusMap] = await Promise.all([
    fileSnapshotRepository.getBaselineLineCounts(collectionId),
    getGitStatus(directory),
  ]);
  const state = getOrCreateState(collectionId);
  for (const r of records) {
    const baseline = baselines.get(r.relativePath);
    state.files.set(r.relativePath, {
      relativePath: r.relativePath,
      name: r.name,
      fileType: r.fileType,
      lineCount: r.lineCount,
      lineDelta: baseline !== undefined ? r.lineCount - baseline : null,
      updatedAt: r.scannedAt,
      coverage: r.coverage ?? null,
      lintErrors: null,
      gitStatus: gitStatusMap.get(r.relativePath) ?? "clean",
      metrics: r.metrics as Record<string, MetricResult | "pending" | null>,
      overrides: {},
    });
  }
  state.lastScan = records[0]?.scannedAt ?? null;
  await applyOverridesToState(collectionId, state);
}
