import { z } from "zod";
import {
  CreateChainSchema,
  UpdateChainSchema,
  CreateChainVersionSchema,
  SerialiseChainSchema,
} from "@prompttrack/shared";

export {
  CreateChainSchema,
  UpdateChainSchema,
  CreateChainVersionSchema,
  SerialiseChainSchema,
};

export const ChainIdParamSchema = z.object({ id: z.string() });

export const ChainListQuerySchema = z.object({
  isArchived: z.coerce.boolean().optional(),
});
