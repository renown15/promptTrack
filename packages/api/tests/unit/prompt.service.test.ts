import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptError } from "@/services/prompt.service.js";

vi.mock("@/repositories/prompt.repository.js", () => ({
  promptRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    incrementVersion: vi.fn(),
    archive: vi.fn(),
  },
}));

vi.mock("@/repositories/prompt-version.repository.js", () => ({
  promptVersionRepository: {
    findByPromptId: vi.fn(),
    findByVersion: vi.fn(),
    create: vi.fn(),
  },
}));

import { promptRepository } from "@/repositories/prompt.repository.js";
import { promptVersionRepository } from "@/repositories/prompt-version.repository.js";
import { promptService } from "@/services/prompt.service.js";

const basePrompt = {
  id: "p1",
  name: "Test Prompt",
  slug: "test-prompt",
  description: null,
  tags: [],
  environment: "draft" as const,
  currentVersion: 1,
  isArchived: false,
  parentId: null,
  collectionId: null,
  createdBy: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("promptService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getById", () => {
    it("throws 404 when prompt not found", async () => {
      vi.mocked(promptRepository.findById).mockResolvedValue(null);
      await expect(promptService.getById("bad-id")).rejects.toThrow(
        PromptError
      );
    });

    it("returns prompt with versions", async () => {
      vi.mocked(promptRepository.findById).mockResolvedValue(basePrompt);
      vi.mocked(promptVersionRepository.findByPromptId).mockResolvedValue([]);

      const result = await promptService.getById("p1");
      expect(result.versions).toEqual([]);
    });
  });

  describe("create", () => {
    it("generates a unique slug from name", async () => {
      vi.mocked(promptRepository.findBySlug).mockResolvedValue(null);
      vi.mocked(promptRepository.create).mockResolvedValue(basePrompt);
      vi.mocked(promptVersionRepository.create).mockResolvedValue({
        id: "pv1",
        versionNumber: 1,
        content: "Hello",
        role: "user",
        changelog: null,
        modelParameters: {},
        promptId: "p1",
        createdBy: "u1",
        createdAt: new Date(),
        variables: [],
      });
      vi.mocked(promptRepository.findById).mockResolvedValue(basePrompt);
      vi.mocked(promptVersionRepository.findByPromptId).mockResolvedValue([]);

      await promptService.create("u1", {
        name: "My Prompt",
        content: "Hello",
        tags: [],
        role: "user",
        variables: [],
        modelParameters: { temperature: 0.7, maxTokens: 1000 },
      });

      expect(promptRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "my-prompt" })
      );
    });

    it("appends suffix for duplicate slugs", async () => {
      vi.mocked(promptRepository.findBySlug)
        .mockResolvedValueOnce(basePrompt)
        .mockResolvedValue(null);
      vi.mocked(promptRepository.create).mockResolvedValue(basePrompt);
      vi.mocked(promptVersionRepository.create).mockResolvedValue({
        id: "pv1",
        versionNumber: 1,
        content: "Hello",
        role: "user",
        changelog: null,
        modelParameters: {},
        promptId: "p1",
        createdBy: "u1",
        createdAt: new Date(),
        variables: [],
      });
      vi.mocked(promptRepository.findById).mockResolvedValue(basePrompt);
      vi.mocked(promptVersionRepository.findByPromptId).mockResolvedValue([]);

      await promptService.create("u1", {
        name: "Test Prompt",
        content: "Hello",
        tags: [],
        role: "user",
        variables: [],
        modelParameters: { temperature: 0.7, maxTokens: 1000 },
      });

      expect(promptRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "test-prompt-1" })
      );
    });
  });

  describe("update", () => {
    it("throws 404 when prompt not found", async () => {
      vi.mocked(promptRepository.findById).mockResolvedValue(null);
      await expect(promptService.update("bad", {})).rejects.toThrow(
        PromptError
      );
    });

    it("throws when prompt is archived", async () => {
      vi.mocked(promptRepository.findById).mockResolvedValue({
        ...basePrompt,
        isArchived: true,
      });
      await expect(promptService.update("p1", { name: "New" })).rejects.toThrow(
        PromptError
      );
    });
  });

  describe("archive", () => {
    it("throws 404 when prompt not found", async () => {
      vi.mocked(promptRepository.findById).mockResolvedValue(null);
      await expect(promptService.archive("bad")).rejects.toThrow(PromptError);
    });

    it("calls archive on repository", async () => {
      vi.mocked(promptRepository.findById).mockResolvedValue(basePrompt);
      vi.mocked(promptRepository.archive).mockResolvedValue({
        ...basePrompt,
        isArchived: true,
      });
      await promptService.archive("p1");
      expect(promptRepository.archive).toHaveBeenCalledWith("p1");
    });
  });

  describe("createVersion", () => {
    it("increments currentVersion", async () => {
      vi.mocked(promptRepository.findById).mockResolvedValue(basePrompt);
      vi.mocked(promptVersionRepository.create).mockResolvedValue({
        id: "pv2",
        versionNumber: 2,
        content: "v2",
        role: "user",
        changelog: null,
        modelParameters: {},
        promptId: "p1",
        createdBy: "u1",
        createdAt: new Date(),
        variables: [],
      });
      vi.mocked(promptRepository.incrementVersion).mockResolvedValue({
        ...basePrompt,
        currentVersion: 2,
      });

      await promptService.createVersion("p1", "u1", {
        content: "v2",
        role: "user",
        variables: [],
        modelParameters: { temperature: 0.7, maxTokens: 1000 },
      });

      expect(promptRepository.incrementVersion).toHaveBeenCalledWith("p1");
    });
  });
});
