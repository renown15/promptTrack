import { z } from "zod";

export const ChainNodeRefTypeSchema = z.enum(["link", "copy"]);

export const ChainNodeInputSchema = z.object({
  nodeId: z.string(),
  promptId: z.string(),
  promptVersionNumber: z.number().int().positive(),
  refType: ChainNodeRefTypeSchema,
  label: z.string().optional(),
  positionX: z.number(),
  positionY: z.number(),
});

export const ChainEdgeInputSchema = z.object({
  edgeId: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  label: z.string().optional(),
});

export const CreateChainSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).default([]),
  collectionId: z.string().nullable().optional(),
});

export const UpdateChainSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).optional(),
  collectionId: z.string().nullable().optional(),
});

export const CreateChainVersionSchema = z.object({
  nodes: z.array(ChainNodeInputSchema).min(1),
  edges: z.array(ChainEdgeInputSchema).default([]),
  changelog: z.string().optional(),
});

export const SerialiseChainSchema = z.object({
  variables: z.record(z.string(), z.string()).default({}),
});

export const ChainSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  currentVersion: z.number(),
  isArchived: z.boolean(),
  collectionId: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ChainNodeInput = z.infer<typeof ChainNodeInputSchema>;
export type ChainEdgeInput = z.infer<typeof ChainEdgeInputSchema>;
export type CreateChainInput = z.infer<typeof CreateChainSchema>;
export type UpdateChainInput = z.infer<typeof UpdateChainSchema>;
export type CreateChainVersionInput = z.infer<typeof CreateChainVersionSchema>;
export type SerialiseChainInput = z.infer<typeof SerialiseChainSchema>;
export type ChainDTO = z.infer<typeof ChainSchema>;
