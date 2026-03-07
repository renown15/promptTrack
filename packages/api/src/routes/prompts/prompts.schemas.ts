import { z } from "zod";
import {
  CreatePromptSchema,
  UpdatePromptSchema,
  CreatePromptVersionSchema,
} from "@prompttrack/shared";

export { CreatePromptSchema, UpdatePromptSchema, CreatePromptVersionSchema };

export const PromptIdParamSchema = z.object({ id: z.string() });

export const PromptListQuerySchema = z.object({
  environment: z.enum(["draft", "review", "staging", "production"]).optional(),
  isArchived: z.coerce.boolean().optional(),
});
