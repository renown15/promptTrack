import { apiClient } from "@/api/client";
import type {
  CreatePromptInput,
  UpdatePromptInput,
  CreatePromptVersionInput,
  PromptWithVersionsDTO,
  PromptDTO,
  ChainDTO,
} from "@prompttrack/shared";

export const promptsApi = {
  list: async (params?: {
    environment?: string;
    isArchived?: boolean;
    collectionId?: string;
  }): Promise<PromptDTO[]> => {
    const response = await apiClient.get<PromptDTO[]>("/prompts", { params });
    return response.data;
  },

  getById: async (id: string): Promise<PromptWithVersionsDTO> => {
    const response = await apiClient.get<PromptWithVersionsDTO>(
      `/prompts/${id}`
    );
    return response.data;
  },

  create: async (data: CreatePromptInput): Promise<PromptWithVersionsDTO> => {
    const response = await apiClient.post<PromptWithVersionsDTO>(
      "/prompts",
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdatePromptInput): Promise<PromptDTO> => {
    const response = await apiClient.patch<PromptDTO>(`/prompts/${id}`, data);
    return response.data;
  },

  createVersion: async (
    id: string,
    data: CreatePromptVersionInput
  ): Promise<PromptWithVersionsDTO> => {
    const response = await apiClient.post<PromptWithVersionsDTO>(
      `/prompts/${id}/versions`,
      data
    );
    return response.data;
  },

  archive: async (id: string): Promise<void> => {
    await apiClient.delete(`/prompts/${id}`);
  },

  getChains: async (id: string): Promise<ChainDTO[]> => {
    const response = await apiClient.get<ChainDTO[]>(`/prompts/${id}/chains`);
    return response.data;
  },
};
