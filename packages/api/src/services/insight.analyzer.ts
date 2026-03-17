import { readFile } from "fs/promises";
import { join } from "path";
import {
  getOrCreateState,
  type FileSnapshot,
  type MetricResult,
  type MetricError,
} from "@/services/insight.cache.js";
import { insightEmitter } from "@/services/insight.emitter.js";
import { ollamaService } from "@/services/ollama.service.js";
import { fileSnapshotRepository } from "@/repositories/file-snapshot.repository.js";

export function emitFileUpdated(collectionId: string, snap: FileSnapshot) {
  insightEmitter.emit(`file_updated:${collectionId}`, {
    ...snap,
    updatedAt: snap.updatedAt.toISOString(),
  });
}

export async function runAnalysis(
  collectionId: string,
  directory: string,
  snap: FileSnapshot
): Promise<void> {
  let cfg;
  try {
    cfg = await ollamaService.getConfig();
  } catch (err) {
    console.error(`[insight] getConfig failed for ${snap.relativePath}:`, err);
    return;
  }
  const enabledMetrics = ollamaService.enabledMetrics(cfg.metrics);
  console.log(
    `[insight] runAnalysis ${snap.relativePath} — ${enabledMetrics.length} metrics, model=${cfg.model}`
  );
  if (enabledMetrics.length === 0) return;

  const state = getOrCreateState(collectionId);
  for (const m of enabledMetrics) snap.metrics[m.name] = "pending";
  emitFileUpdated(collectionId, snap);

  let content: string;
  try {
    content = await readFile(join(directory, snap.relativePath), "utf-8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const current = state.files.get(snap.relativePath);
    if (current)
      for (const m of enabledMetrics)
        current.metrics[m.name] = { error: `unreadable: ${msg}` };
    return;
  }

  for (const metric of enabledMetrics) {
    const result = await ollamaService.analyzeMetric({
      endpoint: cfg.endpoint,
      model: cfg.model,
      metric,
      relativePath: snap.relativePath,
      lineCount: snap.lineCount,
      fileType: snap.fileType,
      content,
    });
    const current = state.files.get(snap.relativePath);
    if (current) {
      current.metrics[metric.name] = result;
      emitFileUpdated(collectionId, current);
    }
  }

  const current = state.files.get(snap.relativePath);
  if (current) {
    const hasErrors = Object.values(current.metrics).some(
      (v) => v === null || (typeof v === "object" && v !== null && "error" in v)
    );
    if (!hasErrors) {
      fileSnapshotRepository
        .insert({
          collectionId,
          relativePath: current.relativePath,
          name: current.name,
          fileType: current.fileType,
          lineCount: current.lineCount,
          coverage: current.coverage,
          metrics: current.metrics as Record<string, MetricResult | null>,
        })
        .catch(() => {});
    }
  }
}

export async function runAnalysisQueue(
  collectionId: string,
  directory: string,
  snapshots: FileSnapshot[]
): Promise<void> {
  for (const snap of snapshots) {
    await runAnalysis(collectionId, directory, snap).catch(() => {});
  }
}

export type { MetricError };
