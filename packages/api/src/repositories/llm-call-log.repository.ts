import { prisma } from "@/config/prisma.js";

export interface LlmCallLogRecord {
  id: string;
  collectionId: string;
  relativePath: string;
  metric: string;
  model: string;
  startedAt: string;
  durationMs: number;
  promptChars: number;
  promptTokens: number | null;
  responseTokens: number | null;
  status: string;
  errorReason: string | null;
}

export interface InsertLlmCallLogInput {
  collectionId: string;
  relativePath: string;
  metric: string;
  model: string;
  startedAt: Date;
  durationMs: number;
  promptChars: number;
  promptTokens: number | null;
  responseTokens: number | null;
  status: string;
  errorReason: string | null;
}

function toRecord(row: {
  id: string;
  collectionId: string;
  relativePath: string;
  metric: string;
  model: string;
  startedAt: Date;
  durationMs: number;
  promptChars: number;
  promptTokens: number | null;
  responseTokens: number | null;
  status: string;
  errorReason: string | null;
}): LlmCallLogRecord {
  return { ...row, startedAt: row.startedAt.toISOString() };
}

export const llmCallLogRepository = {
  async insert(input: InsertLlmCallLogInput): Promise<void> {
    await prisma.llmCallLog.create({ data: input });
  },

  async list(collectionId: string, limit = 200): Promise<LlmCallLogRecord[]> {
    const rows = await prisma.llmCallLog.findMany({
      where: { collectionId },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  },

  async deleteAll(collectionId: string): Promise<void> {
    await prisma.llmCallLog.deleteMany({ where: { collectionId } });
  },
};
