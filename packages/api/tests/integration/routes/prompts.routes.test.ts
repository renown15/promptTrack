import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { truncateAll } from "../setup.js";
import { buildTestApp, signAccessToken } from "../helpers/test-app.js";
import { prisma } from "../setup.js";

let app: FastifyInstance;
let userId: string;
let authHeader: { authorization: string };

beforeAll(async () => {
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await truncateAll();
  const user = await prisma.user.create({
    data: { email: "dev@example.com", passwordHash: "hash", name: "Dev" },
  });
  userId = user.id;
  authHeader = { authorization: `Bearer ${signAccessToken(app, userId)}` };
});

describe("GET /api/prompts", () => {
  it("requires authentication", async () => {
    const res = await app.inject({ method: "GET", url: "/api/prompts" });
    expect(res.statusCode).toBe(401);
  });

  it("returns an empty list initially", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/prompts",
      headers: authHeader,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});

describe("POST /api/prompts", () => {
  it("creates a prompt and returns 201", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/prompts",
      headers: authHeader,
      payload: {
        name: "Hello Prompt",
        content: "Hello, world!",
        role: "user",
        tags: [],
        variables: [],
        modelParameters: { temperature: 0.7, maxTokens: 500 },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("Hello Prompt");
    expect(body.slug).toBe("hello-prompt");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/prompts",
      headers: authHeader,
      payload: { name: "No content" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/prompts/:id", () => {
  it("returns 404 for unknown id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/prompts/nonexistent-id",
      headers: authHeader,
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns prompt with versions", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/prompts",
      headers: authHeader,
      payload: {
        name: "Detail Prompt",
        content: "Some content",
        role: "user",
        tags: [],
        variables: [],
        modelParameters: { temperature: 0.5, maxTokens: 100 },
      },
    });
    const { id } = create.json();

    const res = await app.inject({
      method: "GET",
      url: `/api/prompts/${id}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(id);
    expect(body.versions).toBeInstanceOf(Array);
    expect(body.versions).toHaveLength(1);
  });
});

describe("PATCH /api/prompts/:id", () => {
  it("updates the prompt name", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/prompts",
      headers: authHeader,
      payload: {
        name: "Original",
        content: "content",
        role: "user",
        tags: [],
        variables: [],
        modelParameters: { temperature: 0.5, maxTokens: 100 },
      },
    });
    const { id } = create.json();

    const res = await app.inject({
      method: "PATCH",
      url: `/api/prompts/${id}`,
      headers: authHeader,
      payload: { name: "Renamed" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Renamed");
  });
});

describe("POST /api/prompts/:id/versions", () => {
  it("creates a new version and increments version number", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/prompts",
      headers: authHeader,
      payload: {
        name: "Versioned",
        content: "v1 content",
        role: "user",
        tags: [],
        variables: [],
        modelParameters: { temperature: 0.5, maxTokens: 100 },
      },
    });
    const { id } = create.json();

    const res = await app.inject({
      method: "POST",
      url: `/api/prompts/${id}/versions`,
      headers: authHeader,
      payload: {
        content: "v2 content",
        role: "user",
        variables: [],
        modelParameters: { temperature: 0.5, maxTokens: 100 },
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().versionNumber).toBe(2);
  });
});

describe("DELETE /api/prompts/:id", () => {
  it("archives the prompt and returns 204", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/prompts",
      headers: authHeader,
      payload: {
        name: "ToDelete",
        content: "bye",
        role: "user",
        tags: [],
        variables: [],
        modelParameters: { temperature: 0.5, maxTokens: 100 },
      },
    });
    const { id } = create.json();

    const del = await app.inject({
      method: "DELETE",
      url: `/api/prompts/${id}`,
      headers: authHeader,
    });
    expect(del.statusCode).toBe(204);

    // Should no longer appear in the list
    const list = await app.inject({
      method: "GET",
      url: "/api/prompts",
      headers: authHeader,
    });
    expect(list.json().map((p: { id: string }) => p.id)).not.toContain(id);
  });
});
