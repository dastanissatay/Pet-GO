import { toast } from "sonner";
import type { ExpenseRead } from "@/api/contract";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteExpense } from "@/features/expenses/api";
import { CATEGORY_LABELS } from "@/features/expenses/categories";
import { errorMessage } from "@/lib/api";
import { formatDate, formatUsd } from "@/lib/format";

interface DeleteExpenseDialogProps {
  petId: string;
  expense: ExpenseRead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteExpenseDialog({
  petId,
  expense,
  open,
  onOpenChange,
}: DeleteExpenseDialogProps) {
  const remove = useDeleteExpense(petId);

  function confirm() {
    if (!expense) return;
    const target = expense;
    remove.mutate(target.id, {
      onSuccess: () => {
        toast.success(`Deleted ${formatUsd(target.amount)}`);
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) remove.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this expense?</DialogTitle>
          <DialogDescription>
            {expense &&
              `${formatUsd(expense.amount)} · ${expense.note || CATEGORY_LABELS[expense.category]} · ${formatDate(expense.spent_on)}. This can't be undone.`}
          </DialogDescription>
        </DialogHeader>
        {remove.isError && (
          <p role="alert" className="font-bold text-error">
            {errorMessage(remove.error)}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="primary" disabled={remove.isPending} onClick={confirm}>
            {remove.isPending ? "Deleting…" : "Delete expense"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              remove.reset();
              onOpenChange(false);
            }}
          >
            Keep it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
