import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock all heavy dependencies so the service module loads cleanly
vi.mock("@/repositories/file-snapshot.repository.js", () => ({
  fileSnapshotRepository: {
    getLatestPerFile: vi.fn(),
    getBaselineLineCounts: vi.fn(),
    getBaselineLineCount: vi.fn(),
    upsert: vi.fn(),
  },
}));
vi.mock("@/services/insight.scanner.js", () => ({
  readSnapshot: vi.fn(),
  walkCode: vi.fn(),
  getGitStatus: vi.fn(),
}));
vi.mock("@/services/insight.analyzer.js", () => ({
  emitFileUpdated: vi.fn(),
  runAnalysis: vi.fn(),
  runAnalysisQueue: vi.fn(),
}));
vi.mock("@/services/discovery.per-file.js", () => ({
  getPerFileMaps: vi.fn(),
}));
vi.mock("@/services/ollama.service.js", () => ({
  ollamaService: {
    getConfig: vi.fn(),
    enabledMetrics: vi.fn(() => []),
  },
}));
vi.mock("@/services/insight.emitter.js", () => ({
  insightEmitter: { emit: vi.fn() },
}));

import { insightService } from "@/services/insight.service.js";
import { insightCache, getOrCreateState } from "@/services/insight.cache.js";
import { insightEmitter } from "@/services/insight.emitter.js";

function makeSnap(relativePath: string) {
  return {
    relativePath,
    name: relativePath,
    fileType: "ts",
    lineCount: 10,
    lineDelta: null,
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    coverage: null,
    lintErrors: null,
    gitStatus: "clean" as const,
    metrics: {},
  };
}

describe("insightService.getState", () => {
  beforeEach(() => insightCache.clear());

  it("returns empty state when collection has no cache entry", () => {
    const result = insightService.getState("col1");
    expect(result.files).toEqual([]);
    expect(result.lastScan).toBeNull();
    expect(result.scanning).toBe(false);
  });

  it("returns files sorted by updatedAt descending", () => {
    const state = getOrCreateState("col1");
    state.files.set("old.ts", {
      ...makeSnap("old.ts"),
      updatedAt: new Date("2024-01-01"),
    });
    state.files.set("new.ts", {
      ...makeSnap("new.ts"),
      updatedAt: new Date("2024-06-01"),
    });

    const result = insightService.getState("col1");
    expect(result.files[0].relativePath).toBe("new.ts");
    expect(result.files[1].relativePath).toBe("old.ts");
  });

  it("returns lastScan as ISO string when set", () => {
    const state = getOrCreateState("col1");
    state.lastScan = new Date("2024-03-15T12:00:00Z");

    const result = insightService.getState("col1");
    expect(result.lastScan).toBe("2024-03-15T12:00:00.000Z");
  });

  it("returns scanning flag", () => {
    const state = getOrCreateState("col1");
    state.scanning = true;

    const result = insightService.getState("col1");
    expect(result.scanning).toBe(true);
  });
});

describe("insightService.removeFile", () => {
  beforeEach(() => {
    insightCache.clear();
    vi.mocked(insightEmitter.emit).mockReset();
  });

  it("does nothing when collection is not in cache", () => {
    insightService.removeFile("col-missing", "/project", "/project/src/a.ts");
    expect(insightEmitter.emit).not.toHaveBeenCalled();
  });

  it("removes the file from cache and emits file_removed", () => {
    const state = getOrCreateState("col1");
    state.files.set("src/a.ts", makeSnap("src/a.ts"));

    insightService.removeFile("col1", "/project", "/project/src/a.ts");

    expect(state.files.has("src/a.ts")).toBe(false);
    expect(insightEmitter.emit).toHaveBeenCalledWith("file_removed:col1", {
      relativePath: "src/a.ts",
    });
  });

  it("emits with correct relative path", () => {
    const state = getOrCreateState("col2");
    state.files.set("lib/utils.ts", makeSnap("lib/utils.ts"));

    insightService.removeFile("col2", "/repo", "/repo/lib/utils.ts");

    expect(insightEmitter.emit).toHaveBeenCalledWith("file_removed:col2", {
      relativePath: "lib/utils.ts",
    });
  });
});
