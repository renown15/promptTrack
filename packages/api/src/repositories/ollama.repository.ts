import { prisma } from "@/config/prisma.js";

export interface OllamaConfigRecord {
  id: string;
  endpoint: string;
  model: string;
  metrics: Record<string, boolean>;
}

export const ollamaRepository = {
  async get(): Promise<OllamaConfigRecord | null> {
    const row = await prisma.ollamaConfig.findFirst();
    if (!row) return null;
    return {
      id: row.id,
      endpoint: row.endpoint,
      model: row.model,
      metrics: row.metrics as Record<string, boolean>,
    };
  },

  async upsert(data: {
    endpoint: string;
    model: string;
    metrics: Record<string, boolean>;
  }): Promise<OllamaConfigRecord> {
    const existing = await prisma.ollamaConfig.findFirst();
    const row = existing
      ? await prisma.ollamaConfig.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.ollamaConfig.create({ data });
    return {
      id: row.id,
      endpoint: row.endpoint,
      model: row.model,
      metrics: row.metrics as Record<string, boolean>,
    };
  },
};
