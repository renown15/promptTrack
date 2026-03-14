import { readdir, stat, readFile } from "fs/promises";
import { join, relative, extname, basename } from "path";
import {
  getOrCreateState,
  serializeState,
  insightCache,
  type FileSnapshot,
  type MetricResult,
} from "@/services/insight.cache.js";
import { insightEmitter } from "@/services/insight.emitter.js";
import { ollamaService } from "@/services/ollama.service.js";
import { fileSnapshotRepository } from "@/repositories/file-snapshot.repository.js";

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".css",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  "__pycache__",
  ".cache",
  "vendor",
]);

function fileTypeFromExt(ext: string): string {
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

async function readSnapshot(
  abs: string,
  root: string
): Promise<FileSnapshot | null> {
  try {
    const ext = extname(abs).toLowerCase();
    const [info, content] = await Promise.all([
      stat(abs),
      readFile(abs, "utf-8"),
    ]);
    return {
      relativePath: relative(root, abs),
      name: basename(abs),
      fileType: fileTypeFromExt(ext),
      lineCount: content.split("\n").length,
      updatedAt: info.mtime,
      coverage: null,
      metrics: {},
    };
  } catch {
    return null;
  }
}

async function* walkCode(
  dir: string,
  root: string,
  depth: number
): AsyncGenerator<FileSnapshot> {
  if (depth > 6) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const dirs: string[] = [];
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) dirs.push(join(dir, entry.name));
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (CODE_EXTENSIONS.has(ext)) files.push(join(dir, entry.name));
    }
  }

  // Yield files in this directory first (batched for fd safety)
  const CONCURRENCY = 20;
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const snaps = await Promise.all(batch.map((f) => readSnapshot(f, root)));
    for (const s of snaps) if (s) yield s;
  }

  // Then recurse into subdirectories
  for (const d of dirs) {
    yield* walkCode(d, root, depth + 1);
  }
}

function emitFileUpdated(collectionId: string, snap: FileSnapshot) {
  insightEmitter.emit(`file_updated:${collectionId}`, {
    ...snap,
    updatedAt: snap.updatedAt.toISOString(),
  });
}

async function runAnalysis(
  collectionId: string,
  directory: string,
  snap: FileSnapshot
): Promise<void> {
  const cfg = await ollamaService.getConfig();
  const enabledMetrics = ollamaService.enabledMetrics(cfg.metrics);
  if (enabledMetrics.length === 0) return;

  const state = getOrCreateState(collectionId);
  for (const m of enabledMetrics) snap.metrics[m.name] = "pending";
  emitFileUpdated(collectionId, snap);

  let content: string;
  try {
    content = await readFile(join(directory, snap.relativePath), "utf-8");
  } catch {
    return;
  }

  const results = await ollamaService.analyzeFile({
    endpoint: cfg.endpoint,
    model: cfg.model,
    metricsConfig: cfg.metrics,
    relativePath: snap.relativePath,
    lineCount: snap.lineCount,
    fileType: snap.fileType,
    content,
  });

  const current = state.files.get(snap.relativePath);
  if (current) {
    Object.assign(current.metrics, results);
    emitFileUpdated(collectionId, current);
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

async function runAnalysisQueue(
  collectionId: string,
  directory: string,
  snapshots: FileSnapshot[]
): Promise<void> {
  for (const snap of snapshots) {
    await runAnalysis(collectionId, directory, snap).catch(() => {});
  }
}

export const insightService = {
  async scan(collectionId: string, directory: string): Promise<void> {
    console.log(`[insight] scan start: ${directory}`);
    const state = getOrCreateState(collectionId);
    state.scanning = true;
    state.files.clear();
    const snapshots: FileSnapshot[] = [];
    for await (const snap of walkCode(directory, directory, 0)) {
      state.files.set(snap.relativePath, snap);
      snapshots.push(snap);
      emitFileUpdated(collectionId, snap);
    }
    state.lastScan = new Date();
    state.scanning = false;
    console.log(`[insight] scan complete: ${snapshots.length} files found`);
    insightEmitter.emit(`scan_complete:${collectionId}`, {
      fileCount: snapshots.length,
      timestamp: state.lastScan.toISOString(),
    });
    runAnalysisQueue(collectionId, directory, snapshots).catch(() => {});
  },

  async updateFile(
    collectionId: string,
    directory: string,
    absolutePath: string
  ): Promise<void> {
    const state = getOrCreateState(collectionId);
    const snap = await readSnapshot(absolutePath, directory);
    if (!snap) return;
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

export async function seedCache(collectionId: string): Promise<void> {
  const records = await fileSnapshotRepository.getLatestPerFile(collectionId);
  if (records.length === 0) return;
  const state = getOrCreateState(collectionId);
  for (const r of records) {
    state.files.set(r.relativePath, {
      relativePath: r.relativePath,
      name: r.name,
      fileType: r.fileType,
      lineCount: r.lineCount,
      updatedAt: r.scannedAt,
      coverage: r.coverage ?? null,
      metrics: r.metrics as Record<string, MetricResult | "pending" | null>,
    });
  }
  state.lastScan = records[0]?.scannedAt ?? null;
}
