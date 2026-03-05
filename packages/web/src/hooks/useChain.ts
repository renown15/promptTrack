import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chainsApi } from "@/api/endpoints/chains";
import type {
  CreateChainInput,
  UpdateChainInput,
  CreateChainVersionInput,
  SerialiseChainInput,
} from "@prompttrack/shared";

export function useChains(params?: {
  isArchived?: boolean;
  collectionId?: string;
}) {
  return useQuery({
    queryKey: ["chains", params],
    queryFn: () => chainsApi.list(params),
  });
}

export function useChain(id: string) {
  return useQuery({
    queryKey: ["chains", id],
    queryFn: () => chainsApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreateChain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChainInput) => chainsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chains"] });
    },
  });
}

export function useUpdateChain(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateChainInput) => chainsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chains"] });
    },
  });
}

export function useCreateChainVersion(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChainVersionInput) =>
      chainsApi.createVersion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chains", id] });
    },
  });
}

export function useSerialiseChain(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SerialiseChainInput) => chainsApi.serialise(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chains", id] });
    },
  });
}
