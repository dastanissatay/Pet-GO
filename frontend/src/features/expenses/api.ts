import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExpenseCreate, ExpenseDraft, ExpenseRead, Page } from "@/api/contract";
import { api } from "@/lib/api";

export const expenseKeys = {
  list: (petId: string) => ["expenses", petId] as const,
};

export function useExpenses(petId: string | undefined) {
  return useQuery({
    queryKey: expenseKeys.list(petId ?? ""),
    queryFn: ({ signal }) =>
      api.get<Page<ExpenseRead>>(`/v1/pets/${petId}/expenses`, { limit: 50, offset: 0 }, signal),
    enabled: Boolean(petId),
  });
}

export function useCreateExpense(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpenseCreate) => api.post<ExpenseRead>(`/v1/pets/${petId}/expenses`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.list(petId) });
      void queryClient.invalidateQueries({ queryKey: ["summary", petId] });
    },
  });
}

export function useParseReceipt() {
  return useMutation({
    mutationFn: (text: string) => api.post<ExpenseDraft>("/v1/receipts/parse", { text }),
  });
}
