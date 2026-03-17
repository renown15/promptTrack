import { apiClient } from "@/api/client";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
  CollectionDTO,
  ProjectTreeDTO,
} from "@prompttrack/shared";

export interface DocFile {
  name: string;
  relativePath: string;
  lineCount: number;
  updatedAt: string;
}

export const collectionsApi = {
  list: async (): Promise<CollectionDTO[]> => {
    const response = await apiClient.get<CollectionDTO[]>("/collections");
    return response.data;
  },

  getTree: async (): Promise<ProjectTreeDTO> => {
    const response = await apiClient.get<ProjectTreeDTO>("/collections/tree");
    return response.data;
  },

  create: async (data: CreateCollectionInput): Promise<CollectionDTO> => {
    const response = await apiClient.post<CollectionDTO>("/collections", data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateCollectionInput
  ): Promise<CollectionDTO> => {
    const response = await apiClient.patch<CollectionDTO>(
      `/collections/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/collections/${id}`);
  },

  addPrompt: async (id: string, promptId: string): Promise<void> => {
    await apiClient.post(`/collections/${id}/prompts/${promptId}`);
  },

  removePrompt: async (id: string, promptId: string): Promise<void> => {
    await apiClient.delete(`/collections/${id}/prompts/${promptId}`);
  },

  addChain: async (id: string, chainId: string): Promise<void> => {
    await apiClient.post(`/collections/${id}/chains/${chainId}`);
  },

  removeChain: async (id: string, chainId: string): Promise<void> => {
    await apiClient.delete(`/collections/${id}/chains/${chainId}`);
  },

  listDocs: async (id: string): Promise<DocFile[]> => {
    const response = await apiClient.get<DocFile[]>(`/collections/${id}/docs`);
    return response.data;
  },

  getDocContent: async (id: string, file: string): Promise<string> => {
    const response = await apiClient.get<{ content: string }>(
      `/collections/${id}/docs/content`,
      { params: { file } }
    );
    return response.data.content;
  },
};
