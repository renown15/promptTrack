import argon2 from "argon2";
import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { userRepository } from "@/repositories/user.repository.js";
import { refreshTokenRepository } from "@/repositories/refresh-token.repository.js";
import type {
  RegisterInput,
  LoginInput,
  TokenResponse,
} from "@prompttrack/shared";
import { env } from "@/config/env.js";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function parseExpiry(expiry: string): number {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  if (unit === "d") return value * 24 * 60 * 60 * 1000;
  return value * 1000;
}

export function buildAuthService(fastify: FastifyInstance) {
  async function register(input: RegisterInput): Promise<TokenResponse> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AuthError("Email already registered", 409);
    }

    const userCount = await userRepository.count();
    const role = userCount === 0 ? "admin" : "editor";

    const passwordHash = await argon2.hash(input.password);
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role,
    });

    return issueTokens(fastify, user.id);
  }

  async function login(input: LoginInput): Promise<TokenResponse> {
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new AuthError("Invalid credentials");
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new AuthError("Invalid credentials");
    }

    return issueTokens(fastify, user.id);
  }

  async function refresh(token: string): Promise<TokenResponse> {
    const stored = await refreshTokenRepository.findByToken(token);
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await refreshTokenRepository.deleteByToken(token);
      throw new AuthError("Invalid or expired refresh token");
    }

    await refreshTokenRepository.deleteByToken(token);
    return issueTokens(fastify, stored.userId);
  }

  async function logout(token: string): Promise<void> {
    await refreshTokenRepository.deleteByToken(token);
  }

  return { register, login, refresh, logout };
}

async function issueTokens(
  fastify: FastifyInstance,
  userId: string
): Promise<TokenResponse> {
  const accessToken = fastify.jwt.sign(
    { sub: userId },
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  const refreshToken = fastify.jwt.sign(
    { sub: userId, type: "refresh", jti: randomUUID() },
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );

  const expiresAt = new Date(
    Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES_IN)
  );
  await refreshTokenRepository.create({
    token: refreshToken,
    userId,
    expiresAt,
  });

  return { accessToken, refreshToken };
}
