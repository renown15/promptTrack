import { useQuery } from "@tanstack/react-query";
import { chainsApi } from "@/api/endpoints/chains";
import { useMutate } from "@/hooks/useMutate";
import type {
  CreateChainInput,
  UpdateChainInput,
  CreateChainVersionInput,
  SerialiseChainInput,
} from "@prompttrack/shared";

const KEYS = {
  all: ["chains"] as const,
};

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
  return useMutate(
    (data: CreateChainInput) => chainsApi.create(data),
    [KEYS.all]
  );
}

export function useUpdateChain(id: string) {
  return useMutate(
    (data: UpdateChainInput) => chainsApi.update(id, data),
    [KEYS.all]
  );
}

export function useCreateChainVersion(id: string) {
  return useMutate(
    (data: CreateChainVersionInput) => chainsApi.createVersion(id, data),
    [["chains", id]]
  );
}

export function useSerialiseChain(id: string) {
  return useMutate(
    (data: SerialiseChainInput) => chainsApi.serialise(id, data),
    [["chains", id]]
  );
}
