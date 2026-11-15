import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FoodPlan, FoodPurchase, FoodPurchaseCreate, FoodStatus } from "@/api/contract";
import { expenseKeys } from "@/features/expenses/api";
import { api } from "@/lib/api";
import { localDateIso } from "@/lib/format";

export const foodKeys = {
  plan: (petId: string) => ["food", petId] as const,
  status: (petId: string) => ["food", petId, "status"] as const,
};

export function useFoodPlan(petId: string) {
  return useQuery({
    queryKey: foodKeys.plan(petId),
    queryFn: ({ signal }) => api.get<FoodPlan>(`/v1/pets/${petId}/food`, undefined, signal),
  });
}

/** Days left are counted from the user's local date, so the reminder flips at their midnight. */
export function useFoodStatus(petId: string) {
  return useQuery({
    queryKey: foodKeys.status(petId),
    queryFn: ({ signal }) =>
      api.get<FoodStatus>(`/v1/pets/${petId}/food/status`, { local_date: localDateIso() }, signal),
  });
}

/** A purchase with a price is also an expense, so the money bar moves too. */
export function useAddFoodPurchase(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FoodPurchaseCreate) =>
      api.post<FoodPurchase>(`/v1/pets/${petId}/food/purchases`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foodKeys.status(petId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.list(petId) });
      void queryClient.invalidateQueries({ queryKey: ["summary", petId] });
    },
  });
}
