import { analyticsFileCountRepository } from "@/repositories/analytics-file-count.repository.js";
import { analyticsRepositoryGrowth } from "@/repositories/analytics-growth.repository.js";
import { analyticsRepository } from "@/repositories/analytics.repository.js";

export const analyticsService = {
  async getVolumeAnalytics(collectionId: string, days: number = 30) {
    return analyticsRepository.getVolumeTimeseries(collectionId, days);
  },

  async getCoverageAnalytics(collectionId: string, days: number = 30) {
    return analyticsRepository.getCoverageTimeseries(collectionId, days);
  },

  async getFileCountAnalytics(collectionId: string, days: number = 30) {
    return analyticsFileCountRepository.getFileCountTimeseries(
      collectionId,
      days
    );
  },

  async getCodeMakeupAnalytics(collectionId: string) {
    return analyticsRepositoryGrowth.getCurrentCodeMakeup(collectionId);
  },

  async getGrowthAnalytics(collectionId: string, days: number = 30) {
    return analyticsRepositoryGrowth.getGrowthMetrics(collectionId, days);
  },

  async getFullAnalytics(collectionId: string, days: number = 30) {
    const [volume, coverage, fileCount, makeup, growth] = await Promise.all([
      this.getVolumeAnalytics(collectionId, days),
      this.getCoverageAnalytics(collectionId, days),
      this.getFileCountAnalytics(collectionId, days),
      this.getCodeMakeupAnalytics(collectionId),
      this.getGrowthAnalytics(collectionId, days),
    ]);

    return {
      volume,
      coverage,
      fileCount,
      makeup,
      growth,
      rangeInDays: days,
    };
  },
};
