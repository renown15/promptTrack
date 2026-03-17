import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { truncateAll } from "../setup.js";
import { buildTestApp } from "../helpers/test-app.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await truncateAll();
});

const registerBody = {
  email: "alice@example.com",
  password: "password1234",
  name: "Alice",
};

describe("POST /api/auth/register", () => {
  it("creates a user and returns tokens", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: registerBody,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it("returns 409 for duplicate email", async () => {
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: registerBody,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: registerBody,
    });

    expect(res.statusCode).toBe(409);
  });

  it("returns 400 for invalid payload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "not-an-email" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: registerBody,
    });
  });

  it("returns tokens for valid credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: registerBody.email, password: registerBody.password },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it("returns 401 for wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: registerBody.email, password: "wrongpassword" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "nobody@example.com", password: "any" },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/auth/refresh", () => {
  it("issues new tokens from a valid refresh token", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: registerBody,
    });
    const { refreshToken } = regRes.json();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeDefined();
  });

  it("returns 401 for an invalid refresh token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken: "not-a-real-token" },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("requires authentication", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      payload: { refreshToken: "any" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("logs out with valid access token", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: registerBody,
    });
    const { accessToken, refreshToken } = regRes.json();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { refreshToken },
    });

    expect(res.statusCode).toBe(204);
  });
});
