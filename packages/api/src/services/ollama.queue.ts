/**
 * Global single-concurrency queue for Ollama calls.
 *
 * All analyzeMetric calls from all collections are serialised through here,
 * so only one LLM request is in-flight at a time regardless of how many
 * collections are scanning simultaneously.
 *
 * Each enqueued job carries a collectionId so callers can cancel all
 * pending jobs for a given collection (e.g. on re-scan).
 */

type Job = {
  collectionId: string;
  run: () => Promise<void>;
  resolve: () => void;
  reject: (err: unknown) => void;
};

const queue: Job[] = [];
let running = false;
let llmEnabled = true;

function clearAllPending(): void {
  const pending = queue.splice(0);
  pending.forEach((j) => j.resolve());
}

async function drain(): Promise<void> {
  if (running) return;
  running = true;
  while (queue.length > 0) {
    const job = queue.shift()!;
    try {
      await job.run();
      job.resolve();
    } catch (err) {
      job.reject(err);
    }
  }
  running = false;
}

export function setLlmEnabled(enabled: boolean): void {
  llmEnabled = enabled;
  if (!enabled) clearAllPending();
}

export function isLlmEnabled(): boolean {
  return llmEnabled;
}

export function enqueueOllamaCall(
  collectionId: string,
  run: () => Promise<void>
): Promise<void> {
  if (!llmEnabled) return Promise.resolve();
  return new Promise((resolve, reject) => {
    queue.push({ collectionId, run, resolve, reject });
    void drain();
  });
}

/**
 * Remove all pending (not yet started) jobs for a collection.
 * In-flight jobs cannot be cancelled here — the AbortSignal timeout handles that.
 */
export function cancelPendingForCollection(collectionId: string): number {
  const before = queue.length;
  const cancelled = queue.filter((j) => j.collectionId === collectionId);
  cancelled.forEach((j) => j.resolve()); // resolve cleanly so callers don't hang
  queue.splice(
    0,
    queue.length,
    ...queue.filter((j) => j.collectionId !== collectionId)
  );
  return before - queue.length;
}

export function queueDepth(): number {
  return queue.length;
}

export function isOllamaRunning(): boolean {
  return running;
}
