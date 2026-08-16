import { describe, it, expect } from "vitest";
import { extractVariables } from "@/lib/templateParser";

describe("extractVariables", () => {
  it("returns empty array for content with no variables", () => {
    expect(extractVariables("Hello world")).toEqual([]);
  });

  it("extracts a single variable", () => {
    expect(extractVariables("Hello {{name}}")).toEqual(["name"]);
  });

  it("extracts multiple distinct variables", () => {
    expect(
      extractVariables("{{greeting}} {{name}}, you are {{age}} years old")
    ).toEqual(["greeting", "name", "age"]);
  });

  it("deduplicates repeated variables", () => {
    expect(extractVariables("{{name}} and {{name}} again")).toEqual(["name"]);
  });

  it("handles underscore variables", () => {
    expect(extractVariables("{{user_name}} {{user_id}}")).toEqual([
      "user_name",
      "user_id",
    ]);
  });

  it("ignores variables with uppercase letters", () => {
    expect(extractVariables("{{Name}} {{UPPER}}")).toEqual([]);
  });

  it("ignores malformed braces", () => {
    expect(extractVariables("{name} {{ name }}")).toEqual([]);
  });

  it("handles variables adjacent to other text", () => {
    expect(extractVariables("prefix{{var}}suffix")).toEqual(["var"]);
  });
});
