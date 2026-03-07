import { z } from "zod";
import {
  CreateCollectionSchema,
  UpdateCollectionSchema,
} from "@prompttrack/shared";

export { CreateCollectionSchema, UpdateCollectionSchema };

export const CollectionIdParamSchema = z.object({ id: z.string() });

export const CollectionPromptParamSchema = z.object({
  id: z.string(),
  promptId: z.string(),
});

export const CollectionChainParamSchema = z.object({
  id: z.string(),
  chainId: z.string(),
});
