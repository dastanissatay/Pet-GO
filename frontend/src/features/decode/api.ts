import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DecodeHistoryItem, DecodeResult, Page, Samples } from "@/api/contract";
import { accountKeys } from "@/features/account/api";
import { petKeys } from "@/features/pets/api";
import { api } from "@/lib/api";

export const decodeKeys = {
  history: () => ["decodes", "history"] as const,
};

export interface DecodeEstimateInput {
  petId: string;
  text: string;
}

export function useDecodeEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, text }: DecodeEstimateInput) =>
      api.post<DecodeResult>("/v1/estimates/decode", { pet_id: petId, text }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.me() });
      void queryClient.invalidateQueries({ queryKey: decodeKeys.history() });
    },
  });
}

/** The user's past decodes, newest first, each with its full stored result. */
export function useDecodeHistory() {
  return useQuery({
    queryKey: decodeKeys.history(),
    queryFn: ({ signal }) =>
      api.get<Page<DecodeHistoryItem>>("/v1/estimates", { limit: 20, offset: 0 }, signal),
  });
}

export async function loadSampleEstimate(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<string> {
  const samples = await queryClient.fetchQuery({
    queryKey: petKeys.samples(),
    queryFn: () => api.get<Samples>("/v1/samples"),
    staleTime: Infinity,
  });
  return samples.estimate_text;
}
