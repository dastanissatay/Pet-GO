import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Samples } from "@/api/contract";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useParseReceipt } from "@/features/expenses/api";
import { ExpenseFields } from "@/features/expenses/ExpenseFields";
import {
  draftToForm,
  emptyExpenseForm,
  expenseFormSchema,
  type ExpenseFormValues,
} from "@/features/expenses/expenseSchema";
import { useSaveExpense } from "@/features/expenses/useSaveExpense";
import { petKeys } from "@/features/pets/api";
import { api, errorMessage } from "@/lib/api";

interface PasteReceiptDialogProps {
  petId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasteReceiptDialog({ petId, open, onOpenChange }: PasteReceiptDialogProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(false);
  const parse = useParseReceipt();
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: emptyExpenseForm(),
  });
  const { submit, isPending } = useSaveExpense(petId, form, () => onOpenChange(false));

  useEffect(() => {
    if (!open) return;
    setText("");
    setParsed(false);
    parse.reset();
    form.reset(emptyExpenseForm());
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function read() {
    parse.mutate(text, {
      onSuccess: (draft) => {
        form.reset(draftToForm(draft));
        setParsed(true);
      },
    });
  }

  async function loadSample() {
    const samples = await queryClient.fetchQuery({
      queryKey: petKeys.samples(),
      queryFn: () => api.get<Samples>("/v1/samples"),
      staleTime: Infinity,
    });
    setText(samples.receipt_text);
  }

  const textId = "receipt-text";
  const errorId = "receipt-error";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[880px]">
        <DialogHeader>
          <DialogTitle>Paste a receipt</DialogTitle>
          <DialogDescription>Copy it from your clinic email or patient portal.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-5">
          <div className="flex min-w-0 flex-1 basis-[320px] flex-col gap-2">
            <Label htmlFor={textId}>Receipt text</Label>
            <Textarea
              id={textId}
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={parse.isError}
              aria-describedby={parse.isError ? errorId : undefined}
              placeholder={"Annual wellness exam    $64.00\nTOTAL                   $86.00"}
            />
            {parse.isError && (
              <p id={errorId} role="alert" className="text-[15px] font-bold text-error">
                {errorMessage(parse.error)}
              </p>
            )}
            <div className="flex flex-wrap gap-2.5">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={read}
                disabled={text.trim().length === 0 || parse.isPending}
              >
                {parse.isPending ? "Reading…" : "Read receipt"}
              </Button>
              <Button type="button" variant="link" onClick={() => void loadSample()}>
                Use sample receipt
              </Button>
            </div>
          </div>

          <section
            aria-label="What we found"
            className="flex min-w-0 flex-1 basis-[320px] flex-col gap-3 rounded-[22px] border-2 border-ink bg-mint p-5"
          >
            {parsed ? (
              <Form {...form}>
                <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-[22px]">Here's what we found</h3>
                    <p className="text-sm">Check it and fix anything before saving.</p>
                  </div>
                  <ExpenseFields form={form} />
                  <Button type="submit" variant="primary" size="lg" disabled={isPending}>
                    {isPending ? "Saving…" : "Save expense"}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="flex h-full flex-col justify-center gap-2 py-6 text-center">
                <p className="font-display text-xl font-extrabold">Nothing read yet</p>
                <p className="text-[15px]">Paste a receipt and press "Read receipt". You'll check every field before it's saved.</p>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
