import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { useCreateExpense } from "@/features/expenses/api";
import {
  SERVER_FIELD_MAP,
  toExpenseCreate,
  type ExpenseFormValues,
} from "@/features/expenses/expenseSchema";
import { ApiError, errorMessage } from "@/lib/api";
import { formatUsd } from "@/lib/format";

/** Saves the form and maps server 422 errors back onto the matching fields. */
export function useSaveExpense(petId: string, form: UseFormReturn<ExpenseFormValues>, onSaved: () => void) {
  const create = useCreateExpense(petId);

  const submit = form.handleSubmit((values) => {
    const body = toExpenseCreate(values);
    create.mutate(body, {
      onSuccess: () => {
        toast.success(`Saved ${formatUsd(body.amount)}`);
        onSaved();
      },
      onError: (error) => {
        const fields = error instanceof ApiError ? error.fieldErrors() : {};
        const entries = Object.entries(fields);
        if (entries.length === 0) {
          form.setError("root", { message: errorMessage(error) });
          return;
        }
        for (const [serverName, message] of entries) {
          const name = SERVER_FIELD_MAP[serverName];
          if (name) form.setError(name, { message });
        }
      },
    });
  });

  return { submit, isPending: create.isPending };
}
