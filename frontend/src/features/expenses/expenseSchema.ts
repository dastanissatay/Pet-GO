import { z } from "zod";
import type { ExpenseCreate, ExpenseDraft } from "@/api/contract";
import { EXPENSE_CATEGORIES } from "@/features/expenses/categories";
import { formatDate, localDateIso, parseUsDate, toNumber } from "@/lib/format";

const MAX_AMOUNT = 100_000;

/** "$1,240.5" -> "1240.5" */
export function cleanAmount(text: string): string {
  return text.trim().replace(/^\$/, "").replace(/,/g, "");
}

export const expenseFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Enter an amount.")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(cleanAmount(v)), "Enter an amount like 86.00.")
    .refine((v) => {
      const n = Number(cleanAmount(v));
      return n > 0 && n <= MAX_AMOUNT;
    }, "Enter an amount between $0.01 and $100,000."),
  date: z
    .string()
    .trim()
    .refine((v) => parseUsDate(v) !== null, "Enter a date as MM/DD/YYYY.")
    .refine((v) => {
      const iso = parseUsDate(v);
      return iso === null || iso <= localDateIso();
    }, "The date can't be in the future."),
  category: z.enum(EXPENSE_CATEGORIES, { message: "Pick a category." }),
  note: z.string().trim().max(120, "Keep the note under 120 characters."),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export function emptyExpenseForm(): ExpenseFormValues {
  return { amount: "", date: formatDate(localDateIso()), category: "wellness", note: "" };
}

export function draftToForm(draft: ExpenseDraft): ExpenseFormValues {
  return {
    amount: draft.amount === null ? "" : toNumber(draft.amount).toFixed(2),
    date: draft.spent_on ? formatDate(draft.spent_on) : formatDate(localDateIso()),
    category: draft.category,
    note: draft.note ?? "",
  };
}

export function toExpenseCreate(values: ExpenseFormValues): ExpenseCreate {
  return {
    amount: Number(cleanAmount(values.amount)).toFixed(2),
    spent_on: parseUsDate(values.date) ?? localDateIso(),
    category: values.category,
    note: values.note.trim() || null,
  };
}

/** Backend field names -> form field names, for 422 errors. */
export const SERVER_FIELD_MAP: Record<string, keyof ExpenseFormValues> = {
  amount: "amount",
  spent_on: "date",
  category: "category",
  note: "note",
};
