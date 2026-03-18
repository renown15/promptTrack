import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeHealth,
  timeAgo,
  ragCoverage,
  ragLint,
  ciRag,
  fileMatchesFilter,
  filterMatches,
} from "../../src/components/features/insights/InsightSummaryPanel.utils";
import { applyFilter } from "../../src/pages/AgentInsightPage.utils";
import type { FileSnapshotDTO } from "../../src/api/endpoints/insights";

// ── helpers ─────────────────────────────────────────────────────────────────

function makeFile(overrides: Partial<FileSnapshotDTO> = {}): FileSnapshotDTO {
  return {
    path: "src/foo.ts",
    lineCount: 100,
    gitStatus: null,
    coverage: null,
    lintErrors: null,
    metrics: {},
    ...overrides,
  };
}

// ── computeHealth ────────────────────────────────────────────────────────────

describe("computeHealth", () => {
  it("returns empty object when no metrics", () => {
    const result = computeHealth([], []);
    expect(result).toEqual({});
  });

  it("initialises all buckets to 0", () => {
    const result = computeHealth([], ["complexity"]);
    expect(result.complexity).toEqual({
      green: 0,
      amber: 0,
      red: 0,
      error: 0,
      pending: 0,
    });
  });

  it("counts green/amber/red from status objects", () => {
    const files = [
      makeFile({ metrics: { complexity: { status: "green" } } }),
      makeFile({ metrics: { complexity: { status: "amber" } } }),
      makeFile({ metrics: { complexity: { status: "red" } } }),
      makeFile({ metrics: { complexity: { status: "green" } } }),
    ];
    const result = computeHealth(files, ["complexity"]);
    expect(result.complexity).toEqual({
      green: 2,
      amber: 1,
      red: 1,
      error: 0,
      pending: 0,
    });
  });

  it("counts pending string", () => {
    const files = [makeFile({ metrics: { size: "pending" } })];
    const result = computeHealth(files, ["size"]);
    expect(result.size?.pending).toBe(1);
  });

  it("counts null as error", () => {
    const files = [makeFile({ metrics: { size: null } })];
    const result = computeHealth(files, ["size"]);
    expect(result.size?.error).toBe(1);
  });

  it("counts error object as error", () => {
    const files = [makeFile({ metrics: { size: { error: "failed" } } })];
    const result = computeHealth(files, ["size"]);
    expect(result.size?.error).toBe(1);
  });

  it("handles multiple metrics independently", () => {
    const files = [
      makeFile({
        metrics: {
          a: { status: "green" },
          b: { status: "red" },
        },
      }),
    ];
    const result = computeHealth(files, ["a", "b"]);
    expect(result.a?.green).toBe(1);
    expect(result.b?.red).toBe(1);
  });
});

// ── timeAgo ──────────────────────────────────────────────────────────────────

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns 'just now' for < 1 minute ago", () => {
    expect(timeAgo("2025-01-01T11:59:30Z")).toBe("just now");
  });

  it("returns minutes", () => {
    expect(timeAgo("2025-01-01T11:55:00Z")).toBe("5m ago");
  });

  it("returns hours", () => {
    expect(timeAgo("2025-01-01T10:00:00Z")).toBe("2h ago");
  });

  it("returns days", () => {
    expect(timeAgo("2024-12-30T12:00:00Z")).toBe("2d ago");
  });
});

// ── ragCoverage ───────────────────────────────────────────────────────────────

describe("ragCoverage", () => {
  it("returns green for >= 80", () => expect(ragCoverage(80)).toBe("green"));
  it("returns green for 100", () => expect(ragCoverage(100)).toBe("green"));
  it("returns amber for 50–79", () => expect(ragCoverage(50)).toBe("amber"));
  it("returns amber for 79", () => expect(ragCoverage(79)).toBe("amber"));
  it("returns red for < 50", () => expect(ragCoverage(49)).toBe("red"));
  it("returns red for 0", () => expect(ragCoverage(0)).toBe("red"));
});

// ── ragLint ───────────────────────────────────────────────────────────────────

describe("ragLint", () => {
  it("returns green for 0 errors", () => expect(ragLint(0)).toBe("green"));
  it("returns amber for 1–5 errors", () => expect(ragLint(5)).toBe("amber"));
  it("returns red for > 5 errors", () => expect(ragLint(6)).toBe("red"));
});

// ── ciRag ─────────────────────────────────────────────────────────────────────

describe("ciRag", () => {
  it("returns amber for in_progress", () =>
    expect(ciRag(null, "in_progress")).toBe("amber"));
  it("returns amber for queued", () =>
    expect(ciRag(null, "queued")).toBe("amber"));
  it("returns green for success", () =>
    expect(ciRag("success", "completed")).toBe("green"));
  it("returns red for failure", () =>
    expect(ciRag("failure", "completed")).toBe("red"));
  it("returns amber for unknown conclusion", () =>
    expect(ciRag("cancelled", "completed")).toBe("amber"));
});

// ── fileMatchesFilter ─────────────────────────────────────────────────────────

