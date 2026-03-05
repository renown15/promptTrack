import { z } from "zod";

export const PromptRoleSchema = z.enum(["system", "user", "assistant"]);
export const EnvironmentSchema = z.enum([
  "draft",
  "review",
  "staging",
  "production",
]);

export const TemplateVariableSchema = z.object({
  name: z.string().regex(/^[a-z_][a-z0-9_]*$/),
  description: z.string().optional(),
  required: z.boolean().default(true),
  defaultValue: z.string().optional(),
});

export const ModelParametersSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(1000),
  topP: z.number().min(0).max(1).optional(),
});

export const CreatePromptSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).default([]),
  parentId: z.string().nullable().optional(),
  collectionId: z.string().nullable().optional(),
  content: z.string().min(1),
  role: PromptRoleSchema.default("user"),
  variables: z.array(TemplateVariableSchema).default([]),
  modelParameters: ModelParametersSchema.default({}),
});

export const UpdatePromptSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).optional(),
  collectionId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export const CreatePromptVersionSchema = z.object({
  content: z.string().min(1),
  role: PromptRoleSchema.default("user"),
  variables: z.array(TemplateVariableSchema).default([]),
  modelParameters: ModelParametersSchema.default({}),
  changelog: z.string().optional(),
});

export const PromptVersionSchema = z.object({
  id: z.string(),
  versionNumber: z.number(),
  content: z.string(),
  role: PromptRoleSchema,
  changelog: z.string().nullable(),
  modelParameters: z.record(z.unknown()),
  variables: z.array(TemplateVariableSchema),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
});

export const PromptSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  environment: EnvironmentSchema,
  currentVersion: z.number(),
  isArchived: z.boolean(),
  parentId: z.string().nullable(),
  collectionId: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PromptWithVersionsSchema = PromptSchema.extend({
  versions: z.array(PromptVersionSchema),
});

export type TemplateVariable = z.infer<typeof TemplateVariableSchema>;
export type CreatePromptInput = z.infer<typeof CreatePromptSchema>;
export type UpdatePromptInput = z.infer<typeof UpdatePromptSchema>;
export type CreatePromptVersionInput = z.infer<
  typeof CreatePromptVersionSchema
>;
export type PromptDTO = z.infer<typeof PromptSchema>;
export type PromptWithVersionsDTO = z.infer<typeof PromptWithVersionsSchema>;
