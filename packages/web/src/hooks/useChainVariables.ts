import { useQuery } from "@tanstack/react-query";
import { chainsApi } from "@/api/endpoints/chains";

export function useChainVariables(chainId: string) {
  return useQuery({
    queryKey: ["chains", chainId, "variables"],
    queryFn: () => chainsApi.getVariables(chainId),
    enabled: Boolean(chainId),
  });
}
