import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ChainCycleError,
  ChainNotFoundError,
} from "@/services/chain-serialiser.service.js";

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
import { chainSerialiserService } from "@/services/chain-serialiser.service.js";

const baseChain = {
  id: "c1",
  name: "Test Chain",
  slug: "test-chain",
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

const makeVersion = (nodes = [makeNode()], edges = []) => ({
  id: "cv1",
  versionNumber: 1,
  changelog: null,
  chainId: "c1",
  createdBy: "u1",
  createdAt: new Date(),
  nodes,
  edges,
});

const basePrompt = {
  id: "p1",
  name: "Prompt",
  slug: "prompt",
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

const baseVersion = {
  id: "pv1",
  versionNumber: 1,
  content: "Hello {{name}}",
  role: "user" as const,
  changelog: null,
  modelParameters: {},
  promptId: "p1",
  createdBy: "u1",
  createdAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("chainSerialiserService.serialise", () => {
  it("throws ChainNotFoundError when chain does not exist", async () => {
    vi.mocked(chainRepository.findById).mockResolvedValue(null);
    await expect(chainSerialiserService.serialise("bad", {})).rejects.toThrow(
      ChainNotFoundError
    );
  });

  it("throws ChainNotFoundError when no version exists", async () => {
    vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
    vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(null);
    await expect(chainSerialiserService.serialise("c1", {})).rejects.toThrow(
      ChainNotFoundError
    );
  });

  it("serialises a single link node with variable substitution", async () => {
    vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
    vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(
      makeVersion()
    );
    vi.mocked(promptRepository.findById).mockResolvedValue(basePrompt);
    vi.mocked(promptVersionRepository.findByVersion).mockResolvedValue(
      baseVersion
    );

    const result = await chainSerialiserService.serialise("c1", {
      name: "Alice",
    });
    expect(result.messages).toEqual([{ role: "user", content: "Hello Alice" }]);
    expect(result.unresolvedVariables).toEqual([]);
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("reports unresolved variables without throwing", async () => {
    vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
    vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(
      makeVersion()
    );
    vi.mocked(promptRepository.findById).mockResolvedValue(basePrompt);
    vi.mocked(promptVersionRepository.findByVersion).mockResolvedValue(
      baseVersion
    );

    const result = await chainSerialiserService.serialise("c1", {});
    expect(result.unresolvedVariables).toEqual(["name"]);
    expect(result.messages[0].content).toContain("{{name}}");
  });

  it("uses snapshotContent for copy nodes", async () => {
    const copyNode = makeNode({
      refType: "copy",
      snapshotContent: "Snapshot {{x}}",
    });
    vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
    vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(
      makeVersion([copyNode])
    );
    vi.mocked(promptVersionRepository.findByVersion).mockResolvedValue(
      baseVersion
    );

    const result = await chainSerialiserService.serialise("c1", { x: "done" });
    expect(result.messages[0].content).toBe("Snapshot done");
  });

  it("throws ChainCycleError for a cyclic graph", async () => {
    const n1 = makeNode({ id: "n1", nodeId: "node-1" });
    const n2 = makeNode({ id: "n2", nodeId: "node-2" });
    const cyclicEdges = [
      {
        id: "e1",
        edgeId: "e1",
        label: null,
        sourceNodeId: "n1",
        targetNodeId: "n2",
        chainVersionId: "cv1",
      },
      {
        id: "e2",
        edgeId: "e2",
        label: null,
        sourceNodeId: "n2",
        targetNodeId: "n1",
        chainVersionId: "cv1",
      },
    ];
    vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
    vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(
      makeVersion([n1, n2], cyclicEdges)
    );

    await expect(chainSerialiserService.serialise("c1", {})).rejects.toThrow(
      ChainCycleError
    );
  });

  it("serialises nodes in topological order", async () => {
    const n1 = makeNode({ id: "n1", nodeId: "node-1" });
    const n2 = makeNode({ id: "n2", nodeId: "node-2", promptId: "p2" });
    const edge = [
      {
        id: "e1",
        edgeId: "e1",
        label: null,
        sourceNodeId: "n1",
        targetNodeId: "n2",
        chainVersionId: "cv1",
      },
    ];
    vi.mocked(chainRepository.findById).mockResolvedValue(baseChain);
    vi.mocked(chainVersionRepository.findCurrent).mockResolvedValue(
      makeVersion([n1, n2], edge)
    );
    vi.mocked(promptRepository.findById).mockResolvedValue(basePrompt);
    vi.mocked(promptVersionRepository.findByVersion).mockResolvedValue({
      ...baseVersion,
      content: "step",
    });

    const result = await chainSerialiserService.serialise("c1", {});
    expect(result.messages).toHaveLength(2);
  });
});
