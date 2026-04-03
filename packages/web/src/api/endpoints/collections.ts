import { apiClient } from "@/api/client";
import type {
  CollectionDTO,
  CreateCollectionInput,
  ProjectTreeDTO,
  UpdateCollectionInput,
} from "@prompttrack/shared";

export interface DocFile {
  name: string;
  relativePath: string;
  lineCount: number;
  updatedAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  collectionId: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreatedApiKey extends ApiKeyRecord {
  key: string;
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

  listApiKeys: async (id: string): Promise<ApiKeyRecord[]> => {
    const response = await apiClient.get<ApiKeyRecord[]>(
      `/collections/${id}/api-keys`
    );
    return response.data;
  },

  createApiKey: async (id: string, name: string): Promise<CreatedApiKey> => {
    const response = await apiClient.post<CreatedApiKey>(
      `/collections/${id}/api-keys`,
      { name }
    );
    return response.data;
  },

  revokeApiKey: async (id: string, keyId: string): Promise<void> => {
    await apiClient.delete(`/collections/${id}/api-keys/${keyId}`);
  },

  getFullApiKey: async (
    id: string,
    keyId: string
  ): Promise<{ key: string }> => {
    const response = await apiClient.get<{ key: string }>(
      `/collections/${id}/api-keys/${keyId}/key`
    );
    return response.data;
  },
};
