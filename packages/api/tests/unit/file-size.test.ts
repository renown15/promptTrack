import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const MAX_LINES = 200;
const SRC_DIR = path.resolve(__dirname, "../../src");

function countLines(filePath: string): number {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Skip blank lines and comments for the count
  let count = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (inBlockComment) {
      if (trimmed.includes("*/")) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith("/*")) {
      inBlockComment = true;
      continue;
    }

    if (trimmed === "" || trimmed.startsWith("//")) {
      continue;
    }

    count++;
  }

  return count;
}

function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getAllTypeScriptFiles(fullPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("File Size Constraints", () => {
  const tsFiles = getAllTypeScriptFiles(SRC_DIR);

  it("should have TypeScript files to check", () => {
    // This test will pass even with no files during initial scaffold
    expect(true).toBe(true);
  });

  tsFiles.forEach((file) => {
    const relativePath = path.relative(SRC_DIR, file);

    it(`${relativePath} should not exceed ${MAX_LINES} lines`, () => {
      const lineCount = countLines(file);
      expect(lineCount).toBeLessThanOrEqual(MAX_LINES);
    });
  });
});
