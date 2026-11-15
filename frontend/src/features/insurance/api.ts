import { useQuery } from "@tanstack/react-query";
import type { InsuranceCheck } from "@/api/contract";
import { api } from "@/lib/api";

export const insuranceKeys = {
  check: (petId: string) => ["insurance", petId] as const,
};

export function useInsuranceCheck(petId: string | undefined) {
  return useQuery({
    queryKey: insuranceKeys.check(petId ?? ""),
    queryFn: ({ signal }) =>
      api.get<InsuranceCheck>(`/v1/pets/${petId}/insurance-check`, undefined, signal),
    enabled: Boolean(petId),
  });
}
