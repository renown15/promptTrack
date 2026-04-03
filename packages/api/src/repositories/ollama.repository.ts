import { prisma } from "@/config/prisma.js";

export interface OllamaConfigRecord {
  id: string;
  endpoint: string;
  model: string;
  metrics: Record<string, boolean>;
  timeoutMs: number;
}

function toRecord(row: {
  id: string;
  endpoint: string;
  model: string;
  metrics: unknown;
  timeoutMs: number;
}): OllamaConfigRecord {
  return {
    id: row.id,
    endpoint: row.endpoint,
    model: row.model,
    metrics: row.metrics as Record<string, boolean>,
    timeoutMs: row.timeoutMs,
  };
}

export const ollamaRepository = {
  async get(): Promise<OllamaConfigRecord | null> {
    const row = await prisma.ollamaConfig.findFirst();
    return row ? toRecord(row) : null;
  },

  async upsert(data: {
    endpoint: string;
    model: string;
    metrics: Record<string, boolean>;
    timeoutMs: number;
  }): Promise<OllamaConfigRecord> {
    const existing = await prisma.ollamaConfig.findFirst();
    const row = existing
      ? await prisma.ollamaConfig.update({ where: { id: existing.id }, data })
      : await prisma.ollamaConfig.create({ data });
    return toRecord(row);
  },
};
