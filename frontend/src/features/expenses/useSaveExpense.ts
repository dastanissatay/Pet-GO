import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { useCreateExpense, useUpdateExpense } from "@/features/expenses/api";
import {
  SERVER_FIELD_MAP,
  toExpenseCreate,
  type ExpenseFormValues,
} from "@/features/expenses/expenseSchema";
import { ApiError, errorMessage } from "@/lib/api";
import { formatUsd } from "@/lib/format";

/**
 * Saves the form and maps server 422 errors back onto the matching fields.
 * With an `expenseId` it changes that expense instead of adding a new one.
 */
export function useSaveExpense(
  petId: string,
  form: UseFormReturn<ExpenseFormValues>,
  onSaved: () => void,
  expenseId?: string,
) {
  const create = useCreateExpense(petId);
  const update = useUpdateExpense(petId);

  function showError(error: unknown) {
    const fields = error instanceof ApiError ? error.fieldErrors() : {};
    let mapped = false;
    for (const [serverName, message] of Object.entries(fields)) {
      const name = SERVER_FIELD_MAP[serverName];
      if (!name) continue;
      form.setError(name, { message });
      mapped = true;
    }
    if (!mapped) form.setError("root", { message: errorMessage(error) });
  }

  const submit = form.handleSubmit((values) => {
    const body = toExpenseCreate(values);
    const callbacks = {
      onSuccess: () => {
        toast.success(
          expenseId ? `Updated to ${formatUsd(body.amount)}` : `Saved ${formatUsd(body.amount)}`,
        );
        onSaved();
      },
      onError: showError,
    };
    if (expenseId) {
      update.mutate({ id: expenseId, body }, callbacks);
      return;
    }
    create.mutate(body, callbacks);
  });

  return { submit, isPending: create.isPending || update.isPending };
}
