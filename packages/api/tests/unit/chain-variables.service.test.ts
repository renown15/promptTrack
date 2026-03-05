import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/repositories/chain.repository.js", () => ({
  chainRepository: { findById: vi.fn() },
}));
vi.mock("@/repositories/chain-version.repository.js", () => ({
  chainVersionRepository: { findCurrent: vi.fn() },
}));
vi.mock("@/repositories/prompt.repository.js", () => ({
  promptRepository: { findById: vi.fn() },
}));
vi.mock("@/repositories/prompt-version.repository.js", () => ({
  promptVersionRepository: { findByVersion: vi.fn() },
}));

import { chainRepository } from "@/repositories/chain.repository.js";
import { chainVersionRepository } from "@/repositories/chain-version.repository.js";
import { promptRepository } from "@/repositories/prompt.repository.js";
import { promptVersionRepository } from "@/repositories/prompt-version.repository.js";
import { chainVariablesService } from "@/services/chain-variables.service.js";
import { ChainError } from "@/services/chain.service.js";

const baseChain = {
  id: "c1",
  name: "Chain",
  slug: "chain",
  description: null,
  tags: [],
  currentVersion: 1,
  isArchived: false,
  collectionId: null,
  createdBy: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeNode = (overrides = {}) => ({
  id: "n1",
  nodeId: "node-1",
  label: null,
  refType: "link" as const,
  snapshotContent: null,
  promptVersionNumber: 1,
  positionX: 0,
  positionY: 0,
  promptId: "p1",
  chainVersionId: "cv1",
  ...overrides,
});

const basePrompt = {
  id: "p1",
  name: "P",
  slug: "p",
  description: null,
  tags: [],
  environment: "draft" as const,
  currentVersion: 1,
  isArchived: false,
  parentId: null,
  collectionId: null,
  createdBy: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("chainVariablesService.getVariables", () => {
  it("throws when chain not found", async () => {
    vi.mocked(chainRepository.findById).mockResolvedValue(null);
    await expect(chainVariablesService.getVariables("bad")).rejects.toThrow(
      ChainError
    );
  });

  it("returns empty array when no version exists", async () => {
    vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
    vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(null);
    const result = await chainVariablesService.getVariables("c1");
    expect(result).toEqual([]);
  });

  it("extracts variables from linked node live content", async () => {
    vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
    vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue({
      id: "cv1",
      versionNumber: 1,
      changelog: null,
      chainId: "c1",
      createdBy: "u1",
      createdAt: new Date(),
      nodes: [makeNode()],
      edges: [],
    });
    vi.mocked(promptRepository.findById).mockResolvedValue(basePrompt);
    vi.mocked(promptVersionRepository.findByVersion).mockResolvedValue({
      id: "pv1",
      versionNumber: 1,
      content: "Hello {{name}}, city: {{city}}",
      role: "user",
      changelog: null,
      modelParameters: {},
      promptId: "p1",
      createdBy: "u1",
      createdAt: new Date(),
      variables: [],
    });

    const result = await chainVariablesService.getVariables("c1");
    expect(result).toContain("name");
    expect(result).toContain("city");
  });

  it("extracts variables from copy node snapshotContent", async () => {
    const copyNode = makeNode({
      refType: "copy",
      snapshotContent: "Use {{token}}",
    });
    vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
    vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue({
      id: "cv1",
      versionNumber: 1,
      changelog: null,
      chainId: "c1",
      createdBy: "u1",
      createdAt: new Date(),
      nodes: [copyNode],
      edges: [],
    });

    const result = await chainVariablesService.getVariables("c1");
    expect(result).toEqual(["token"]);
  });

  it("deduplicates variables across nodes", async () => {
    const n1 = makeNode({ id: "n1", nodeId: "node-1", promptId: "p1" });
    const n2 = makeNode({
      id: "n2",
      nodeId: "node-2",
      promptId: "p2",
      refType: "copy",
      snapshotContent: "{{name}} again",
    });
    vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
    vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue({
      id: "cv1",
      versionNumber: 1,
      changelog: null,
      chainId: "c1",
      createdBy: "u1",
      createdAt: new Date(),
      nodes: [n1, n2],
      edges: [],
    });
    vi.mocked(promptRepository.findById).mockResolvedValue(basePrompt);
    vi.mocked(promptVersionRepository.findByVersion).mockResolvedValue({
      id: "pv1",
      versionNumber: 1,
      content: "{{name}}",
      role: "user",
      changelog: null,
      modelParameters: {},
      promptId: "p1",
      createdBy: "u1",
      createdAt: new Date(),
      variables: [],
    });

    const result = await chainVariablesService.getVariables("c1");
    expect(result.filter((v) => v === "name")).toHaveLength(1);
  });
});
