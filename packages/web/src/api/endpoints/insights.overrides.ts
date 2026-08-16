import { apiClient } from "@/api/client";

export interface MetricOverrideDTO {
  status: string;
  comment: string;
  source: "human" | "agent";
  updatedAt: string; // maps to createdAt on the server
}

export interface FileStatusOverrideDTO {
  relativePath: string;
  metric: string;
  status: string;
  comment: string;
  source: "human" | "agent";
  createdAt: string;
  supersededAt: string | null;
  supersededBy: "file_changed" | "user_update" | "user_delete" | null;
}

export const overridesApi = {
  upsert: async (
    collectionId: string,
    relativePath: string,
    metric: string,
    status: string,
    comment: string,
    source: "human" | "agent"
  ): Promise<FileStatusOverrideDTO> => {
    const r = await apiClient.put<FileStatusOverrideDTO>(
      `/collections/${collectionId}/insights/files/override`,
      { relativePath, metric, status, comment, source }
    );
    return r.data;
  },

  delete: async (
    collectionId: string,
    relativePath: string,
    metric: string
  ): Promise<void> => {
    await apiClient.delete(
      `/collections/${collectionId}/insights/files/override`,
      { data: { relativePath, metric } }
    );
  },

  list: async (collectionId: string): Promise<FileStatusOverrideDTO[]> => {
    const r = await apiClient.get<FileStatusOverrideDTO[]>(
      `/collections/${collectionId}/insights/files/overrides`
    );
    return r.data;
  },

  history: async (
    collectionId: string,
    relativePath: string
  ): Promise<FileStatusOverrideDTO[]> => {
    const r = await apiClient.get<FileStatusOverrideDTO[]>(
      `/collections/${collectionId}/insights/files/override-history?path=${encodeURIComponent(relativePath)}`
    );
    return r.data;
  },
};
