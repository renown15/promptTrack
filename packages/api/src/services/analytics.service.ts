import { analyticsFileCountRepository } from "@/repositories/analytics-file-count.repository.js";
import { analyticsRepositoryGrowth } from "@/repositories/analytics-growth.repository.js";
import { analyticsRepository } from "@/repositories/analytics.repository.js";

export const analyticsService = {
  async getVolumeAnalytics(
    collectionId: string,
    days: number = 30,
    excludedDirs: string[] = []
  ) {
    return analyticsRepository.getVolumeTimeseries(
      collectionId,
      days,
      excludedDirs
    );
  },

  async getCoverageAnalytics(
    collectionId: string,
    days: number = 30,
    excludedDirs: string[] = []
  ) {
    return analyticsRepository.getCoverageTimeseries(
      collectionId,
      days,
      excludedDirs
    );
  },

  async getFileCountAnalytics(
    collectionId: string,
    days: number = 30,
    excludedDirs: string[] = []
  ) {
    return analyticsFileCountRepository.getFileCountTimeseries(
      collectionId,
      days,
      excludedDirs
    );
  },

  async getCodeMakeupAnalytics(
    collectionId: string,
    excludedDirs: string[] = []
  ) {
    return analyticsRepositoryGrowth.getCurrentCodeMakeup(
      collectionId,
      excludedDirs
    );
  },

  async getGrowthAnalytics(
    collectionId: string,
    days: number = 30,
    excludedDirs: string[] = []
  ) {
    return analyticsRepositoryGrowth.getGrowthMetrics(
      collectionId,
      days,
      excludedDirs
    );
  },

  async getFullAnalytics(
    collectionId: string,
    days: number = 30,
    excludedDirs: string[] = []
  ) {
    const [volume, coverage, fileCount, makeup, growth] = await Promise.all([
      this.getVolumeAnalytics(collectionId, days, excludedDirs),
      this.getCoverageAnalytics(collectionId, days, excludedDirs),
      this.getFileCountAnalytics(collectionId, days, excludedDirs),
      this.getCodeMakeupAnalytics(collectionId, excludedDirs),
      this.getGrowthAnalytics(collectionId, days, excludedDirs),
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
