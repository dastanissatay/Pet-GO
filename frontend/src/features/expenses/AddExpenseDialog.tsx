import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ExpenseFields } from "@/features/expenses/ExpenseFields";
import {
  emptyExpenseForm,
  expenseFormSchema,
  type ExpenseFormValues,
} from "@/features/expenses/expenseSchema";
import { useSaveExpense } from "@/features/expenses/useSaveExpense";

interface AddExpenseDialogProps {
  petId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToPaste?: () => void;
  /** Pre-fill, e.g. from the decoder's "Save as expense". */
  initialValues?: Partial<ExpenseFormValues>;
}

export function AddExpenseDialog({
  petId,
  open,
  onOpenChange,
  onSwitchToPaste,
  initialValues,
}: AddExpenseDialogProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: emptyExpenseForm(),
  });
  const { submit, isPending } = useSaveExpense(petId, form, () => onOpenChange(false));

  useEffect(() => {
    if (open) form.reset({ ...emptyExpenseForm(), ...initialValues });
  }, [open, initialValues, form]);

  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an expense</DialogTitle>
          <DialogDescription>It updates your money bar right away.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <ExpenseFields form={form} />
            {rootError && (
              <p role="alert" className="font-bold text-error">
                {rootError}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" variant="primary" size="lg" className="flex-1 basis-[220px]" disabled={isPending}>
                {isPending ? "Saving…" : "Save expense"}
              </Button>
              {onSwitchToPaste && (
                <Button type="button" variant="link" onClick={onSwitchToPaste}>
                  Paste a receipt instead
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
