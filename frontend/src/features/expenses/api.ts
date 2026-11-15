import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExpenseCreate, ExpenseDraft, ExpenseRead, ExpenseUpdate, Page } from "@/api/contract";
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

/** Every expense change moves the list and the money bar. */
function useInvalidateExpenses(petId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: expenseKeys.list(petId) });
    void queryClient.invalidateQueries({ queryKey: ["summary", petId] });
  };
}

export function useCreateExpense(petId: string) {
  const invalidate = useInvalidateExpenses(petId);
  return useMutation({
    mutationFn: (body: ExpenseCreate) => api.post<ExpenseRead>(`/v1/pets/${petId}/expenses`, body),
    onSuccess: invalidate,
  });
}

export function useUpdateExpense(petId: string) {
  const invalidate = useInvalidateExpenses(petId);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ExpenseUpdate }) =>
      api.patch<ExpenseRead>(`/v1/pets/${petId}/expenses/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeleteExpense(petId: string) {
  const invalidate = useInvalidateExpenses(petId);
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/pets/${petId}/expenses/${id}`),
    onSuccess: invalidate,
  });
}

export function useParseReceipt() {
  return useMutation({
    mutationFn: (text: string) => api.post<ExpenseDraft>("/v1/receipts/parse", { text }),
  });
}
