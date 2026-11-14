import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Me, PaidPlan, SubscriptionCreate } from "@/api/contract";
import { api } from "@/lib/api";

export const accountKeys = {
  me: () => ["me"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: accountKeys.me(),
    queryFn: ({ signal }) => api.get<Me>("/v1/me", undefined, signal),
  });
}

/** Test-mode checkout: switches the plan, no payment is taken. */
export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: PaidPlan) =>
      api.post<{ plan: PaidPlan }>("/v1/subscriptions", { plan } satisfies SubscriptionCreate),
    onSuccess: () => {
      // Paid plans unlock the monthly forecast and unlimited decodes.
      void queryClient.invalidateQueries({ queryKey: accountKeys.me() });
      void queryClient.invalidateQueries({ queryKey: ["forecast"] });
    },
  });
}
