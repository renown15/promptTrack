import { apiClient } from "@/api/client";

export const collectionsAnalyticsApi = {
  getAnalytics: async (id: string, days: number = 30) => {
    const response = await apiClient.get(`/collections/${id}/analytics`, {
      params: { days },
    });
    return response.data;
  },

  getVolumeAnalytics: async (id: string, days: number = 30) => {
    const response = await apiClient.get(
      `/collections/${id}/analytics/volume`,
      { params: { days } }
    );
    return response.data;
  },

  getCoverageAnalytics: async (id: string, days: number = 30) => {
    const response = await apiClient.get(
      `/collections/${id}/analytics/coverage`,
      { params: { days } }
    );
    return response.data;
  },

  getFileCountAnalytics: async (id: string, days: number = 30) => {
    const response = await apiClient.get(
      `/collections/${id}/analytics/file-count`,
      { params: { days } }
    );
    return response.data;
  },

  getCodeMakeupAnalytics: async (id: string) => {
    const response = await apiClient.get(`/collections/${id}/analytics/makeup`);
    return response.data;
  },

  getGrowthAnalytics: async (id: string, days: number = 30) => {
    const response = await apiClient.get(
      `/collections/${id}/analytics/growth`,
      { params: { days } }
    );
    return response.data;
  },
};
