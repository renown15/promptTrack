import { prisma } from "@/config/prisma.js";
import type { ChainNodeRefType } from "@prisma/client";

export type ChainNodeRecord = {
  id: string;
  nodeId: string;
  label: string | null;
  refType: ChainNodeRefType;
  snapshotContent: string | null;
  promptVersionNumber: number;
  positionX: number;
  positionY: number;
  promptId: string;
  chainVersionId: string;
};

export type ChainEdgeRecord = {
  id: string;
  edgeId: string;
  label: string | null;
  sourceNodeId: string;
  targetNodeId: string;
  chainVersionId: string;
};

export type ChainVersionWithGraphRecord = {
  id: string;
  versionNumber: number;
  changelog: string | null;
  chainId: string;
  createdBy: string;
  createdAt: Date;
  nodes: ChainNodeRecord[];
  edges: ChainEdgeRecord[];
};

type CreateNodeData = {
  nodeId: string;
  promptId: string;
  promptVersionNumber: number;
  refType: ChainNodeRefType;
  label?: string;
  positionX: number;
  positionY: number;
  snapshotContent?: string | null;
};

type CreateEdgeData = {
  edgeId: string;
  sourceNodeId: string; // client nodeId (resolved to DB id by this repo)
  targetNodeId: string;
  label?: string;
};

type CreateChainVersionData = {
  chainId: string;
  versionNumber: number;
  createdBy: string;
  changelog?: string;
  nodes: CreateNodeData[];
  edges: CreateEdgeData[];
};

const withGraph = { include: { nodes: true, edges: true } } as const;

export const chainVersionRepository = {
  async findCurrent(
    chainId: string
  ): Promise<ChainVersionWithGraphRecord | null> {
    return prisma.chainVersion.findFirst({
      where: { chainId },
      orderBy: { versionNumber: "desc" },
      ...withGraph,
    });
  },

  async create(
    data: CreateChainVersionData
  ): Promise<ChainVersionWithGraphRecord> {
    return prisma.$transaction(async (tx) => {
      const version = await tx.chainVersion.create({
        data: {
          chainId: data.chainId,
          versionNumber: data.versionNumber,
          createdBy: data.createdBy,
          changelog: data.changelog ?? null,
          nodes: { create: data.nodes },
        },
        include: { nodes: true },
      });

      const nodeIdMap = new Map(version.nodes.map((n) => [n.nodeId, n.id]));

      if (data.edges.length > 0) {
        await tx.chainEdge.createMany({
          data: data.edges.map((e) => ({
            edgeId: e.edgeId,
            chainVersionId: version.id,
            sourceNodeId: nodeIdMap.get(e.sourceNodeId)!,
            targetNodeId: nodeIdMap.get(e.targetNodeId)!,
            label: e.label ?? null,
          })),
        });
      }

      return tx.chainVersion.findUniqueOrThrow({
        where: { id: version.id },
        ...withGraph,
      });
    });
  },
};
