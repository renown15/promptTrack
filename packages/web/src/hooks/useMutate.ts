import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

/**
 * Thin wrapper around useMutation that automatically invalidates one or more
 * query keys on success. Eliminates the useQueryClient boilerplate repeated
 * across every mutation hook.
 */
export function useMutate<TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<TData>,
  invalidateKeys: QueryKey[]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidateKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key as QueryKey })
      );
    },
  });
}
