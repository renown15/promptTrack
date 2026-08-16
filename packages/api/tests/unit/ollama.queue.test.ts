import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueueOllamaCall,
  cancelPendingForCollection,
  queueDepth,
  isOllamaRunning,
} from "@/services/ollama.queue.js";

// The queue module is stateful — we need to drain it between tests.
// We do this by waiting for all enqueued promises to settle.

describe("ollama.queue", () => {
  beforeEach(async () => {
    // Drain any leftover state from previous tests
    cancelPendingForCollection("__cleanup__");
    await new Promise((r) => setTimeout(r, 0));
  });

  it("runs a single job", async () => {
    let ran = false;
    await enqueueOllamaCall("col1", async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  it("runs jobs sequentially, not concurrently", async () => {
    const order: number[] = [];
    const p1 = enqueueOllamaCall("col1", async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(1);
    });
    const p2 = enqueueOllamaCall("col1", async () => {
      order.push(2);
    });
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });

  it("serialises jobs across different collections", async () => {
    const order: string[] = [];
    const p1 = enqueueOllamaCall("colA", async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push("A");
    });
    const p2 = enqueueOllamaCall("colB", async () => {
      order.push("B");
    });
    await Promise.all([p1, p2]);
    expect(order).toEqual(["A", "B"]);
  });

  it("cancelPendingForCollection removes pending jobs for that collection", async () => {
    let ranA = false;
    let ranB = false;
    // Enqueue a slow job to block the queue
    const blocker = enqueueOllamaCall("blocker", async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    // Enqueue jobs that will sit pending
    const pA = enqueueOllamaCall("colA", async () => {
      ranA = true;
    });
    const pB = enqueueOllamaCall("colB", async () => {
      ranB = true;
    });

    const cancelled = cancelPendingForCollection("colA");
    expect(cancelled).toBe(1);

    await Promise.all([blocker, pA, pB]);
    expect(ranA).toBe(false); // cancelled
    expect(ranB).toBe(true); // not cancelled
  });

  it("queueDepth reflects pending jobs", async () => {
    // Block the queue
    const blocker = enqueueOllamaCall("blocker", async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    enqueueOllamaCall("col1", async () => {}).catch(() => {});
    enqueueOllamaCall("col2", async () => {}).catch(() => {});

    expect(queueDepth()).toBe(2);
    cancelPendingForCollection("col1");
    cancelPendingForCollection("col2");
    await blocker;
  });

  it("isOllamaRunning is true while a job is executing", async () => {
    let sawRunning = false;
    await enqueueOllamaCall("col1", async () => {
      sawRunning = isOllamaRunning();
    });
    expect(sawRunning).toBe(true);
    expect(isOllamaRunning()).toBe(false);
  });
});
