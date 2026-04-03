import { describe, it, expect, beforeEach } from "vitest";
import {
  insightCache,
  getOrCreateState,
  serializeState,
} from "@/services/insight.cache.js";

describe("insightCache", () => {
  beforeEach(() => {
    insightCache.clear();
  });

  describe("getOrCreateState", () => {
    it("creates a new state when none exists", () => {
      const state = getOrCreateState("col1");
      expect(state.files).toBeInstanceOf(Map);
      expect(state.files.size).toBe(0);
      expect(state.lastScan).toBeNull();
      expect(state.scanning).toBe(false);
      expect(state.activeLlmCall).toBeNull();
    });

    it("returns the same state on subsequent calls", () => {
      const a = getOrCreateState("col1");
      const b = getOrCreateState("col1");
      expect(a).toBe(b);
    });

    it("creates separate states per collectionId", () => {
      const a = getOrCreateState("col1");
      const b = getOrCreateState("col2");
      expect(a).not.toBe(b);
    });

    it("stores the state in insightCache", () => {
      getOrCreateState("col1");
      expect(insightCache.has("col1")).toBe(true);
    });
  });

  describe("serializeState", () => {
    it("returns empty files array when no files", () => {
      const state = getOrCreateState("col1");
      const result = serializeState(state);
      expect(result.files).toEqual([]);
      expect(result.lastScan).toBeNull();
      expect(result.scanning).toBe(false);
      expect(result.activeLlmCall).toBeNull();
    });

    it("serializes activeLlmCall when set", () => {
      const state = getOrCreateState("col1");
      state.activeLlmCall = {
        file: "src/foo.ts",
        metric: "security",
        model: "qwen2.5-coder:7b",
        startedAt: "2024-01-01T00:00:00.000Z",
      };
      const result = serializeState(state);
      expect(result.activeLlmCall).toEqual(state.activeLlmCall);
    });

    it("serializes files to array sorted with updatedAt as ISO string", () => {
      const state = getOrCreateState("col1");
      const date = new Date("2024-01-15T10:00:00Z");
      state.files.set("a.ts", {
        relativePath: "a.ts",
        name: "a.ts",
        fileType: "ts",
        lineCount: 42,
        lineDelta: null,
        updatedAt: date,
        coverage: null,
        lintErrors: null,
        gitStatus: "clean",
        metrics: {},
      });

      const result = serializeState(state);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].updatedAt).toBe("2024-01-15T10:00:00.000Z");
      expect(result.files[0].relativePath).toBe("a.ts");
      expect(result.files[0].lineCount).toBe(42);
    });

    it("serializes lastScan as ISO string when set", () => {
      const state = getOrCreateState("col1");
      state.lastScan = new Date("2024-06-01T00:00:00Z");
      const result = serializeState(state);
      expect(result.lastScan).toBe("2024-06-01T00:00:00.000Z");
    });

    it("serializes scanning flag", () => {
      const state = getOrCreateState("col1");
      state.scanning = true;
      const result = serializeState(state);
      expect(result.scanning).toBe(true);
    });

    it("serializes multiple files", () => {
      const state = getOrCreateState("col1");
      const snap = (path: string, date: Date) => ({
        relativePath: path,
        name: path,
        fileType: "ts",
        lineCount: 10,
        lineDelta: null,
        updatedAt: date,
        coverage: null,
        lintErrors: null,
        gitStatus: "clean" as const,
        metrics: {},
      });
      state.files.set("a.ts", snap("a.ts", new Date("2024-01-01")));
      state.files.set("b.ts", snap("b.ts", new Date("2024-01-02")));
      const result = serializeState(state);
      expect(result.files).toHaveLength(2);
    });
  });
});
