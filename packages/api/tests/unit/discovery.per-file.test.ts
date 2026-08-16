import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock("@/services/discovery.service.js", () => ({
  discoveryService: {
    findCoverageReport: vi.fn(),
    findLintReport: vi.fn(),
  },
}));

import { readFile, readdir } from "fs/promises";
import { discoveryService } from "@/services/discovery.service.js";
import { getPerFileMaps } from "@/services/discovery.per-file.js";
import type { Dirent } from "fs";

const mockReadFile = vi.mocked(readFile);
const mockReaddir = vi.mocked(readdir);
const mockFindCoverage = vi.mocked(discoveryService.findCoverageReport);
const mockFindLint = vi.mocked(discoveryService.findLintReport);

function makeDirent(name: string, isDir: boolean): Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    path: "",
    parentPath: "",
  } as unknown as Dirent;
}

describe("getPerFileMaps", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns empty maps when no reports are found", async () => {
    mockReaddir.mockResolvedValue([] as never);
    mockFindCoverage.mockResolvedValue(null);
    mockFindLint.mockResolvedValue(null);

    const result = await getPerFileMaps("/project");
    expect(result.coveragePct.size).toBe(0);
    expect(result.lintErrors.size).toBe(0);
  });

  it("populates coveragePct from coverage-summary.json", async () => {
    mockReaddir.mockResolvedValue([] as never);
    mockFindCoverage.mockResolvedValueOnce(
      "/project/coverage/coverage-summary.json"
    );
    mockFindLint.mockResolvedValue(null);

    const summary = JSON.stringify({
      total: { lines: { pct: 80 } },
      "/project/src/foo.ts": { lines: { pct: 95 } },
      "/project/src/bar.ts": { lines: { pct: 40 } },
    });
    mockReadFile.mockResolvedValueOnce(summary as never);

    const result = await getPerFileMaps("/project");
    expect(result.coveragePct.get("src/foo.ts")).toBe(95);
    expect(result.coveragePct.get("src/bar.ts")).toBe(40);
    expect(result.coveragePct.has("total")).toBe(false);
  });

  it("rounds coverage percentages", async () => {
    mockReaddir.mockResolvedValue([] as never);
    mockFindCoverage.mockResolvedValueOnce(
      "/project/coverage/coverage-summary.json"
    );
    mockFindLint.mockResolvedValue(null);

    const summary = JSON.stringify({
      "/project/src/foo.ts": { lines: { pct: 66.666 } },
    });
    mockReadFile.mockResolvedValueOnce(summary as never);

    const result = await getPerFileMaps("/project");
    expect(result.coveragePct.get("src/foo.ts")).toBe(67);
  });

  it("populates lintErrors from ESLint report", async () => {
    mockReaddir.mockResolvedValue([] as never);
    mockFindCoverage.mockResolvedValue(null);
    mockFindLint.mockResolvedValueOnce("/project/.eslint-report.json");

    const report = JSON.stringify([
      { filePath: "/project/src/foo.ts", errorCount: 3 },
      { filePath: "/project/src/bar.ts", errorCount: 0 },
    ]);
    mockReadFile.mockResolvedValueOnce(report as never);

    const result = await getPerFileMaps("/project");
    expect(result.lintErrors.get("src/foo.ts")).toBe(3);
    expect(result.lintErrors.get("src/bar.ts")).toBe(0);
  });

  it("skips files outside the root directory", async () => {
    mockReaddir.mockResolvedValue([] as never);
    mockFindCoverage.mockResolvedValueOnce(
      "/project/coverage/coverage-summary.json"
    );
    mockFindLint.mockResolvedValue(null);

    const summary = JSON.stringify({
      "/other-project/src/foo.ts": { lines: { pct: 50 } },
      "/project/src/bar.ts": { lines: { pct: 80 } },
    });
    mockReadFile.mockResolvedValueOnce(summary as never);

    const result = await getPerFileMaps("/project");
    expect(result.coveragePct.has("../other-project/src/foo.ts")).toBe(false);
    expect(result.coveragePct.get("src/bar.ts")).toBe(80);
  });

  it("deduplicates the same coverage report found in multiple dirs", async () => {
    mockReaddir
      .mockResolvedValueOnce([makeDirent("packages", true)] as never)
      .mockResolvedValueOnce([] as never);

    const reportPath = "/project/coverage/coverage-summary.json";
    mockFindCoverage.mockResolvedValue(reportPath); // same path returned for all dirs
    mockFindLint.mockResolvedValue(null);

    const summary = JSON.stringify({
      "/project/src/foo.ts": { lines: { pct: 75 } },
    });
    mockReadFile.mockResolvedValueOnce(summary as never);

    const result = await getPerFileMaps("/project");
    expect(result.coveragePct.get("src/foo.ts")).toBe(75);
    // readFile called only once despite multiple dirs returning same path
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("handles unreadable coverage report gracefully", async () => {
    mockReaddir.mockResolvedValue([] as never);
    mockFindCoverage.mockResolvedValueOnce(
      "/project/coverage/coverage-summary.json"
    );
    mockFindLint.mockResolvedValue(null);
    mockReadFile.mockRejectedValueOnce(new Error("permission denied"));

    const result = await getPerFileMaps("/project");
    expect(result.coveragePct.size).toBe(0);
  });

  it("scans subdirectories up to depth 2", async () => {
    mockReaddir
      .mockResolvedValueOnce([makeDirent("packages", true)] as never)
      .mockResolvedValueOnce([makeDirent("api", true)] as never);

    mockFindCoverage.mockResolvedValue(null);
    mockFindLint.mockResolvedValue(null);

    await getPerFileMaps("/project");

    // root + packages + packages/api = 3 dirs checked
    expect(mockFindCoverage).toHaveBeenCalledTimes(3);
  });
});
