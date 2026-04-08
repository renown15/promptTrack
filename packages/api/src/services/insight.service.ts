import { collectionRepository } from "@/repositories/collection.repository.js";
import { fileSnapshotRepository } from "@/repositories/file-snapshot.repository.js";
import { fileStatusOverrideRepository } from "@/repositories/file-status-override.repository.js";
import { getPerFileMaps } from "@/services/discovery.per-file.js";
import {
  emitFileUpdated,
  runAnalysis,
  runAnalysisQueue,
} from "@/services/insight.analyzer.js";
import { cancelPendingForCollection } from "@/services/ollama.queue.js";
import {
  getOrCreateState,
  insightCache,
  serializeState,
  type FileSnapshot,
  type MetricError,
  type MetricOverride,
  type MetricResult,
} from "@/services/insight.cache.js";
import { insightEmitter } from "@/services/insight.emitter.js";
import { applyOverridesToState } from "@/services/insight.seed.js";
export { seedCache } from "@/services/insight.seed.js";
import {
  getGitStatus,
  readSnapshot,
  walkCode,
} from "@/services/insight.scanner.js";
import { ollamaService } from "@/services/ollama.service.js";
import { relative } from "path";

export const insightService = {
  async scan(collectionId: string, directory: string): Promise<void> {
    console.log(`[insight] scan start: ${directory}`);
    const state = getOrCreateState(collectionId);

    // Cancel any pending (not yet started) queue jobs for this collection
    const cancelled = cancelPendingForCollection(collectionId);
    if (cancelled > 0)
      console.log(
        `[insight] cancelled ${cancelled} pending jobs for ${collectionId}`
      );

    state.scanning = true;
    state.analysing = false;
    state.activeLlmCall = null;
    state.files.clear();

    const collection = await collectionRepository.findById(collectionId);
    const excludedDirs = collection?.in_scope_directories ?? [];

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
    const changedPaths: string[] = [];
    const [{ coveragePct, lintErrors: lintMap }, ollamaCfg] = await Promise.all(
      [getPerFileMaps(directory), ollamaService.getConfig()]
    );
    const enabledMetricNames = ollamaService
      .enabledMetrics(ollamaCfg.metrics)
      .map((m) => m.name);

    for await (const snap of walkCode(directory, directory, 0, excludedDirs)) {
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
        const hasMissing = enabledMetricNames.some((n) => !(n in metrics));
        if (hasErrors) {
          // full re-analysis — mark everything pending now so UI shows them all
          for (const name of enabledMetricNames) snap.metrics[name] = "pending";
          toAnalyze.push(snap);
        } else if (hasMissing) {
          // keep valid results, mark only missing metrics pending
          snap.metrics = { ...metrics };
          for (const name of enabledMetricNames)
            if (!(name in snap.metrics)) snap.metrics[name] = "pending";
          toAnalyze.push(snap);
        } else {
          snap.metrics = metrics;
        }
      } else {
        // new or changed file — clear overrides and mark everything pending
        changedPaths.push(snap.relativePath);
        for (const name of enabledMetricNames) snap.metrics[name] = "pending";
        toAnalyze.push(snap);
      }
      state.files.set(snap.relativePath, snap);
      snapshots.push(snap);
      emitFileUpdated(collectionId, snap);
    }

    state.lastScan = new Date();
    state.scanning = false;
    await fileStatusOverrideRepository.supersedeDueToFileChange(
      collectionId,
      changedPaths
    );
    await applyOverridesToState(collectionId, state);
    console.log(
      `[insight] scan complete: ${snapshots.length} files, ${toAnalyze.length} to analyse`
    );
    insightEmitter.emit(`scan_complete:${collectionId}`, {
      fileCount: snapshots.length,
      timestamp: state.lastScan.toISOString(),
    });
    if (toAnalyze.length > 0) {
      state.analysing = true;
      runAnalysisQueue(collectionId, directory, toAnalyze)
        .catch(() => {})
        .finally(() => {
          state.analysing = false;
          state.activeLlmCall = null;
          insightEmitter.emit(`analysis_complete:${collectionId}`, {
            timestamp: new Date().toISOString(),
          });
        });
    }
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
    // Check if file has changed since last scan — if so, clear overrides
    const existing = await fileSnapshotRepository.getLatestForFile(
      collectionId,
      snap.relativePath
    );
    const fileChanged = !existing || snap.updatedAt > existing.scannedAt;
    if (fileChanged) {
      await fileStatusOverrideRepository.supersedeDueToFileChange(
        collectionId,
        [snap.relativePath]
      );
    } else {
      const fileOverrides = await fileStatusOverrideRepository.listForFile(
        collectionId,
        snap.relativePath
      );
      for (const ov of fileOverrides) {
        snap.overrides[ov.metric] = {
          status: ov.status,
          comment: ov.comment,
          source: ov.source as "human" | "agent",
          updatedAt: ov.createdAt.toISOString(),
        } satisfies MetricOverride;
      }
    }
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
