import { apiClient } from "@/api/client";
import type {
  CreateChainInput,
  UpdateChainInput,
  CreateChainVersionInput,
  SerialiseChainInput,
  ChainDTO,
  ChainWithVersionDTO,
  ChainVersionDTO,
  SerialiserOutput,
  ChainVariables,
} from "@prompttrack/shared";

export const chainsApi = {
  list: async (params?: { isArchived?: boolean }): Promise<ChainDTO[]> => {
    const response = await apiClient.get<ChainDTO[]>("/chains", { params });
    return response.data;
  },

  getById: async (id: string): Promise<ChainWithVersionDTO> => {
    const response = await apiClient.get<ChainWithVersionDTO>(`/chains/${id}`);
    return response.data;
  },

  create: async (data: CreateChainInput): Promise<ChainWithVersionDTO> => {
    const response = await apiClient.post<ChainWithVersionDTO>("/chains", data);
    return response.data;
  },

  update: async (id: string, data: UpdateChainInput): Promise<ChainDTO> => {
    const response = await apiClient.patch<ChainDTO>(`/chains/${id}`, data);
    return response.data;
  },

  createVersion: async (
    id: string,
    data: CreateChainVersionInput
  ): Promise<ChainVersionDTO> => {
    const response = await apiClient.post<ChainVersionDTO>(
      `/chains/${id}/versions`,
      data
    );
    return response.data;
  },

  getVariables: async (id: string): Promise<ChainVariables> => {
    const response = await apiClient.get<ChainVariables>(
      `/chains/${id}/variables`
    );
    return response.data;
  },

  serialise: async (
    id: string,
    data: SerialiseChainInput
  ): Promise<SerialiserOutput> => {
    const response = await apiClient.post<SerialiserOutput>(
      `/chains/${id}/serialise`,
      data
    );
    return response.data;
  },

  archive: async (id: string): Promise<void> => {
    await apiClient.delete(`/chains/${id}`);
  },
};
