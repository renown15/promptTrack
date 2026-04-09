import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/file-snapshot.repository.js", () => ({
  fileSnapshotRepository: {
    getLatestPerFile: vi.fn(),
    getBaselineLineCounts: vi.fn(),
  },
}));

vi.mock("@/repositories/file-status-override.repository.js", () => ({
  fileStatusOverrideRepository: {
    listForCollection: vi.fn(),
  },
}));

vi.mock("@/services/insight.cache.js", () => ({
  getOrCreateState: vi.fn(),
}));

vi.mock("@/services/insight.scanner.js", () => ({
  getGitStatus: vi.fn(),
}));

import { fileSnapshotRepository } from "@/repositories/file-snapshot.repository.js";
import { fileStatusOverrideRepository } from "@/repositories/file-status-override.repository.js";
import { getOrCreateState } from "@/services/insight.cache.js";
import { getGitStatus } from "@/services/insight.scanner.js";
import { applyOverridesToState, seedCache } from "@/services/insight.seed.js";

describe("insight.seed", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("applyOverridesToState", () => {
    it("applies overrides to matching file snapshots", async () => {
      const state = {
        files: new Map([
          [
            "src/app.ts",
            {
              relativePath: "src/app.ts",
              name: "app.ts",
              fileType: ".ts",
              lineCount: 100,
              lineDelta: 5,
              updatedAt: new Date().toISOString(),
              coverage: null,
              lintErrors: null,
              gitStatus: "clean",
              metrics: {},
              overrides: {},
            },
          ],
        ]),
      };

      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([
        {
          id: "1",
          collectionId: "coll-1",
          relativePath: "src/app.ts",
          metric: "security",
          status: "red",
          comment: "SQL injection risk",
          source: "human",
          createdAt: new Date("2025-04-01"),
        },
      ] as any);

      await applyOverridesToState("coll-1", state as any);

      const snap = state.files.get("src/app.ts");
      expect(snap?.overrides.security).toEqual({
        status: "red",
        comment: "SQL injection risk",
        source: "human",
        updatedAt: "2025-04-01T00:00:00.000Z",
      });
    });

    it("ignores overrides for non-existent files", async () => {
      const state = { files: new Map() };

      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([
        {
          id: "1",
          collectionId: "coll-1",
          relativePath: "src/missing.ts",
          metric: "security",
          status: "red",
          comment: "Not found",
          source: "agent",
          createdAt: new Date(),
        },
      ] as any);

      await expect(
        applyOverridesToState("coll-1", state as any)
      ).resolves.not.toThrow();

      expect(state.files.size).toBe(0);
    });

    it("applies multiple overrides to same file", async () => {
      const state = {
        files: new Map([
          [
            "src/file.ts",
            {
              relativePath: "src/file.ts",
              overrides: {},
            },
          ],
        ]),
      };

      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([
        {
          id: "1",
          relativePath: "src/file.ts",
          metric: "security",
          status: "red",
          comment: "Issue 1",
          source: "human",
          createdAt: new Date("2025-04-01"),
        },
        {
          id: "2",
          relativePath: "src/file.ts",
          metric: "dry",
          status: "amber",
          comment: "Issue 2",
          source: "agent",
          createdAt: new Date("2025-04-02"),
        },
      ] as any);

      await applyOverridesToState("coll-1", state as any);

      const snap = state.files.get("src/file.ts") as any;
      expect(Object.keys(snap.overrides)).toHaveLength(2);
      expect(snap.overrides.security.status).toBe("red");
      expect(snap.overrides.dry.status).toBe("amber");
    });

    it("handles empty overrides list", async () => {
      const state = {
        files: new Map([
          [
            "src/file.ts",
            {
              relativePath: "src/file.ts",
              overrides: {},
            },
          ],
        ]),
      };

      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([]);

      await applyOverridesToState("coll-1", state as any);

      const snap = state.files.get("src/file.ts") as any;
      expect(Object.keys(snap.overrides)).toHaveLength(0);
    });
  });

  describe("seedCache", () => {
    it("returns early when no snapshot records exist", async () => {
      vi.mocked(fileSnapshotRepository.getLatestPerFile).mockResolvedValue([]);

      const state = { files: new Map() };
      vi.mocked(getOrCreateState).mockReturnValue(state as any);

      await seedCache("coll-1", "/repo");

      expect(state.files.size).toBe(0);
      expect(vi.mocked(getGitStatus)).not.toHaveBeenCalled();
    });

    it("loads snapshots into state with metadata", async () => {
      const isoString = "2025-04-09T10:00:00.000Z";
      const records = [
        {
          id: "rec-1",
          relativePath: "src/app.ts",
          name: "app.ts",
          fileType: ".ts",
          lineCount: 150,
          scannedAt: isoString,
          coverage: { linesPct: 85 },
          metrics: { security: { status: "green" } },
        },
      ];

      vi.mocked(fileSnapshotRepository.getLatestPerFile).mockResolvedValue(
        records as any
      );
      vi.mocked(fileSnapshotRepository.getBaselineLineCounts).mockResolvedValue(
        new Map([["src/app.ts", 145]])
      );
      vi.mocked(getGitStatus).mockResolvedValue(new Map());

      const state = { files: new Map(), lastScan: null };
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([]);

      await seedCache("coll-1", "/repo");

      const snap = state.files.get("src/app.ts");
      expect(snap?.relativePath).toBe("src/app.ts");
      expect(snap?.name).toBe("app.ts");
      expect(snap?.fileType).toBe(".ts");
      expect(snap?.lineCount).toBe(150);
      expect(snap?.lineDelta).toBe(5); // 150 - 145
      expect(snap?.updatedAt).toBe(isoString);
      expect(snap?.coverage).toEqual({ linesPct: 85 });
      expect(snap?.metrics).toEqual({ security: { status: "green" } });
    });

    it("calculates line delta from baseline", async () => {
      const records = [
        {
          relativePath: "src/utils.ts",
          name: "utils.ts",
          fileType: ".ts",
          lineCount: 200,
          scannedAt: new Date(),
          coverage: null,
          metrics: {},
        },
      ];

      vi.mocked(fileSnapshotRepository.getLatestPerFile).mockResolvedValue(
        records as any
      );
      vi.mocked(fileSnapshotRepository.getBaselineLineCounts).mockResolvedValue(
        new Map([["src/utils.ts", 180]])
      );
      vi.mocked(getGitStatus).mockResolvedValue(new Map());

      const state = { files: new Map(), lastScan: null };
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([]);

      await seedCache("coll-1", "/repo");

      const snap = state.files.get("src/utils.ts");
      expect(snap?.lineDelta).toBe(20);
    });

    it("sets lineDelta to null when no baseline", async () => {
      const records = [
        {
          relativePath: "src/new.ts",
          name: "new.ts",
          fileType: ".ts",
          lineCount: 50,
          scannedAt: new Date(),
          coverage: null,
          metrics: {},
        },
      ];

      vi.mocked(fileSnapshotRepository.getLatestPerFile).mockResolvedValue(
        records as any
      );
      vi.mocked(fileSnapshotRepository.getBaselineLineCounts).mockResolvedValue(
        new Map()
      );
      vi.mocked(getGitStatus).mockResolvedValue(new Map());

      const state = { files: new Map(), lastScan: null };
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([]);

      await seedCache("coll-1", "/repo");

      const snap = state.files.get("src/new.ts");
      expect(snap?.lineDelta).toBeNull();
    });

    it("applies git status to snapshots", async () => {
      const records = [
        {
          relativePath: "src/modified.ts",
          name: "modified.ts",
          fileType: ".ts",
          lineCount: 100,
          scannedAt: new Date(),
          coverage: null,
          metrics: {},
        },
        {
          relativePath: "src/clean.ts",
          name: "clean.ts",
          fileType: ".ts",
          lineCount: 80,
          scannedAt: new Date(),
          coverage: null,
          metrics: {},
        },
      ];

      vi.mocked(fileSnapshotRepository.getLatestPerFile).mockResolvedValue(
        records as any
      );
      vi.mocked(fileSnapshotRepository.getBaselineLineCounts).mockResolvedValue(
        new Map()
      );
      vi.mocked(getGitStatus).mockResolvedValue(
        new Map([["src/modified.ts", "modified"]])
      );

      const state = { files: new Map(), lastScan: null };
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([]);

      await seedCache("coll-1", "/repo");

      expect(state.files.get("src/modified.ts")?.gitStatus).toBe("modified");
      expect(state.files.get("src/clean.ts")?.gitStatus).toBe("clean");
    });

    it("sets lastScan from first record", async () => {
      const isoString = "2025-04-09T12:00:00.000Z";
      const records = [
        {
          relativePath: "src/file1.ts",
          name: "file1.ts",
          fileType: ".ts",
          lineCount: 100,
          scannedAt: isoString,
          coverage: null,
          metrics: {},
        },
        {
          relativePath: "src/file2.ts",
          name: "file2.ts",
          fileType: ".ts",
          lineCount: 100,
          scannedAt: "2025-04-08T12:00:00Z",
          coverage: null,
          metrics: {},
        },
      ];

      vi.mocked(fileSnapshotRepository.getLatestPerFile).mockResolvedValue(
        records as any
      );
      vi.mocked(fileSnapshotRepository.getBaselineLineCounts).mockResolvedValue(
        new Map()
      );
      vi.mocked(getGitStatus).mockResolvedValue(new Map());

      const state = { files: new Map(), lastScan: null };
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([]);

      await seedCache("coll-1", "/repo");

      expect(state.lastScan).toBe(isoString);
    });

    it("handles missing coverage gracefully", async () => {
      const records = [
        {
          relativePath: "src/file.ts",
          name: "file.ts",
          fileType: ".ts",
          lineCount: 100,
          scannedAt: new Date(),
          coverage: null,
          metrics: {},
        },
      ];

      vi.mocked(fileSnapshotRepository.getLatestPerFile).mockResolvedValue(
        records as any
      );
      vi.mocked(fileSnapshotRepository.getBaselineLineCounts).mockResolvedValue(
        new Map()
      );
      vi.mocked(getGitStatus).mockResolvedValue(new Map());

      const state = { files: new Map(), lastScan: null };
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([]);

      await seedCache("coll-1", "/repo");

      const snap = state.files.get("src/file.ts");
      expect(snap?.coverage).toBeNull();
      expect(snap?.lintErrors).toBeNull();
    });

    it("calls applyOverridesToState after loading snapshots", async () => {
      const records = [
        {
          relativePath: "src/file.ts",
          name: "file.ts",
          fileType: ".ts",
          lineCount: 100,
          scannedAt: new Date(),
          coverage: null,
          metrics: {},
        },
      ];

      vi.mocked(fileSnapshotRepository.getLatestPerFile).mockResolvedValue(
        records as any
      );
      vi.mocked(fileSnapshotRepository.getBaselineLineCounts).mockResolvedValue(
        new Map()
      );
      vi.mocked(getGitStatus).mockResolvedValue(new Map());

      const state = { files: new Map(), lastScan: null };
      vi.mocked(getOrCreateState).mockReturnValue(state as any);
      vi.mocked(
        fileStatusOverrideRepository.listForCollection
      ).mockResolvedValue([
        {
          id: "1",
          relativePath: "src/file.ts",
          metric: "security",
          status: "red",
          comment: "test",
          source: "human",
          createdAt: new Date(),
        },
      ] as any);

      await seedCache("coll-1", "/repo");

      const snap = state.files.get("src/file.ts") as any;
      expect(snap?.overrides.security).toBeDefined();
    });
  });
});
