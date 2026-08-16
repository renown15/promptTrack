import {
  buildRecommendations,
  countMetrics,
  suggestFix,
} from "@/services/agent-tool-helpers.js";
import { describe, expect, it } from "vitest";

describe("agent-tool-helpers", () => {
  describe("countMetrics", () => {
    it("returns empty object for empty files", () => {
      const result = countMetrics([]);
      expect(result).toEqual({});
    });

    it("counts green/amber/red/error/pending statuses", () => {
      const files = [
        {
          relativePath: "a.ts",
          metrics: {
            security: { status: "green" },
            coverage: { status: "red" },
          },
        },
        {
          relativePath: "b.ts",
          metrics: {
            dry: { status: "amber" },
            perf: "pending",
            eng_quality: { error: "Failed" },
          },
        },
      ];

      const result = countMetrics(files as any);

      expect(result.security).toEqual({
        green: 1,
        amber: 0,
        red: 0,
        error: 0,
        pending: 0,
      });
      expect(result.coverage).toEqual({
        green: 0,
        amber: 0,
        red: 1,
        error: 0,
        pending: 0,
      });
      expect(result.dry).toEqual({
        green: 0,
        amber: 1,
        red: 0,
        error: 0,
        pending: 0,
      });
      expect(result.perf).toEqual({
        green: 0,
        amber: 0,
        red: 0,
        error: 0,
        pending: 1,
      });
      expect(result.eng_quality).toEqual({
        green: 0,
        amber: 0,
        red: 0,
        error: 1,
        pending: 0,
      });
    });

    it("treats null/undefined values as error", () => {
      const files = [
        {
          relativePath: "a.ts",
          metrics: { test: null, coverage: undefined },
        },
      ];

      const result = countMetrics(files as any);

      expect(result.test.error).toBe(1);
      expect(result.coverage.error).toBe(1);
    });

    it("treats missing status as error", () => {
      const files = [
        {
          relativePath: "a.ts",
          metrics: { test: { value: 42 } },
        },
      ];

      const result = countMetrics(files as any);

      expect(result.test.error).toBe(1);
    });

    it("accumulates across multiple files", () => {
      const files = [
        {
          relativePath: "a.ts",
          metrics: {
            security: { status: "green" },
            coverage: { status: "green" },
          },
        },
        {
          relativePath: "b.ts",
          metrics: {
            security: { status: "red" },
            coverage: { status: "red" },
          },
        },
        {
          relativePath: "c.ts",
          metrics: { security: { status: "amber" } },
        },
      ];

      const result = countMetrics(files as any);

      expect(result.security.green).toBe(1);
      expect(result.security.amber).toBe(1);
      expect(result.security.red).toBe(1);
      expect(result.coverage.green).toBe(1);
      expect(result.coverage.red).toBe(1);
    });
  });

  describe("buildRecommendations", () => {
    const emptyFiles = [];
    const emptyCounts = {};

    it("returns empty array when healthy", () => {
      const result = buildRecommendations(
        emptyFiles as any,
        90,
        0,
        emptyCounts
      );
      expect(result).toEqual([]);
    });

    it("flags untracked files as high priority", () => {
      const files = [
        { relativePath: "new.ts", gitStatus: "untracked", metrics: {} },
        { relativePath: "new2.ts", gitStatus: "untracked", metrics: {} },
      ];

      const result = buildRecommendations(files as any, null, 0, {});

      const rec = result.find((r) => r.action === "track_or_ignore_files");
      expect(rec).toBeDefined();
      expect(rec?.priority).toBe("high");
      expect(rec?.detail).toContain("2 untracked file(s)");
    });

    it("flags modified files as high priority", () => {
      const files = [
        { relativePath: "mod.ts", gitStatus: "modified", metrics: {} },
      ];

      const result = buildRecommendations(files as any, null, 0, {});

      const rec = result.find((r) => r.action === "commit_pending_work");
      expect(rec).toBeDefined();
      expect(rec?.priority).toBe("high");
      expect(rec?.detail).toContain("1 modified file(s)");
    });

    it("flags security red as high priority", () => {
      const files = [];
      const counts = {
        security: { red: 2, amber: 0, green: 0, error: 0, pending: 0 },
      };

      const result = buildRecommendations(files as any, null, 0, counts);

      const rec = result.find((r) => r.action === "fix_security_issues");
      expect(rec).toBeDefined();
      expect(rec?.priority).toBe("high");
      expect(rec?.detail).toContain("2 file(s)");
    });

    it("flags lint errors as high priority", () => {
      const result = buildRecommendations(emptyFiles as any, null, 5, {});

      const rec = result.find((r) => r.action === "fix_lint_errors");
      expect(rec).toBeDefined();
      expect(rec?.priority).toBe("high");
      expect(rec?.detail).toContain("5 lint error(s)");
    });

    it("flags low coverage <60% as high priority", () => {
      const result = buildRecommendations(emptyFiles as any, 45, 0, {});

      const rec = result.find((r) => r.action === "improve_test_coverage");
      expect(rec).toBeDefined();
      expect(rec?.priority).toBe("high");
      expect(rec?.detail).toContain("45%");
    });

    it("flags low coverage 60-80% as medium priority", () => {
      const result = buildRecommendations(emptyFiles as any, 70, 0, {});

      const rec = result.find((r) => r.action === "improve_test_coverage");
      expect(rec).toBeDefined();
      expect(rec?.priority).toBe("medium");
      expect(rec?.detail).toContain("70%");
    });

    it("doesn't flag coverage >=80%", () => {
      const result = buildRecommendations(emptyFiles as any, 85, 0, {});

      const rec = result.find((r) => r.action === "improve_test_coverage");
      expect(rec).toBeUndefined();
    });

    it("doesn't flag null coverage", () => {
      const result = buildRecommendations(emptyFiles as any, null, 0, {});

      const rec = result.find((r) => r.action === "improve_test_coverage");
      expect(rec).toBeUndefined();
    });

    it("flags eng_quality red >3 as medium priority", () => {
      const counts = {
        eng_quality: { red: 4, amber: 0, green: 0, error: 0, pending: 0 },
      };

      const result = buildRecommendations(emptyFiles as any, null, 0, counts);

      const rec = result.find(
        (r) => r.action === "address_engineering_quality"
      );
      expect(rec).toBeDefined();
      expect(rec?.priority).toBe("medium");
      expect(rec?.detail).toContain("4 file(s)");
    });

    it("doesn't flag eng_quality red <=3", () => {
      const counts = {
        eng_quality: { red: 3, amber: 0, green: 0, error: 0, pending: 0 },
      };

      const result = buildRecommendations(emptyFiles as any, null, 0, counts);

      const rec = result.find(
        (r) => r.action === "address_engineering_quality"
      );
      expect(rec).toBeUndefined();
    });

    it("flags dry red as low priority", () => {
      const counts = {
        dry: { red: 2, amber: 0, green: 0, error: 0, pending: 0 },
      };

      const result = buildRecommendations(emptyFiles as any, null, 0, counts);

      const rec = result.find((r) => r.action === "fix_dry_violations");
      expect(rec).toBeDefined();
      expect(rec?.priority).toBe("low");
      expect(rec?.detail).toContain("2 file(s)");
    });

    it("doesn't flag dry if no red", () => {
      const counts = {
        dry: { red: 0, amber: 2, green: 0, error: 0, pending: 0 },
      };

      const result = buildRecommendations(emptyFiles as any, null, 0, counts);

      const rec = result.find((r) => r.action === "fix_dry_violations");
      expect(rec).toBeUndefined();
    });

    it("combines multiple recommendations", () => {
      const files = [
        { relativePath: "new.ts", gitStatus: "untracked", metrics: {} },
      ];
      const counts = {
        security: { red: 1, amber: 0, green: 0, error: 0, pending: 0 },
      };

      const result = buildRecommendations(files as any, 45, 3, counts);

      expect(result.length).toBeGreaterThan(1);
      expect(result.map((r) => r.action)).toContain("track_or_ignore_files");
      expect(result.map((r) => r.action)).toContain("fix_security_issues");
      expect(result.map((r) => r.action)).toContain("fix_lint_errors");
      expect(result.map((r) => r.action)).toContain("improve_test_coverage");
    });
  });

  describe("suggestFix", () => {
    it("suggests committing untracked files", () => {
      const file = {
        gitStatus: "untracked",
        coverage: null,
        metrics: {},
      };

      const result = suggestFix(file as any);

      expect(result).toContain("Commit this file or add to .gitignore");
    });

    it("suggests committing modified files", () => {
      const file = {
        gitStatus: "modified",
        coverage: null,
        metrics: {},
      };

      const result = suggestFix(file as any);

      expect(result).toContain("Commit pending changes");
    });

    it("suggests fixing security red", () => {
      const file = {
        gitStatus: null,
        coverage: null,
        metrics: { security: { status: "red" } },
      };

      const result = suggestFix(file as any);

      expect(result).toContain("security");
      expect(result).toContain("hardcoded secrets");
    });

    it("suggests refactoring dry violations", () => {
      const file = {
        gitStatus: null,
        coverage: null,
        metrics: { dry: { status: "red" } },
      };

      const result = suggestFix(file as any);

      expect(result).toContain("Refactor");
      expect(result).toContain("duplication");
    });

    it("suggests fixing eng_quality red", () => {
      const file = {
        gitStatus: null,
        coverage: null,
        metrics: { eng_quality: { status: "red" } },
      };

      const result = suggestFix(file as any);

      expect(result).toContain("error handling");
      expect(result).toContain("observability");
    });

    it("suggests adding tests for low coverage", () => {
      const file = {
        gitStatus: null,
        coverage: 35,
        metrics: {},
      };

      const result = suggestFix(file as any);

      expect(result).toContain("Add tests");
      expect(result).toContain("35%");
    });

    it("suggests reviewing amber metrics", () => {
      const file = {
        gitStatus: null,
        coverage: 85,
        metrics: { complexity: { status: "amber" }, perf: { status: "amber" } },
      };

      const result = suggestFix(file as any);

      expect(result).toContain("Review");
      expect(result).toContain("amber");
      expect(result).toContain("complexity");
      expect(result).toContain("perf");
    });

    it("suggests general review when no specific issues", () => {
      const file = {
        gitStatus: null,
        coverage: 90,
        metrics: {},
      };

      const result = suggestFix(file as any);

      expect(result).toContain("Review file for potential improvements");
    });

    it("prioritizes security over dry", () => {
      const file = {
        gitStatus: null,
        coverage: null,
        metrics: {
          security: { status: "red" },
          dry: { status: "red" },
        },
      };

      const result = suggestFix(file as any);

      expect(result).toContain("security");
      expect(result).not.toContain("Refactor");
    });

    it("handles empty metrics object", () => {
      const file = {
        gitStatus: null,
        coverage: 75,
        metrics: {},
      };

      const result = suggestFix(file as any);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("only considers metrics with status property", () => {
      const file = {
        gitStatus: null,
        coverage: null,
        metrics: { test: { value: 42 }, coverage: { status: "red" } },
      };

      const result = suggestFix(file as any);

      // Without special handling for generic cov-red, falls through to general review
      // (The function only has specific red handlers for security/dry/eng_quality)
      expect(result).toContain("Review");
    });
  });
});
