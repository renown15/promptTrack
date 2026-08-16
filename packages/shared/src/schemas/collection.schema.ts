import { z } from "zod";

export const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  directory: z.string().max(1000).optional(),
});

export const UpdateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  directory: z.string().max(1000).nullable().optional(),
  in_scope_directories: z.array(z.string()).optional(),
});

export const CollectionDTO = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  directory: z.string().nullable(),
  inScopeDirectories: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Tree node for sidebar
export const PromptSummaryDTO = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const ChainSummaryDTO = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  prompts: z.array(PromptSummaryDTO),
});

export const CollectionTreeItemDTO = z.object({
  id: z.string(),
  name: z.string(),
  directory: z.string().nullable(),
  prompts: z.array(PromptSummaryDTO),
  chains: z.array(ChainSummaryDTO),
});

export const ProjectTreeDTO = z.object({
  collections: z.array(CollectionTreeItemDTO),
  ungrouped: z.object({
    prompts: z.array(PromptSummaryDTO),
    chains: z.array(ChainSummaryDTO),
  }),
});

export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionSchema>;
export type CollectionDTO = z.infer<typeof CollectionDTO>;
export type ProjectTreeDTO = z.infer<typeof ProjectTreeDTO>;
export type CollectionTreeItemDTO = z.infer<typeof CollectionTreeItemDTO>;
export type PromptSummaryDTO = z.infer<typeof PromptSummaryDTO>;
export type ChainSummaryDTO = z.infer<typeof ChainSummaryDTO>;
