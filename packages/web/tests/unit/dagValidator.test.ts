import { describe, it, expect } from "vitest";
import { wouldCreateCycle, validateDag } from "@/lib/dagValidator";

describe("wouldCreateCycle", () => {
  it("returns false for first edge in empty graph", () => {
    expect(wouldCreateCycle([], "a", "b")).toBe(false);
  });

  it("returns false for a simple chain a→b→c adding c→d", () => {
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ];
    expect(wouldCreateCycle(edges, "c", "d")).toBe(false);
  });

  it("detects direct self-loop a→a", () => {
    expect(wouldCreateCycle([], "a", "a")).toBe(true);
  });

  it("detects a cycle in a→b, b→a", () => {
    const edges = [{ source: "a", target: "b" }];
    expect(wouldCreateCycle(edges, "b", "a")).toBe(true);
  });

  it("detects a 3-node cycle a→b→c, c→a", () => {
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ];
    expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
  });

  it("returns false for a diamond DAG adding a new leaf", () => {
    const edges = [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
      { source: "b", target: "d" },
      { source: "c", target: "d" },
    ];
    expect(wouldCreateCycle(edges, "d", "e")).toBe(false);
  });

  it("detects a cycle closing a diamond: d→a", () => {
    const edges = [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
      { source: "b", target: "d" },
      { source: "c", target: "d" },
    ];
    expect(wouldCreateCycle(edges, "d", "a")).toBe(true);
  });
});

describe("validateDag", () => {
  it("returns no errors for a valid DAG", () => {
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ];
    expect(validateDag(edges)).toEqual([]);
  });

  it("returns an error for a cycle in edge list", () => {
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "c", target: "a" },
    ];
    const errors = validateDag(edges);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("cycle");
  });

  it("returns no errors for an empty edge list", () => {
    expect(validateDag([])).toEqual([]);
  });
});
