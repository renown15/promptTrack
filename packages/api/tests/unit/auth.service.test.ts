import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/services/auth.service.js";

// Mock repositories
vi.mock("@/repositories/user.repository.js", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/repositories/refresh-token.repository.js", () => ({
  refreshTokenRepository: {
    create: vi.fn(),
    findByToken: vi.fn(),
    deleteByToken: vi.fn(),
    deleteByUserId: vi.fn(),
    deleteExpired: vi.fn(),
  },
}));

vi.mock("@/config/env.js", () => ({
  env: {
    JWT_SECRET: "test-secret-that-is-long-enough-for-testing",
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    NODE_ENV: "test",
  },
}));

vi.mock("argon2", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    verify: vi.fn().mockResolvedValue(true),
  },
}));

import { userRepository } from "@/repositories/user.repository.js";
import { refreshTokenRepository } from "@/repositories/refresh-token.repository.js";
import { buildAuthService } from "@/services/auth.service.js";

const mockFastify = {
  jwt: {
    sign: vi.fn().mockReturnValue("mock_token"),
  },
} as unknown as Parameters<typeof buildAuthService>[0];

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("throws 409 if email already exists", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: "1",
        email: "test@test.com",
        passwordHash: "hash",
        name: "Test",
        role: "editor",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const service = buildAuthService(mockFastify);
      await expect(
        service.register({
          email: "test@test.com",
          password: "pass",
          name: "Test",
        })
      ).rejects.toThrow(AuthError);
    });

    it("assigns admin role to first user", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.count).mockResolvedValue(0);
      vi.mocked(userRepository.create).mockResolvedValue({
        id: "1",
        email: "admin@test.com",
        passwordHash: "hash",
        name: "Admin",
        role: "admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(refreshTokenRepository.create).mockResolvedValue(undefined);

      const service = buildAuthService(mockFastify);
      await service.register({
        email: "admin@test.com",
        password: "password123",
        name: "Admin",
      });

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: "admin" })
      );
    });

    it("assigns editor role to subsequent users", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.count).mockResolvedValue(1);
      vi.mocked(userRepository.create).mockResolvedValue({
        id: "2",
        email: "user@test.com",
        passwordHash: "hash",
        name: "User",
        role: "editor",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(refreshTokenRepository.create).mockResolvedValue(undefined);

      const service = buildAuthService(mockFastify);
      await service.register({
        email: "user@test.com",
        password: "password123",
        name: "User",
      });

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: "editor" })
      );
    });
  });

  describe("login", () => {
    it("throws AuthError for unknown email", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      const service = buildAuthService(mockFastify);
      await expect(
        service.login({ email: "nobody@test.com", password: "pass" })
      ).rejects.toThrow(AuthError);
    });

    it("throws AuthError for wrong password", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: "1",
        email: "test@test.com",
        passwordHash: "hash",
        name: "Test",
        role: "editor",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const argon2 = await import("argon2");
      vi.mocked(argon2.default.verify).mockResolvedValueOnce(false);

      const service = buildAuthService(mockFastify);
      await expect(
        service.login({ email: "test@test.com", password: "wrongpass" })
      ).rejects.toThrow(AuthError);
    });

    it("returns tokens on successful login", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: "1",
        email: "test@test.com",
        passwordHash: "hash",
        name: "Test",
        role: "editor",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(refreshTokenRepository.create).mockResolvedValue(undefined);

      const service = buildAuthService(mockFastify);
      const result = await service.login({
        email: "test@test.com",
        password: "correct",
      });
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("throws AuthError for inactive user", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: "1",
        email: "test@test.com",
        passwordHash: "hash",
        name: "Test",
        role: "editor",
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const service = buildAuthService(mockFastify);
      await expect(
        service.login({ email: "test@test.com", password: "pass" })
      ).rejects.toThrow(AuthError);
    });
  });

  describe("refresh", () => {
    it("throws AuthError for unknown token", async () => {
      vi.mocked(refreshTokenRepository.findByToken).mockResolvedValue(null);

      const service = buildAuthService(mockFastify);
      await expect(service.refresh("bad_token")).rejects.toThrow(AuthError);
    });

    it("returns new tokens on valid refresh", async () => {
      vi.mocked(refreshTokenRepository.findByToken).mockResolvedValue({
        id: "1",
        token: "valid_token",
        userId: "u1",
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });
      vi.mocked(refreshTokenRepository.deleteByToken).mockResolvedValue(
        undefined
      );
      vi.mocked(refreshTokenRepository.create).mockResolvedValue(undefined);

      const service = buildAuthService(mockFastify);
      const result = await service.refresh("valid_token");
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("throws AuthError for expired token", async () => {
      vi.mocked(refreshTokenRepository.findByToken).mockResolvedValue({
        id: "1",
        token: "expired",
        userId: "u1",
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
      });
      vi.mocked(refreshTokenRepository.deleteByToken).mockResolvedValue(
        undefined
      );

      const service = buildAuthService(mockFastify);
      await expect(service.refresh("expired")).rejects.toThrow(AuthError);
    });
  });

  describe("logout", () => {
    it("calls deleteByToken", async () => {
      vi.mocked(refreshTokenRepository.deleteByToken).mockResolvedValue(
        undefined
      );

      const service = buildAuthService(mockFastify);
      await service.logout("some_token");

      expect(refreshTokenRepository.deleteByToken).toHaveBeenCalledWith(
        "some_token"
      );
    });
  });
});
