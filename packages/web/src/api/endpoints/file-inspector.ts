import { apiClient } from "@/api/client";

export interface FileContentDTO {
  content: string;
  language: string;
}

export interface FileSummaryDTO {
  summary: string;
}

export interface FileRefactorDTO {
  ideas: string;
}

export const fileInspectorApi = {
  getContent: async (
    collectionId: string,
    relativePath: string
  ): Promise<FileContentDTO> => {
    const r = await apiClient.get<FileContentDTO>(
      `/collections/${collectionId}/insights/file-content?path=${encodeURIComponent(relativePath)}`
    );
    return r.data;
  },

  generateSummary: async (
    collectionId: string,
    relativePath: string
  ): Promise<FileSummaryDTO> => {
    const r = await apiClient.post<FileSummaryDTO>(
      `/collections/${collectionId}/insights/file-summary?path=${encodeURIComponent(relativePath)}`
    );
    return r.data;
  },

  generateRefactorIdeas: async (
    collectionId: string,
    relativePath: string
  ): Promise<FileRefactorDTO> => {
    const r = await apiClient.post<FileRefactorDTO>(
      `/collections/${collectionId}/insights/file-refactor?path=${encodeURIComponent(relativePath)}`
    );
    return r.data;
  },
};
