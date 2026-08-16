import { collectionsApi } from "@/api/endpoints/collections";
import { useQuery } from "@tanstack/react-query";

export function useAnalytics(collectionId: string, days: number = 30) {
  return useQuery({
    queryKey: ["collections", collectionId, "analytics", days],
    queryFn: () => collectionsApi.getAnalytics(collectionId, days),
  });
}

export function useVolumeAnalytics(collectionId: string, days: number = 30) {
  return useQuery({
    queryKey: ["collections", collectionId, "analytics", "volume", days],
    queryFn: () => collectionsApi.getVolumeAnalytics(collectionId, days),
  });
}

export function useCoverageAnalytics(collectionId: string, days: number = 30) {
  return useQuery({
    queryKey: ["collections", collectionId, "analytics", "coverage", days],
    queryFn: () => collectionsApi.getCoverageAnalytics(collectionId, days),
  });
}

export function useFileCountAnalytics(collectionId: string, days: number = 30) {
  return useQuery({
    queryKey: ["collections", collectionId, "analytics", "file-count", days],
    queryFn: () => collectionsApi.getFileCountAnalytics(collectionId, days),
  });
}

export function useCodeMakeupAnalytics(collectionId: string) {
  return useQuery({
    queryKey: ["collections", collectionId, "analytics", "makeup"],
    queryFn: () => collectionsApi.getCodeMakeupAnalytics(collectionId),
  });
}

export function useGrowthAnalytics(collectionId: string, days: number = 30) {
  return useQuery({
    queryKey: ["collections", collectionId, "analytics", "growth", days],
    queryFn: () => collectionsApi.getGrowthAnalytics(collectionId, days),
  });
}
