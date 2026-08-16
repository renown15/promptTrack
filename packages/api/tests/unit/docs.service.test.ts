import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));

import { readdir, readFile, stat } from "fs/promises";
import { docsService } from "@/services/docs.service.js";
import type { Dirent, Stats } from "fs";

const mockReaddir = vi.mocked(readdir);
const mockReadFile = vi.mocked(readFile);
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

describe("docsService.list", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns empty array when directory is empty", async () => {
    mockReaddir.mockResolvedValue([] as never);
    const result = await docsService.list("/project");
    expect(result).toEqual([]);
  });

  it("returns empty array when readdir throws", async () => {
    mockReaddir.mockRejectedValue(new Error("ENOENT"));
    const result = await docsService.list("/nonexistent");
    expect(result).toEqual([]);
  });

  it("finds markdown files in root directory", async () => {
    mockReaddir.mockResolvedValue([makeDirent("README.md", false)] as never);
    mockReadFile.mockResolvedValue("# Hello\nworld\n" as never);
    mockStat.mockResolvedValue(makeStats(new Date("2024-01-01")) as never);

    const result = await docsService.list("/project");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("README.md");
    expect(result[0].relativePath).toBe("README.md");
    expect(result[0].lineCount).toBe(3);
  });

  it("skips non-markdown files", async () => {
    mockReaddir.mockResolvedValue([
      makeDirent("index.ts", false),
      makeDirent("notes.md", false),
    ] as never);
    mockReadFile.mockResolvedValue("some content\n" as never);
    mockStat.mockResolvedValue(makeStats(new Date()) as never);

    const result = await docsService.list("/project");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("notes.md");
  });

  it("skips node_modules directory", async () => {
    mockReaddir
      .mockResolvedValueOnce([makeDirent("node_modules", true)] as never)
      .mockResolvedValue([] as never);

    const result = await docsService.list("/project");
    expect(result).toEqual([]);
    expect(mockReaddir).toHaveBeenCalledTimes(1); // did not recurse into node_modules
  });

  it("recurses into non-skipped subdirectories", async () => {
    mockReaddir
      .mockResolvedValueOnce([makeDirent("docs", true)] as never)
      .mockResolvedValueOnce([makeDirent("guide.md", false)] as never);

    mockReadFile.mockResolvedValue("content\n" as never);
    mockStat.mockResolvedValue(makeStats(new Date("2024-06-01")) as never);

    const result = await docsService.list("/project");
    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe("docs/guide.md");
  });

  it("returns files sorted alphabetically by relativePath", async () => {
    mockReaddir.mockResolvedValueOnce([
      makeDirent("z-last.md", false),
      makeDirent("a-first.md", false),
    ] as never);

    mockReadFile.mockResolvedValue("line\n" as never);
    mockStat.mockResolvedValue(makeStats(new Date()) as never);

    const result = await docsService.list("/project");
    expect(result[0].name).toBe("a-first.md");
    expect(result[1].name).toBe("z-last.md");
  });

  it("skips .git and dist directories", async () => {
    mockReaddir.mockResolvedValueOnce([
      makeDirent(".git", true),
      makeDirent("dist", true),
    ] as never);

    const result = await docsService.list("/project");
    expect(result).toEqual([]);
    expect(mockReaddir).toHaveBeenCalledTimes(1);
  });
});

describe("docsService.content", () => {
  beforeEach(() => vi.resetAllMocks());

  it("reads and returns file content", async () => {
    mockReadFile.mockResolvedValue("# My Doc\nHello world\n" as never);
    const result = await docsService.content("/project", "README.md");
    expect(result).toBe("# My Doc\nHello world\n");
  });

  it("throws when path traverses outside directory", async () => {
    await expect(
      docsService.content("/project", "../../../etc/passwd")
    ).rejects.toThrow("Forbidden");
  });

  it("reads nested file paths", async () => {
    mockReadFile.mockResolvedValue("nested content" as never);
    const result = await docsService.content("/project", "docs/guide.md");
    expect(result).toBe("nested content");
  });
});
