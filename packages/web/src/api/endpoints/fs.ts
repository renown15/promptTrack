import { apiClient } from "@/api/client";

export interface FsEntry {
  name: string;
  path: string;
}

export interface FsResponse {
  path: string;
  parent: string | null;
  entries: FsEntry[];
}

export const fsApi = {
  browse: async (path?: string): Promise<FsResponse> => {
    const params = path ? { path } : {};
    const response = await apiClient.get<FsResponse>("/fs", { params });
    return response.data;
  },
};
