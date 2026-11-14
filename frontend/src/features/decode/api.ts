import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DecodeResult, Samples } from "@/api/contract";
import { accountKeys } from "@/features/account/api";
import { petKeys } from "@/features/pets/api";
import { api } from "@/lib/api";

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
    },
  });
}

export async function loadSampleEstimate(queryClient: ReturnType<typeof useQueryClient>): Promise<string> {
  const samples = await queryClient.fetchQuery({
    queryKey: petKeys.samples(),
    queryFn: () => api.get<Samples>("/v1/samples"),
    staleTime: Infinity,
  });
  return samples.estimate_text;
}
