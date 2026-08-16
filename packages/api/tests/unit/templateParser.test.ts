import { describe, it, expect } from "vitest";
import { extractVariables, substituteVariables } from "@/lib/templateParser.js";

describe("extractVariables", () => {
  it("returns empty array for content with no variables", () => {
    expect(extractVariables("Hello world")).toEqual([]);
  });

  it("extracts a single variable", () => {
    expect(extractVariables("Hello {{name}}")).toEqual(["name"]);
  });

  it("extracts multiple variables", () => {
    expect(extractVariables("{{greeting}} {{name}}, today is {{day}}")).toEqual(
      ["greeting", "name", "day"]
    );
  });

  it("deduplicates repeated variables", () => {
    expect(extractVariables("{{x}} and {{x}} again")).toEqual(["x"]);
  });

  it("supports underscores and numbers", () => {
    expect(extractVariables("{{user_name}} {{item2}}")).toEqual([
      "user_name",
      "item2",
    ]);
  });

  it("ignores invalid variable syntax", () => {
    expect(extractVariables("{{ spaces }} {{UPPER}} {{1invalid}}")).toEqual([]);
  });
});

describe("substituteVariables", () => {
  it("substitutes all provided variables", () => {
    const { result, unresolved } = substituteVariables(
      "Hello {{name}}, you are {{age}}",
      { name: "Alice", age: "30" }
    );
    expect(result).toBe("Hello Alice, you are 30");
    expect(unresolved).toEqual([]);
  });

  it("leaves unresolved variables in place and reports them", () => {
    const { result, unresolved } = substituteVariables(
      "Hello {{name}}, city: {{city}}",
      { name: "Bob" }
    );
    expect(result).toBe("Hello Bob, city: {{city}}");
    expect(unresolved).toEqual(["city"]);
  });

  it("returns original content unchanged when no variables match", () => {
    const content = "No variables here";
    const { result, unresolved } = substituteVariables(content, {
      unused: "x",
    });
    expect(result).toBe(content);
    expect(unresolved).toEqual([]);
  });

  it("deduplicates unresolved variable names", () => {
    const { unresolved } = substituteVariables("{{x}} and {{x}}", {});
    expect(unresolved).toEqual(["x"]);
  });
});
