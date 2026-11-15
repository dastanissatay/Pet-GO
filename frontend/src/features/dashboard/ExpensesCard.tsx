import { Pencil, ReceiptText, Trash2 } from "lucide-react";
import type { ExpenseRead } from "@/api/contract";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS } from "@/features/expenses/categories";
import { useExpenses } from "@/features/expenses/api";
import { formatDate, formatUsd } from "@/lib/format";

interface ExpensesCardProps {
  petId: string;
  petName: string;
  onAdd: () => void;
  onPaste: () => void;
  onEdit: (expense: ExpenseRead) => void;
  onDelete: (expense: ExpenseRead) => void;
}

export function ExpensesCard({
  petId,
  petName,
  onAdd,
  onPaste,
  onEdit,
  onDelete,
}: ExpensesCardProps) {
  const expenses = useExpenses(petId);

  return (
    <section
      aria-labelledby="expenses-title"
      className="overflow-hidden rounded-hero border-2 border-ink bg-surface"
    >
      <h2 id="expenses-title" className="border-b-2 border-ink px-6 py-4 text-[22px]">
        Expenses
      </h2>
      {expenses.isPending && (
        <div className="flex flex-col gap-3 p-6">
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      )}
      {expenses.isError && (
        <div className="p-4">
          <ErrorState error={expenses.error} onRetry={() => void expenses.refetch()} />
        </div>
      )}
      {expenses.data && expenses.data.items.length === 0 && (
        <div className="p-5">
          <EmptyState
            icon={<ReceiptText className="h-11 w-11" strokeWidth={1.8} aria-hidden="true" />}
            title="Track your first vet bill"
            actions={
              <>
                <Button variant="primary" onClick={onAdd}>
                  Add expense
                </Button>
                <Button variant="secondary" onClick={onPaste}>
                  Paste a receipt
                </Button>
              </>
            }
          >
            Add a bill or paste a receipt. We'll show it against {petName}'s forecast.
          </EmptyState>
        </div>
      )}
      {expenses.data && expenses.data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="text-left text-[13px] text-muted">
                <th scope="col" className="px-6 py-3 font-bold">
                  Date
                </th>
                <th scope="col" className="px-2 py-3 font-bold">
                  What
                </th>
                <th scope="col" className="px-2 py-3 text-right font-bold">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.data.items.map((expense) => {
                const label = `${expense.note || CATEGORY_LABELS[expense.category]}, ${formatDate(expense.spent_on)}`;
                return (
                  <tr key={expense.id} className="border-t border-line">
                    <td className="whitespace-nowrap px-6 py-3.5">
                      {formatDate(expense.spent_on)}
                    </td>
                    <td className="px-2 py-3.5">
                      {expense.note || CATEGORY_LABELS[expense.category]}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3.5 text-right font-bold">
                      {formatUsd(expense.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${label}`}
                        onClick={() => onEdit(expense)}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${label}`}
                        onClick={() => onDelete(expense)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
