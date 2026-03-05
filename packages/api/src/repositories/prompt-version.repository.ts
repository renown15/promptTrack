import { prisma } from "@/config/prisma.js";
import type { PromptRole } from "@prisma/client";
import type { TemplateVariable } from "@prompttrack/shared";

export type PromptVersionRecord = {
  id: string;
  versionNumber: number;
  content: string;
  role: PromptRole;
  changelog: string | null;
  modelParameters: Record<string, unknown>;
  promptId: string;
  createdBy: string;
  createdAt: Date;
};

type CreateVersionData = {
  promptId: string;
  versionNumber: number;
  content: string;
  role: PromptRole;
  changelog?: string;
  modelParameters?: Record<string, unknown>;
  createdBy: string;
  variables?: TemplateVariable[];
};

const versionWithVariables = {
  include: { variables: true },
} as const;

export const promptVersionRepository = {
  async findByPromptId(promptId: string) {
    return prisma.promptVersion.findMany({
      where: { promptId },
      ...versionWithVariables,
      orderBy: { versionNumber: "asc" },
    });
  },

  async findByVersion(promptId: string, versionNumber: number) {
    return prisma.promptVersion.findUnique({
      where: { promptId_versionNumber: { promptId, versionNumber } },
      ...versionWithVariables,
    });
  },

  async create(data: CreateVersionData) {
    const { variables = [], ...rest } = data;
    return prisma.promptVersion.create({
      data: {
        ...rest,
        modelParameters: (rest.modelParameters ?? {}) as Record<string, string>,
        variables: {
          create: variables.map((v) => ({
            name: v.name,
            required: v.required,
            ...(v.description !== undefined && { description: v.description }),
            ...(v.defaultValue !== undefined && {
              defaultValue: v.defaultValue,
            }),
          })),
        },
      },
      ...versionWithVariables,
    });
  },
};
