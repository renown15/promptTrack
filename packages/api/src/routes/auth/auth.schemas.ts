import { z } from "zod";
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
} from "@prompttrack/shared";

export { RegisterSchema, LoginSchema, RefreshSchema };

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const LogoutBodySchema = z.object({
  refreshToken: z.string().min(1),
});
