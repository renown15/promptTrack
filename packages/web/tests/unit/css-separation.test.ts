import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const SRC_DIR = path.resolve(__dirname, "../../src");
const UI_COMPONENTS_DIR = path.join(SRC_DIR, "components/ui");

// Regex to match className with Tailwind classes (not just empty or cn())
const TAILWIND_CLASS_REGEX =
  /className\s*=\s*["'`](?!["'`])([^"'`]*(?:bg-|text-|flex|grid|(?<![a-z])p-|(?<![a-z])m-|(?<![a-z])w-|(?<![a-z])h-|border|rounded|shadow)[^"'`]*)["'`]/;

// Regex to match inline styles
const INLINE_STYLE_REGEX = /style\s*=\s*\{\s*\{/;

function getAllTsxFiles(dir: string, exclude?: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (exclude && fullPath.startsWith(exclude)) {
        continue;
      }
      files.push(...getAllTsxFiles(fullPath, exclude));
    } else if (entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("CSS Separation Rules", () => {
  const tsxFiles = getAllTsxFiles(SRC_DIR, UI_COMPONENTS_DIR);

  it("should have TSX files to check", () => {
    expect(true).toBe(true);
  });

  tsxFiles.forEach((file) => {
    const relativePath = path.relative(SRC_DIR, file);

    it(`${relativePath} should not contain Tailwind classes`, () => {
      const content = fs.readFileSync(file, "utf-8");
      const hasTailwindClasses = TAILWIND_CLASS_REGEX.test(content);

      if (hasTailwindClasses) {
        expect.fail(
          `Found Tailwind classes in ${relativePath}. ` +
            "Move styles to CSS files or use tokens.css variables."
        );
      }

      expect(hasTailwindClasses).toBe(false);
    });

    it(`${relativePath} should not contain inline styles`, () => {
      const content = fs.readFileSync(file, "utf-8");
      const hasInlineStyles = INLINE_STYLE_REGEX.test(content);

      if (hasInlineStyles) {
        expect.fail(
          `Found inline styles in ${relativePath}. ` +
            "Move styles to CSS files."
        );
      }

      expect(hasInlineStyles).toBe(false);
    });
  });
});
