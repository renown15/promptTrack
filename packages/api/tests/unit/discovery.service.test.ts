import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

import { readFile, readdir, stat } from "fs/promises";
import { discoveryService } from "@/services/discovery.service.js";
import type { Dirent, Stats } from "fs";

const mockReadFile = vi.mocked(readFile);
const mockReaddir = vi.mocked(readdir);
const mockStat = vi.mocked(stat);

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

function makeStats(mtime: Date): Stats {
  return { mtime } as unknown as Stats;
}

describe("discoveryService.findCoverageReport", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns null when no package.json and no conventional paths exist", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockStat.mockRejectedValue(new Error("ENOENT"));
    const result = await discoveryService.findCoverageReport("/project");
    expect(result).toBeNull();
  });

  it("finds coverage-summary.json at conventional path", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT")); // no package.json
    mockStat
      .mockRejectedValueOnce(new Error("ENOENT")) // coverage/coverage-summary.json missing
      .mockResolvedValueOnce(makeStats(new Date())); // .coverage/coverage-summary.json exists

    const result = await discoveryService.findCoverageReport("/project");
    expect(result).toBe("/project/.coverage/coverage-summary.json");
  });

  it("finds coverage-summary.json in jest coverageDirectory from package.json", async () => {
    const pkg = JSON.stringify({ jest: { coverageDirectory: "my-coverage" } });
    mockReadFile.mockResolvedValueOnce(pkg as never);
    mockStat.mockResolvedValueOnce(makeStats(new Date()));

    const result = await discoveryService.findCoverageReport("/project");
    expect(result).toBe("/project/my-coverage/coverage-summary.json");
  });

  it("finds coverage via script --coverage.reportsDirectory", async () => {
    const pkg = JSON.stringify({
      scripts: {
        test: "vitest --coverage.reportsDirectory=custom-cov",
      },
    });
    mockReadFile.mockResolvedValueOnce(pkg as never);
    mockStat.mockResolvedValueOnce(makeStats(new Date()));

    const result = await discoveryService.findCoverageReport("/project");
    expect(result).toBe("/project/custom-cov/coverage-summary.json");
  });

  it("finds coverage via script --coverageDirectory", async () => {
    const pkg = JSON.stringify({
      scripts: { test: "jest --coverageDirectory=jcov" },
    });
    mockReadFile.mockResolvedValueOnce(pkg as never);
    mockStat.mockResolvedValueOnce(makeStats(new Date()));

    const result = await discoveryService.findCoverageReport("/project");
    expect(result).toBe("/project/jcov/coverage-summary.json");
  });
});

describe("discoveryService.findLintReport", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns null when no reports exist", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockStat.mockRejectedValue(new Error("ENOENT"));
    const result = await discoveryService.findLintReport("/project");
    expect(result).toBeNull();
  });

  it("finds .eslint-report.json at conventional path", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockStat.mockResolvedValueOnce(makeStats(new Date()));

    const result = await discoveryService.findLintReport("/project");
    expect(result).toBe("/project/.eslint-report.json");
  });

  it("finds lint report via --output-file in script", async () => {
    const pkg = JSON.stringify({
      scripts: { lint: "eslint src --output-file reports/lint.json" },
    });
    mockReadFile.mockResolvedValueOnce(pkg as never);
    mockStat.mockResolvedValueOnce(makeStats(new Date()));

    const result = await discoveryService.findLintReport("/project");
    expect(result).toBe("/project/reports/lint.json");
  });
});

describe("discoveryService.getAggregateStats", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns null coverage and lint when no reports found", async () => {
    mockReaddir.mockRejectedValue(new Error("ENOENT"));
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockStat.mockRejectedValue(new Error("ENOENT"));

    const result = await discoveryService.getAggregateStats("/project");
    expect(result.coverage).toBeNull();
    expect(result.lint).toBeNull();
  });

  it("aggregates coverage from a found report", async () => {
    // No subdirectories
    mockReaddir.mockResolvedValueOnce([] as never);

    const coverageSummary = JSON.stringify({
      total: { lines: { total: 100, covered: 80 } },
    });
    const mtime = new Date("2024-06-01T00:00:00Z");

    // findCoverageReport for root dir:
    //   readPackageJson -> fails
    mockReadFile.mockRejectedValueOnce(new Error("ENOENT")); // no package.json
    //   stat conventional paths: coverage/coverage-summary.json -> exists
    mockStat.mockResolvedValueOnce(makeStats(mtime));
    //   readFile for the report
    mockReadFile.mockResolvedValueOnce(coverageSummary as never);
    //   stat for mtime
    mockStat.mockResolvedValueOnce(makeStats(mtime));

    // findLintReport for root:
    //   readPackageJson -> fails
    mockReadFile.mockRejectedValueOnce(new Error("ENOENT"));
    //   stat for .eslint-report.json -> not found
    mockStat.mockRejectedValueOnce(new Error("ENOENT"));
    mockStat.mockRejectedValueOnce(new Error("ENOENT"));
    mockStat.mockRejectedValueOnce(new Error("ENOENT"));
    mockStat.mockRejectedValueOnce(new Error("ENOENT"));

    const result = await discoveryService.getAggregateStats("/project");
    expect(result.coverage).not.toBeNull();
    expect(result.coverage!.linesPct).toBe(80);
    expect(result.lint).toBeNull();
  });

  it("aggregates lint errors from a found report", async () => {
    mockReaddir.mockResolvedValueOnce([] as never);

    const lintReport = JSON.stringify([
      { errorCount: 3, warningCount: 1 },
      { errorCount: 0, warningCount: 2 },
    ]);
    const mtime = new Date("2024-06-01T00:00:00Z");

    // findCoverageReport: all paths fail
    mockReadFile.mockRejectedValueOnce(new Error("ENOENT")); // no pkg.json
    mockStat.mockRejectedValueOnce(new Error("ENOENT")); // coverage/...
    mockStat.mockRejectedValueOnce(new Error("ENOENT")); // .coverage/...
    mockStat.mockRejectedValueOnce(new Error("ENOENT")); // test-results/...
    mockStat.mockRejectedValueOnce(new Error("ENOENT")); // coverage.json (Python)

    // findLintReport: no pkg.json, then .eslint-report.json exists
    mockReadFile.mockRejectedValueOnce(new Error("ENOENT"));
    mockStat.mockResolvedValueOnce(makeStats(mtime)); // .eslint-report.json found
    // read the lint report
    mockReadFile.mockResolvedValueOnce(lintReport as never);
    // stat for mtime
    mockStat.mockResolvedValueOnce(makeStats(mtime));

    const result = await discoveryService.getAggregateStats("/project");
    expect(result.coverage).toBeNull();
    expect(result.lint).not.toBeNull();
    expect(result.lint!.errors).toBe(3);
    expect(result.lint!.warnings).toBe(3);
  });

  it("scans subdirectories up to depth 2", async () => {
    // root contains one subdirectory "packages"
    mockReaddir
      .mockResolvedValueOnce([makeDirent("packages", true)] as never)
      .mockResolvedValueOnce([makeDirent("api", true)] as never); // packages/api

    // All report lookups fail (3 dirs × 2 lookups each)
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockStat.mockRejectedValue(new Error("ENOENT"));

    const result = await discoveryService.getAggregateStats("/project");
    expect(result.coverage).toBeNull();
    // readdir was called for root and for packages/
    expect(mockReaddir).toHaveBeenCalledTimes(2);
  });
});
