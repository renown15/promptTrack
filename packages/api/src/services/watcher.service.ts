import chokidar, { type FSWatcher } from "chokidar";
import { extname } from "path";
import { insightService } from "@/services/insight.service.js";

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

const IGNORE_DIRS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.next/**",
];

interface WatchedCollection {
  watcher: FSWatcher;
  directory: string;
  debounceTimers: Map<string, ReturnType<typeof setTimeout>>;
}

const registry = new Map<string, WatchedCollection>();

function debounce(
  timers: Map<string, ReturnType<typeof setTimeout>>,
  key: string,
  fn: () => void,
  ms: number
) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      fn();
    }, ms)
  );
}

export const watcherService = {
  start(collectionId: string, directory: string) {
    if (registry.has(collectionId)) return;

    const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const watcher = chokidar.watch(directory, {
      ignored: IGNORE_DIRS,
      ignoreInitial: true,
      persistent: true,
      depth: 20,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });

    watcher.on("error", (err) => {
      console.error(`[watcher] error for collection ${collectionId}:`, err);
    });

    watcher.on("change", (filePath) => {
      if (!CODE_EXTENSIONS.has(extname(filePath).toLowerCase())) return;
      debounce(
        debounceTimers,
        filePath,
        () => {
          insightService
            .updateFile(collectionId, directory, filePath)
            .catch(() => {});
        },
        1500
      );
    });

    watcher.on("add", (filePath) => {
      if (!CODE_EXTENSIONS.has(extname(filePath).toLowerCase())) return;
      debounce(
        debounceTimers,
        filePath,
        () => {
          insightService
            .updateFile(collectionId, directory, filePath)
            .catch(() => {});
        },
        1500
      );
    });

    watcher.on("unlink", (filePath) => {
      insightService.removeFile(collectionId, directory, filePath);
    });

    registry.set(collectionId, { watcher, directory, debounceTimers });
  },

  stop(collectionId: string) {
    const entry = registry.get(collectionId);
    if (!entry) return;
    entry.watcher.close().catch(() => {});
    registry.delete(collectionId);
  },

  stopAll() {
    for (const id of registry.keys()) this.stop(id);
  },
};
