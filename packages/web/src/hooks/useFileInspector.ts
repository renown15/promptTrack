import { useQuery, useMutation } from "@tanstack/react-query";
import { fileInspectorApi } from "@/api/endpoints/file-inspector";

export type {
  FileContentDTO,
  FileSummaryDTO,
  FileRefactorDTO,
  ConversationMessage,
  FileDiscussionDTO,
} from "@/api/endpoints/file-inspector";

export function useFileContent(
  collectionId: string,
  relativePath: string | null
) {
  return useQuery({
    queryKey: ["file-content", collectionId, relativePath],
    queryFn: () => fileInspectorApi.getContent(collectionId, relativePath!),
    enabled: !!collectionId && !!relativePath,
    staleTime: 30_000,
  });
}

export function useGenerateFileSummary(collectionId: string) {
  return useMutation({
    mutationFn: (relativePath: string) =>
      fileInspectorApi.generateSummary(collectionId, relativePath),
  });
}

export function useGenerateRefactorIdeas(collectionId: string) {
  return useMutation({
    mutationFn: (relativePath: string) =>
      fileInspectorApi.generateRefactorIdeas(collectionId, relativePath),
  });
}

export function useFileDiscussion(collectionId: string) {
  return useMutation({
    mutationFn: ({
      relativePath,
      message,
      history,
    }: {
      relativePath: string;
      message: string;
      history?: Parameters<typeof fileInspectorApi.discuss>[3];
    }) =>
      fileInspectorApi.discuss(collectionId, relativePath, message, history),
  });
}