describe("fileMatchesFilter", () => {
  it("matches modified git status", () => {
    const f = makeFile({ gitStatus: "modified" });
    expect(fileMatchesFilter(f, { type: "git", status: "modified" })).toBe(
      true
    );
  });

  it("does not match wrong git status", () => {
    const f = makeFile({ gitStatus: "untracked" });
    expect(fileMatchesFilter(f, { type: "git", status: "modified" })).toBe(
      false
    );
  });

  it("matches coverage filter when coverage present", () => {
    const f = makeFile({ coverage: 72 });
    expect(fileMatchesFilter(f, { type: "coverage" })).toBe(true);
  });

  it("does not match coverage filter when null", () => {
    const f = makeFile({ coverage: null });
    expect(fileMatchesFilter(f, { type: "coverage" })).toBe(false);
  });

  it("matches lint filter when lintErrors > 0", () => {
    const f = makeFile({ lintErrors: 3 });
    expect(fileMatchesFilter(f, { type: "lint" })).toBe(true);
  });

  it("does not match lint filter when 0 errors", () => {
    const f = makeFile({ lintErrors: 0 });
    expect(fileMatchesFilter(f, { type: "lint" })).toBe(false);
  });

  it("matches metric status filter", () => {
    const f = makeFile({ metrics: { complexity: { status: "red" } } });
    expect(
      fileMatchesFilter(f, {
        type: "metric",
        name: "complexity",
        status: "red",
      })
    ).toBe(true);
  });

  it("does not match metric filter when status differs", () => {
    const f = makeFile({ metrics: { complexity: { status: "green" } } });
    expect(
      fileMatchesFilter(f, {
        type: "metric",
        name: "complexity",
        status: "red",
      })
    ).toBe(false);
  });

  it("matches error metric filter for null value", () => {
    const f = makeFile({ metrics: { complexity: null } });
    expect(
      fileMatchesFilter(f, {
        type: "metric",
        name: "complexity",
        status: "error",
      })
    ).toBe(true);
  });

  it("matches error metric filter for error object", () => {
    const f = makeFile({ metrics: { complexity: { error: "timeout" } } });
    expect(
      fileMatchesFilter(f, {
        type: "metric",
        name: "complexity",
        status: "error",
      })
    ).toBe(true);
  });
});

// ── filterMatches ─────────────────────────────────────────────────────────────

describe("filterMatches", () => {
  it("returns false when types differ", () => {
    expect(
      filterMatches({ type: "git", status: "modified" }, { type: "coverage" })
    ).toBe(false);
  });

  it("matches identical git filters", () => {
    expect(
      filterMatches(
        { type: "git", status: "modified" },
        { type: "git", status: "modified" }
      )
    ).toBe(true);
  });

  it("does not match different git statuses", () => {
    expect(
      filterMatches(
        { type: "git", status: "modified" },
        { type: "git", status: "untracked" }
      )
    ).toBe(false);
  });

  it("matches coverage filters", () => {
    expect(filterMatches({ type: "coverage" }, { type: "coverage" })).toBe(
      true
    );
  });

  it("matches lint filters", () => {
    expect(filterMatches({ type: "lint" }, { type: "lint" })).toBe(true);
  });

  it("matches identical metric filters", () => {
    expect(
      filterMatches(
        { type: "metric", name: "complexity", status: "red" },
        { type: "metric", name: "complexity", status: "red" }
      )
    ).toBe(true);
  });

  it("does not match metric filters with different names", () => {
    expect(
      filterMatches(
        { type: "metric", name: "complexity", status: "red" },
        { type: "metric", name: "size", status: "red" }
      )
    ).toBe(false);
  });

  it("does not match metric filters with different statuses", () => {
    expect(
      filterMatches(
        { type: "metric", name: "complexity", status: "red" },
        { type: "metric", name: "complexity", status: "green" }
      )
    ).toBe(false);
  });
});

// ── applyFilter ───────────────────────────────────────────────────────────────

describe("applyFilter", () => {
  const files = [
    makeFile({
      path: "a.ts",
      gitStatus: "modified",
      coverage: 80,
      lintErrors: 0,
      metrics: { c: { status: "green" } },
    }),
    makeFile({
      path: "b.ts",
      gitStatus: "untracked",
      coverage: null,
      lintErrors: 2,
      metrics: { c: { status: "red" } },
    }),
    makeFile({
      path: "c.ts",
      gitStatus: null,
      coverage: 50,
      lintErrors: 0,
      metrics: { c: null },
    }),
  ];

  it("returns all files when filter is null", () => {
    expect(applyFilter(files, null)).toHaveLength(3);
  });

  it("filters by git modified", () => {
    const r = applyFilter(files, { type: "git", status: "modified" });
    expect(r).toHaveLength(1);
    expect(r[0].path).toBe("a.ts");
  });

  it("filters by coverage (files with non-null coverage)", () => {
    const r = applyFilter(files, { type: "coverage" });
    expect(r).toHaveLength(2);
  });

  it("filters by lint (files with lintErrors > 0)", () => {
    const r = applyFilter(files, { type: "lint" });
    expect(r).toHaveLength(1);
    expect(r[0].path).toBe("b.ts");
  });

  it("filters by metric status", () => {
    const r = applyFilter(files, { type: "metric", name: "c", status: "red" });
    expect(r).toHaveLength(1);
    expect(r[0].path).toBe("b.ts");
  });

  it("filters by metric error (null value)", () => {
    const r = applyFilter(files, {
      type: "metric",
      name: "c",
      status: "error",
    });
    expect(r).toHaveLength(1);
    expect(r[0].path).toBe("c.ts");
  });
});
