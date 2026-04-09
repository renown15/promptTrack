import { collectionsApi } from "@/api/endpoints/collections";
import { overridesApi } from "@/api/endpoints/insights.overrides";
import { useMutate } from "@/hooks/useMutate";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@prompttrack/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
export type {
  ApiKeyRecord,
  CodeMakeup,
  CoverageSnapshot,
  DocAnalysisResult,
  DocFile,
  DocFreshnessOverride,
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

export function useDocAnalysis(id: string) {
  return useQuery({
    queryKey: ["collections", id, "docs", "analysis"],
    queryFn: () => collectionsApi.getDocAnalysis(id),
  });
}

export function useMarkDocFresh(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      relativePath,
      comment,
    }: {
      relativePath: string;
      comment: string;
    }) =>
      overridesApi.upsert(
        collectionId,
        relativePath,
        "doc_freshness",
        "accepted",
        comment,
        "human"
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["collections", collectionId, "docs"],
      });
    },
  });
}

export function useRemoveDocFreshOverride(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (relativePath: string) =>
      overridesApi.delete(collectionId, relativePath, "doc_freshness"),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["collections", collectionId, "docs"],
      });
    },
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

export {
  useAnalytics,
  useCodeMakeupAnalytics,
  useCoverageAnalytics,
  useFileCountAnalytics,
  useGrowthAnalytics,
  useVolumeAnalytics,
} from "@/hooks/useAnalytics";

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
