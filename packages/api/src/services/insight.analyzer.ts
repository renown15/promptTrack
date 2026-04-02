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

function isIgnoredByPatterns(ref: string, patterns: string[]): boolean {
  const filename = ref.includes("/") ? (ref.split("/").pop() ?? ref) : ref;
  for (const raw of patterns) {
    const p = raw.trim();
    if (!p || p.startsWith("#")) continue;
    const stripped = p.replace(/^\//, "").replace(/\/$/, "");
    if (stripped === ref || stripped === filename) return true;
    if (stripped.includes("*")) {
      const regex = new RegExp(
        "^" +
          stripped.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") +
          "$"
      );
      if (regex.test(ref) || regex.test(filename)) return true;
    }
    if (ref.startsWith(stripped + "/")) return true;
  }
  return false;
}

async function recomputeGitignoreWarnings(
  collectionId: string,
  directory: string
): Promise<void> {
  const state = getOrCreateState(collectionId);

  // Collect all sensitiveRefs across all security metric results in state
  const allRefs = new Set<string>();
  for (const snap of state.files.values()) {
    const sec = snap.metrics["security"];
    if (
      sec &&
      typeof sec === "object" &&
      "status" in sec &&
      Array.isArray((sec as MetricResult).sensitiveRefs)
    ) {
      for (const r of (sec as MetricResult).sensitiveRefs!) allRefs.add(r);
    }
  }

  // Read .gitignore patterns
  let patterns: string[] = [];
  try {
    const raw = await readFile(join(directory, ".gitignore"), "utf-8");
    patterns = raw.split("\n");
  } catch {
    // No .gitignore — every ref is a warning
  }

  const warnings = Array.from(allRefs).filter(
    (ref) => !isIgnoredByPatterns(ref, patterns)
  );

  state.gitignoreWarnings = warnings;
  insightEmitter.emit(`gitignore_updated:${collectionId}`, { warnings });
}

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
  if (enabledMetrics.length === 0) return;

  // Only run metrics that are pending or errored — skip valid cached results
  const metricsToRun = enabledMetrics.filter((m) => {
    const v = snap.metrics[m.name];
    return !v || v === "pending" || (typeof v === "object" && "error" in v);
  });
  if (metricsToRun.length === 0) return;

  console.log(
    `[insight] runAnalysis ${snap.relativePath} — ${metricsToRun.length}/${enabledMetrics.length} metrics, model=${cfg.model}`
  );

  const state = getOrCreateState(collectionId);

  let content: string;
  try {
    content = await readFile(join(directory, snap.relativePath), "utf-8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const current = state.files.get(snap.relativePath);
    if (current)
      for (const m of metricsToRun)
        current.metrics[m.name] = { error: `unreadable: ${msg}` };
    return;
  }

  for (const metric of metricsToRun) {
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
      if (metric.name === "security" && !("error" in result)) {
        recomputeGitignoreWarnings(collectionId, directory).catch(() => {});
      }
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
