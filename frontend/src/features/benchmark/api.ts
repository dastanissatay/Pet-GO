import { useQuery } from "@tanstack/react-query";
import type { Benchmark } from "@/api/contract";
import { api } from "@/lib/api";

export const benchmarkKeys = {
  forPet: (petId: string) => ["benchmark", petId] as const,
};

export function useBenchmark(petId: string) {
  return useQuery({
    queryKey: benchmarkKeys.forPet(petId),
    queryFn: ({ signal }) => api.get<Benchmark>(`/v1/pets/${petId}/benchmark`, undefined, signal),
  });
}
