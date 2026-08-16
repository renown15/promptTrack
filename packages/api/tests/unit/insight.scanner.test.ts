import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("child_process", () => ({
  execFile: vi.fn((cmd, args, opts, callback) => {
    callback(null, { stdout: "" });
  }),
}));

vi.mock("fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));

import {
  CODE_EXTENSIONS,
  getGitStatus,
  readSnapshot,
  SKIP_DIRS,
  walkCode,
} from "@/services/insight.scanner.js";
import { execFile } from "child_process";
import { readdir, readFile, stat } from "fs/promises";

describe("insight.scanner", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("CODE_EXTENSIONS", () => {
    it("includes TypeScript extensions", () => {
      expect(CODE_EXTENSIONS.has(".ts")).toBe(true);
      expect(CODE_EXTENSIONS.has(".tsx")).toBe(true);
    });

    it("includes JavaScript extensions", () => {
      expect(CODE_EXTENSIONS.has(".js")).toBe(true);
      expect(CODE_EXTENSIONS.has(".jsx")).toBe(true);
      expect(CODE_EXTENSIONS.has(".mjs")).toBe(true);
      expect(CODE_EXTENSIONS.has(".cjs")).toBe(true);
    });

    it("includes Python extension", () => {
      expect(CODE_EXTENSIONS.has(".py")).toBe(true);
    });

    it("includes Go and Rust extensions", () => {
      expect(CODE_EXTENSIONS.has(".go")).toBe(true);
      expect(CODE_EXTENSIONS.has(".rs")).toBe(true);
    });

    it("includes CSS and Markdown", () => {
      expect(CODE_EXTENSIONS.has(".css")).toBe(true);
      expect(CODE_EXTENSIONS.has(".md")).toBe(true);
    });

    it("doesn't include non-code extensions", () => {
      expect(CODE_EXTENSIONS.has(".json")).toBe(false);
      expect(CODE_EXTENSIONS.has(".yaml")).toBe(false);
      expect(CODE_EXTENSIONS.has(".txt")).toBe(false);
    });
  });

  describe("SKIP_DIRS", () => {
    it("includes node_modules", () => {
      expect(SKIP_DIRS.has("node_modules")).toBe(true);
    });

    it("includes version control directories", () => {
      expect(SKIP_DIRS.has(".git")).toBe(true);
    });

    it("includes build output directories", () => {
      expect(SKIP_DIRS.has("dist")).toBe(true);
      expect(SKIP_DIRS.has("build")).toBe(true);
      expect(SKIP_DIRS.has("coverage")).toBe(true);
    });

    it("includes framework cache directories", () => {
      expect(SKIP_DIRS.has(".next")).toBe(true);
      expect(SKIP_DIRS.has(".nuxt")).toBe(true);
    });

    it("includes Python cache", () => {
      expect(SKIP_DIRS.has("__pycache__")).toBe(true);
    });
  });

  describe("getGitStatus", () => {
    it("returns empty map when git unavailable", async () => {
      vi.mocked(execFile).mockImplementationOnce((cmd, args, opts, cb) => {
        cb(new Error("git not found") as any);
        return {} as any;
      });

      const result = await getGitStatus("/repo");

      expect(result).toEqual(new Map());
    });

    it("parses untracked files (??)", async () => {
      vi.mocked(execFile)
        .mockImplementationOnce((cmd, args, opts, cb) => {
          cb(null, { stdout: "/repo\n" } as any);
          return {} as any;
        })
        .mockImplementationOnce((cmd, args, opts, cb) => {
          cb(null, { stdout: "?? src/new.ts\n" } as any);
          return {} as any;
        });

      const result = await getGitStatus("/repo");

      expect(result.get("src/new.ts")).toBe("untracked");
    });

    it("parses modified files", async () => {
      vi.mocked(execFile)
        .mockImplementationOnce((cmd, args, opts, cb) => {
          cb(null, { stdout: "/repo\n" } as any);
          return {} as any;
        })
        .mockImplementationOnce((cmd, args, opts, cb) => {
          cb(null, {
            stdout: " M src/existing.ts\nM  src/staged.ts\nMM src/both.ts\n",
          } as any);
          return {} as any;
        });

      const result = await getGitStatus("/repo");

      expect(result.get("src/existing.ts")).toBe("modified");
      expect(result.get("src/staged.ts")).toBe("modified");
      expect(result.get("src/both.ts")).toBe("modified");
    });

    it("handles renamed files (old -> new)", async () => {
      vi.mocked(execFile)
        .mockImplementationOnce((cmd, args, opts, cb) => {
          cb(null, { stdout: "/repo\n" } as any);
          return {} as any;
        })
        .mockImplementationOnce((cmd, args, opts, cb) => {
          cb(null, { stdout: "R  src/old.ts -> src/new.ts\n" } as any);
          return {} as any;
        });

      const result = await getGitStatus("/repo");

      expect(result.get("src/new.ts")).toBe("modified");
    });

    it("skips empty lines", async () => {
      vi.mocked(execFile)
        .mockImplementationOnce((cmd, args, opts, cb) => {
          cb(null, { stdout: "/repo\n" } as any);
          return {} as any;
        })
        .mockImplementationOnce((cmd, args, opts, cb) => {
          cb(null, { stdout: "?? a.ts\n\n?? b.ts\n" } as any);
          return {} as any;
        });

      const result = await getGitStatus("/repo");

      expect(result.size).toBe(2);
      expect(result.get("a.ts")).toBe("untracked");
      expect(result.get("b.ts")).toBe("untracked");
    });

    it("calls git rev-parse for root dir", async () => {
      vi.mocked(execFile)
        .mockImplementationOnce((cmd, args, opts, cb) => {
          cb(null, { stdout: "/root\n" } as any);
          return {} as any;
        })
        .mockImplementationOnce((cmd, args, opts, cb) => {
          cb(null, { stdout: "" } as any);
          return {} as any;
        });

      await getGitStatus("/repo");

      const calls = vi.mocked(execFile).mock.calls;
      expect(calls[0][1]).toContain("rev-parse");
      expect(calls[0][1]).toContain("--show-toplevel");
    });
  });

  describe("readSnapshot", () => {
    it("creates snapshot from file info", async () => {
      vi.mocked(stat).mockResolvedValue({
        mtime: new Date("2025-04-09T10:00:00Z"),
      } as any);
      vi.mocked(readFile).mockResolvedValue("line1\nline2\nline3\n");

      const snap = await readSnapshot("/repo/src/foo.ts", "/repo");

      expect(snap).not.toBeNull();
      expect(snap?.relativePath).toBe("src/foo.ts");
      expect(snap?.name).toBe("foo.ts");
      expect(snap?.fileType).toBe("ts");
      expect(snap?.lineCount).toBe(4); // 3 lines + 1 for trailing newline
    });

    it("handles files without extension", async () => {
      vi.mocked(stat).mockResolvedValue({ mtime: new Date() } as any);
      vi.mocked(readFile).mockResolvedValue("content");

      const snap = await readSnapshot("/repo/Makefile", "/repo");

      expect(snap?.fileType).toBe("");
      expect(snap?.name).toBe("Makefile");
    });

    it("normalizes extension case", async () => {
      vi.mocked(stat).mockResolvedValue({ mtime: new Date() } as any);
      vi.mocked(readFile).mockResolvedValue("code");

      const snap = await readSnapshot("/repo/src/Foo.TS", "/repo");

      expect(snap?.fileType).toBe("ts");
    });

    it("counts lines including trailing newline", async () => {
      vi.mocked(stat).mockResolvedValue({ mtime: new Date() } as any);
      vi.mocked(readFile).mockResolvedValue("a\nb\nc");

      const snap = await readSnapshot("/repo/file.ts", "/repo");

      expect(snap?.lineCount).toBe(3);
    });

    it("returns null on file read error", async () => {
      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));

      const snap = await readSnapshot("/repo/nonexistent.ts", "/repo");

      expect(snap).toBeNull();
    });

    it("returns null on stat error", async () => {
      vi.mocked(stat).mockRejectedValue(new Error("EACCES"));

      const snap = await readSnapshot("/repo/forbidden.ts", "/repo");

      expect(snap).toBeNull();
    });

    it("initializes metrics as empty object", async () => {
      vi.mocked(stat).mockResolvedValue({ mtime: new Date() } as any);
      vi.mocked(readFile).mockResolvedValue("code");

      const snap = await readSnapshot("/repo/src/test.ts", "/repo");

      expect(snap?.metrics).toEqual({});
      expect(snap?.overrides).toEqual({});
    });

    it("sets git status to null", async () => {
      vi.mocked(stat).mockResolvedValue({ mtime: new Date() } as any);
      vi.mocked(readFile).mockResolvedValue("code");

      const snap = await readSnapshot("/repo/src/test.ts", "/repo");

      expect(snap?.gitStatus).toBeNull();
    });

    it("sets coverage and lintErrors to null", async () => {
      vi.mocked(stat).mockResolvedValue({ mtime: new Date() } as any);
      vi.mocked(readFile).mockResolvedValue("code");

      const snap = await readSnapshot("/repo/src/test.ts", "/repo");

      expect(snap?.coverage).toBeNull();
      expect(snap?.lintErrors).toBeNull();
    });
  });

  describe("walkCode", () => {
    it("yields files with code extensions", async () => {
      vi.mocked(readdir).mockResolvedValue([
        {
          name: "main.ts",
          isDirectory: () => false,
          isFile: () => true,
        },
        {
          name: "utils.ts",
          isDirectory: () => false,
          isFile: () => true,
        },
      ] as any);
      vi.mocked(stat).mockResolvedValue({ mtime: new Date() } as any);
      vi.mocked(readFile).mockResolvedValue("code");

      const snaps: any[] = [];
      for await (const snap of walkCode("/repo/src", "/repo", 0)) {
        snaps.push(snap);
      }

      expect(snaps).toHaveLength(2);
      expect(snaps[0].fileType).toBe("ts");
    });

    it("skips non-code files", async () => {
      vi.mocked(readdir).mockResolvedValue([
        {
          name: "data.json",
          isDirectory: () => false,
          isFile: () => true,
        },
        {
          name: "main.ts",
          isDirectory: () => false,
          isFile: () => true,
        },
      ] as any);
      vi.mocked(stat).mockResolvedValue({ mtime: new Date() } as any);
      vi.mocked(readFile).mockResolvedValue("code");

      const snaps: any[] = [];
      for await (const snap of walkCode("/repo", "/repo", 0)) {
        snaps.push(snap);
      }

      expect(snaps).toHaveLength(1);
      expect(snaps[0].name).toBe("main.ts");
    });

    it("skips skip directories", async () => {
      vi.mocked(readdir).mockResolvedValue([
        {
          name: "node_modules",
          isDirectory: () => true,
          isFile: () => false,
        },
        {
          name: "src",
          isDirectory: () => true,
          isFile: () => false,
        },
      ] as any);

      const dirCalls: string[] = [];
      vi.mocked(readdir).mockImplementation((path) => {
        dirCalls.push(path as string);
        return Promise.resolve([]);
      });

      const snaps: any[] = [];
      for await (const snap of walkCode("/repo", "/repo", 0)) {
        snaps.push(snap);
      }

      const calledPaths = dirCalls.join("|");
      expect(calledPaths).not.toContain("node_modules");
    });

    it("respects max depth of 6", async () => {
      vi.mocked(readdir).mockResolvedValue([]);

      const snaps: any[] = [];
      for await (const snap of walkCode("/repo", "/repo", 7)) {
        snaps.push(snap);
      }

      expect(snaps).toHaveLength(0);
      expect(vi.mocked(readdir)).not.toHaveBeenCalled();
    });

    it("respects excluded directories", async () => {
      vi.mocked(readdir).mockResolvedValue([
        {
          name: "src",
          isDirectory: () => true,
          isFile: () => false,
        },
      ] as any);

      const snaps: any[] = [];
      for await (const snap of walkCode("/repo", "/repo", 0, ["src"])) {
        snaps.push(snap);
      }

      expect(vi.mocked(readdir)).toHaveBeenCalledWith("/repo", {
        withFileTypes: true,
      });
      expect(snaps).toHaveLength(0);
    });

    it("handles readdir errors gracefully", async () => {
      vi.mocked(readdir).mockRejectedValue(new Error("EACCES"));

      const snaps: any[] = [];
      for await (const snap of walkCode("/repo", "/repo", 0)) {
        snaps.push(snap);
      }

      expect(snaps).toHaveLength(0);
    });

    it("processes files in batches of 20", async () => {
      const files = Array.from({ length: 50 }, (_, i) => ({
        name: `file${i}.ts`,
        isDirectory: () => false,
        isFile: () => true,
      }));
      vi.mocked(readdir).mockResolvedValue(files as any);
      vi.mocked(stat).mockResolvedValue({ mtime: new Date() } as any);
      vi.mocked(readFile).mockResolvedValue("code");

      const snaps: any[] = [];
      for await (const snap of walkCode("/repo", "/repo", 0)) {
        snaps.push(snap);
      }

      expect(snaps).toHaveLength(50);
    });

    it("recursively walks nested directories", async () => {
      let callCount = 0;
      vi.mocked(readdir).mockImplementation((_path) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([
            {
              name: "src",
              isDirectory: () => true,
              isFile: () => false,
            },
          ] as any);
        }
        return Promise.resolve([]);
      });

      const snaps: any[] = [];
      for await (const snap of walkCode("/repo", "/repo", 0)) {
        snaps.push(snap);
      }

      expect(vi.mocked(readdir)).toHaveBeenCalledTimes(2);
    });
  });
});
