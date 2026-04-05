import { collectionsApi } from "@/api/endpoints/collections";
import { useMutate } from "@/hooks/useMutate";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@prompttrack/shared";
import { useQuery } from "@tanstack/react-query";
export type {
  ApiKeyRecord,
  CodeMakeup,
  CoverageSnapshot,
  DocFile,
  FileCountSnapshot,
  VolumeSnapshot,
} from "@/api/endpoints/collections";

const KEYS = {
  all: ["collections"] as const,
  tree: ["collections", "tree"] as const,
};

export function useProjectTree() {
  return useQuery({
    queryKey: KEYS.tree,
    queryFn: () => collectionsApi.getTree(),
  });
}

export function useCollections() {
  return useQuery({ queryKey: KEYS.all, queryFn: () => collectionsApi.list() });
}

export function useCollectionDocs(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["collections", id, "docs"],
    queryFn: () => collectionsApi.listDocs(id),
    enabled,
  });
}

export function useDocContent(id: string, file: string | null) {
  return useQuery({
    queryKey: ["collections", id, "docs", file],
    queryFn: () => collectionsApi.getDocContent(id, file!),
    enabled: file !== null,
  });
}

export function useCreateCollection() {
  return useMutate(
    (data: CreateCollectionInput) => collectionsApi.create(data),
    [KEYS.all]
  );
}

export function useUpdateCollection(id: string) {
  return useMutate(
    (data: UpdateCollectionInput) => collectionsApi.update(id, data),
    [KEYS.all]
  );
}

export function useDeleteCollection() {
  return useMutate((id: string) => collectionsApi.delete(id), [KEYS.all]);
}

export function useAddPromptToCollection() {
  return useMutate(
    ({ collectionId, promptId }: { collectionId: string; promptId: string }) =>
      collectionsApi.addPrompt(collectionId, promptId),
    [KEYS.all]
  );
}

export function useRemovePromptFromCollection() {
  return useMutate(
    ({ collectionId, promptId }: { collectionId: string; promptId: string }) =>
      collectionsApi.removePrompt(collectionId, promptId),
    [KEYS.all]
  );
}

export function useAddChainToCollection() {
  return useMutate(
    ({ collectionId, chainId }: { collectionId: string; chainId: string }) =>
      collectionsApi.addChain(collectionId, chainId),
    [KEYS.all]
  );
}

export function useRemoveChainFromCollection() {
  return useMutate(
    ({ collectionId, chainId }: { collectionId: string; chainId: string }) =>
      collectionsApi.removeChain(collectionId, chainId),
    [KEYS.all]
  );
}

export function useApiKeys(collectionId: string) {
  return useQuery({
    queryKey: ["collections", collectionId, "api-keys"],
    queryFn: () => collectionsApi.listApiKeys(collectionId),
  });
}

export function useCreateApiKey(collectionId: string) {
  return useMutate(
    (name: string) => collectionsApi.createApiKey(collectionId, name),
    [["collections", collectionId, "api-keys"]]
  );
}

export function useRevokeApiKey(collectionId: string) {
  return useMutate(
    (keyId: string) => collectionsApi.revokeApiKey(collectionId, keyId),
    [["collections", collectionId, "api-keys"]]
  );
}

export function useGetFullApiKey(collectionId: string, keyId: string) {
  return useQuery({
    queryKey: ["collections", collectionId, "api-keys", keyId, "key"],
    queryFn: () => collectionsApi.getFullApiKey(collectionId, keyId),
  });
}

// Analytics hooks
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

export function useDirectoryStructure(collectionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["collections", collectionId, "directory-structure"],
    queryFn: () => collectionsApi.getDirectoryStructure(collectionId),
    enabled,
  });
}

export function useUpdateInScopeDirectories(collectionId: string) {
  return useMutate(
    async (directories: string[]) => {
      const result = await collectionsApi.updateInScopeDirectories(
        collectionId,
        directories
      );
      return result;
    },
    [KEYS.all]
  );
}
