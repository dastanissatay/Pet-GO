import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/features/expenses/categories";
import type { ExpenseFormValues } from "@/features/expenses/expenseSchema";
import { cn } from "@/lib/utils";

/** Amount, date, category and note fields shared by both expense dialogs. */
export function ExpenseFields({ form }: { form: UseFormReturn<ExpenseFormValues> }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <div className="relative">
                <span aria-hidden="true" className="money absolute left-4 top-1/2 -translate-y-1/2 text-2xl">
                  $
                </span>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="86.00"
                    className="money pl-9 text-2xl"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" placeholder="MM/DD/YYYY" autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-bold">Category</legend>
              <div className="flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((category) => {
                  const selected = field.value === category;
                  return (
                    <label
                      key={category}
                      className={cn(
                        "flex h-11 cursor-pointer items-center rounded-full border-2 border-ink px-4 text-sm font-bold has-[:focus-visible]:shadow-focus",
                        selected ? "bg-ink text-surface" : "bg-surface text-ink",
                      )}
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={category}
                        checked={selected}
                        onChange={() => field.onChange(category)}
                        className="sr-only"
                      />
                      {CATEGORY_LABELS[category]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Note <span className="font-normal text-muted">(optional)</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="Annual checkup" autoComplete="off" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
