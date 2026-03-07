import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionsApi } from "@/api/endpoints/collections";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@prompttrack/shared";

export function useProjectTree() {
  return useQuery({
    queryKey: ["collections", "tree"],
    queryFn: () => collectionsApi.getTree(),
  });
}

export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsApi.list(),
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCollectionInput) => collectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useUpdateCollection(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCollectionInput) =>
      collectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collectionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useAddPromptToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      collectionId,
      promptId,
    }: {
      collectionId: string;
      promptId: string;
    }) => collectionsApi.addPrompt(collectionId, promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useRemovePromptFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      collectionId,
      promptId,
    }: {
      collectionId: string;
      promptId: string;
    }) => collectionsApi.removePrompt(collectionId, promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useAddChainToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      collectionId,
      chainId,
    }: {
      collectionId: string;
      chainId: string;
    }) => collectionsApi.addChain(collectionId, chainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useRemoveChainFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      collectionId,
      chainId,
    }: {
      collectionId: string;
      chainId: string;
    }) => collectionsApi.removeChain(collectionId, chainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}
