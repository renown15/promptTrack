import { CollectionIdParamSchema } from "@/routes/collections/collections.schemas.js";
import { analyticsService } from "@/services/analytics.service.js";
import { collectionService } from "@/services/collection.service.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const AnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

async function getExcludedDirs(id: string): Promise<string[]> {
  const collection = await collectionService.getById(id);
  return collection.inScopeDirectories ?? [];
}

export async function registerAnalyticsRoutes(fastify: FastifyInstance) {
  fastify.get("/:id/analytics", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { days } = AnalyticsQuerySchema.parse(request.query);
    const excludedDirs = await getExcludedDirs(id);
    return analyticsService.getFullAnalytics(id, days, excludedDirs);
  });
  fastify.get("/:id/analytics/volume", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { days } = AnalyticsQuerySchema.parse(request.query);
    const excludedDirs = await getExcludedDirs(id);
    const data = await analyticsService.getVolumeAnalytics(
      id,
      days,
      excludedDirs
    );
    return { data, rangeInDays: days };
  });
  fastify.get("/:id/analytics/coverage", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { days } = AnalyticsQuerySchema.parse(request.query);
    const excludedDirs = await getExcludedDirs(id);
    const data = await analyticsService.getCoverageAnalytics(
      id,
      days,
      excludedDirs
    );
    return { data, rangeInDays: days };
  });
  fastify.get("/:id/analytics/file-count", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { days } = AnalyticsQuerySchema.parse(request.query);
    const excludedDirs = await getExcludedDirs(id);
    const data = await analyticsService.getFileCountAnalytics(
      id,
      days,
      excludedDirs
    );
    return { data, rangeInDays: days };
  });
  fastify.get("/:id/analytics/makeup", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const excludedDirs = await getExcludedDirs(id);
    const data = await analyticsService.getCodeMakeupAnalytics(
      id,
      excludedDirs
    );
    return { data };
  });
  fastify.get("/:id/analytics/growth", async (request) => {
    const { id } = CollectionIdParamSchema.parse(request.params);
    const { days } = AnalyticsQuerySchema.parse(request.query);
    const excludedDirs = await getExcludedDirs(id);
    const data = await analyticsService.getGrowthAnalytics(
      id,
      days,
      excludedDirs
    );
    return { data, rangeInDays: days };
  });
}
