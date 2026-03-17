import { relative } from "path";
import {
  getOrCreateState,
  serializeState,
  insightCache,
  type FileSnapshot,
  type MetricResult,
  type MetricError,
} from "@/services/insight.cache.js";
import { insightEmitter } from "@/services/insight.emitter.js";
import { fileSnapshotRepository } from "@/repositories/file-snapshot.repository.js";
import {
  readSnapshot,
  walkCode,
  getGitStatus,
} from "@/services/insight.scanner.js";
import {
  emitFileUpdated,
  runAnalysis,
  runAnalysisQueue,
} from "@/services/insight.analyzer.js";
import { getPerFileMaps } from "@/services/discovery.per-file.js";

export const insightService = {
  async scan(collectionId: string, directory: string): Promise<void> {
    console.log(`[insight] scan start: ${directory}`);
    const state = getOrCreateState(collectionId);
    state.scanning = true;
    state.files.clear();

    const existingRecords =
      await fileSnapshotRepository.getLatestPerFile(collectionId);
    const existingMap = new Map(
      existingRecords.map((r) => [r.relativePath, r])
    );
    const baselines =
      await fileSnapshotRepository.getBaselineLineCounts(collectionId);
    const gitStatusMap = await getGitStatus(directory);

    const snapshots: FileSnapshot[] = [];
    const toAnalyze: FileSnapshot[] = [];
    const { coveragePct, lintErrors: lintMap } =
      await getPerFileMaps(directory);

    for await (const snap of walkCode(directory, directory, 0)) {
      const baseline = baselines.get(snap.relativePath);
      snap.lineDelta =
        baseline !== undefined ? snap.lineCount - baseline : null;
      snap.gitStatus = gitStatusMap.get(snap.relativePath) ?? "clean";
      snap.coverage = coveragePct.get(snap.relativePath) ?? null;
      snap.lintErrors = lintMap.get(snap.relativePath) ?? 0;

      const existing = existingMap.get(snap.relativePath);
      if (existing && snap.updatedAt <= existing.scannedAt) {
        const metrics = existing.metrics as Record<
          string,
          MetricResult | MetricError | null
        >;
        const hasErrors = Object.values(metrics).some(
          (v) =>
            v === null || (typeof v === "object" && v !== null && "error" in v)
        );
        if (hasErrors) {
          toAnalyze.push(snap);
        } else {
          snap.metrics = metrics;
        }
      } else {
        toAnalyze.push(snap);
      }
      state.files.set(snap.relativePath, snap);
      snapshots.push(snap);
      emitFileUpdated(collectionId, snap);
    }

    state.lastScan = new Date();
    state.scanning = false;
    console.log(
      `[insight] scan complete: ${snapshots.length} files, ${toAnalyze.length} to analyse`
    );
    insightEmitter.emit(`scan_complete:${collectionId}`, {
      fileCount: snapshots.length,
      timestamp: state.lastScan.toISOString(),
    });
    runAnalysisQueue(collectionId, directory, toAnalyze).catch(() => {});
  },

  async updateFile(
    collectionId: string,
    directory: string,
    absolutePath: string
  ): Promise<void> {
    const state = getOrCreateState(collectionId);
    const snap = await readSnapshot(absolutePath, directory);
    if (!snap) return;
    const [baseline, gitStatusMap] = await Promise.all([
      fileSnapshotRepository.getBaselineLineCount(
        collectionId,
        snap.relativePath
      ),
      getGitStatus(directory),
    ]);
    snap.lineDelta = baseline !== null ? snap.lineCount - baseline : null;
    snap.gitStatus = gitStatusMap.get(snap.relativePath) ?? "clean";
    state.files.set(snap.relativePath, snap);
    emitFileUpdated(collectionId, snap);
    runAnalysis(collectionId, directory, snap).catch(() => {});
  },

  removeFile(
    collectionId: string,
    directory: string,
    absolutePath: string
  ): void {
    const state = insightCache.get(collectionId);
    if (!state) return;
    const rel = relative(directory, absolutePath);
    state.files.delete(rel);
    insightEmitter.emit(`file_removed:${collectionId}`, { relativePath: rel });
  },

  getState(collectionId: string) {
    const state = insightCache.get(collectionId);
    if (!state) return { files: [], lastScan: null, scanning: false };
    const serialized = serializeState(state);
    return {
      ...serialized,
      files: serialized.files.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    };
  },
};

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
    });
  }
  state.lastScan = records[0]?.scannedAt ?? null;
}
