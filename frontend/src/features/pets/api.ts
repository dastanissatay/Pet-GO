import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Breed, Page, PetCreate, PetRead, Samples, Species } from "@/api/contract";
import { api, isApiError } from "@/lib/api";

export const petKeys = {
  all: ["pets"] as const,
  current: () => [...petKeys.all, "current"] as const,
  samples: () => ["samples"] as const,
  breeds: (species: Species, q: string) => ["breeds", species, q] as const,
};

export function useCurrentPet() {
  return useQuery({
    queryKey: petKeys.current(),
    queryFn: ({ signal }) => api.get<PetRead>("/v1/pets/current", undefined, signal),
    // 404 means "no pet yet", which pages handle by sending the user to the quiz.
    retry: (count, error) => !isApiError(error, "PET_NOT_FOUND") && count < 2,
  });
}

export function useHasNoPet(query: ReturnType<typeof useCurrentPet>): boolean {
  return query.isError && isApiError(query.error, "PET_NOT_FOUND");
}

function useOnPetCreated() {
  const queryClient = useQueryClient();
  return (pet: PetRead) => {
    // A new pet makes every pet-scoped cache stale (forecast, quests, money).
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "samples" && q.queryKey[0] !== "breeds" });
    queryClient.setQueryData(petKeys.current(), pet);
  };
}

export function useCreatePet() {
  const onCreated = useOnPetCreated();
  return useMutation({
    mutationFn: (body: PetCreate) => api.post<PetRead>("/v1/pets", body),
    onSuccess: onCreated,
  });
}

/** "Try with a sample dog": load sample input from the API, then create the pet for real. */
export function useStartWithSample() {
  const queryClient = useQueryClient();
  const onCreated = useOnPetCreated();
  return useMutation({
    mutationFn: async () => {
      const samples = await queryClient.fetchQuery({
        queryKey: petKeys.samples(),
        queryFn: () => api.get<Samples>("/v1/samples"),
        staleTime: Infinity,
      });
      return api.post<PetRead>("/v1/pets", samples.pet);
    },
    onSuccess: onCreated,
  });
}

export function useBreeds(species: Species, q: string) {
  return useQuery({
    queryKey: petKeys.breeds(species, q),
    queryFn: ({ signal }) =>
      api.get<Page<Breed>>("/v1/breeds", { species, q: q || undefined, limit: 20 }, signal),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}
