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
});

export const UpdateChainSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).optional(),
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
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ChainNodeDTOSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  label: z.string().nullable(),
  refType: ChainNodeRefTypeSchema,
  snapshotContent: z.string().nullable(),
  promptVersionNumber: z.number(),
  positionX: z.number(),
  positionY: z.number(),
  promptId: z.string(),
  chainVersionId: z.string(),
});

export const ChainEdgeDTOSchema = z.object({
  id: z.string(),
  edgeId: z.string(),
  label: z.string().nullable(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  chainVersionId: z.string(),
});

export const ChainVersionDTOSchema = z.object({
  id: z.string(),
  versionNumber: z.number(),
  changelog: z.string().nullable(),
  chainId: z.string(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  nodes: z.array(ChainNodeDTOSchema),
  edges: z.array(ChainEdgeDTOSchema),
});

export const ChainWithVersionSchema = ChainSchema.extend({
  currentVersionData: ChainVersionDTOSchema.nullable(),
});

export const SerialiserOutputSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  contextString: z.string(),
  tokenEstimate: z.number(),
  unresolvedVariables: z.array(z.string()),
});

export const ChainVariablesSchema = z.object({
  variables: z.array(z.string()),
});

export type ChainNodeInput = z.infer<typeof ChainNodeInputSchema>;
export type ChainEdgeInput = z.infer<typeof ChainEdgeInputSchema>;
export type CreateChainInput = z.infer<typeof CreateChainSchema>;
export type UpdateChainInput = z.infer<typeof UpdateChainSchema>;
export type CreateChainVersionInput = z.infer<typeof CreateChainVersionSchema>;
export type SerialiseChainInput = z.infer<typeof SerialiseChainSchema>;
export type ChainDTO = z.infer<typeof ChainSchema>;
export type ChainNodeDTO = z.infer<typeof ChainNodeDTOSchema>;
export type ChainEdgeDTO = z.infer<typeof ChainEdgeDTOSchema>;
export type ChainVersionDTO = z.infer<typeof ChainVersionDTOSchema>;
export type ChainWithVersionDTO = z.infer<typeof ChainWithVersionSchema>;
export type SerialiserOutput = z.infer<typeof SerialiserOutputSchema>;
export type ChainVariables = z.infer<typeof ChainVariablesSchema>;
