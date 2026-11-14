import { Lock } from "lucide-react";
import { useState } from "react";
import type { ExpenseRead } from "@/api/contract";
import { ErrorState } from "@/components/ErrorState";
import { usePetOutlet } from "@/components/usePetOutlet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutDialog } from "@/features/checkout/CheckoutDialog";
import { useExpenses } from "@/features/expenses/api";
import { useForecast, useSummary } from "@/features/forecast/api";
import { MonthChart } from "@/features/forecast/MonthChart";
import { describePet } from "@/features/pets/describePet";
import { ForecastBreakdown } from "@/features/results/ForecastBreakdown";
import { formatUsd, formatUsdRange, toNumber } from "@/lib/format";

/** Spent per calendar month of the current year, from the user's own expenses. */
function spentByMonth(expenses: ExpenseRead[], year: number): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  for (const expense of expenses) {
    const [y, m] = expense.spent_on.split("-");
    if (Number(y) !== year) continue;
    const index = Number(m) - 1;
    months[index] = (months[index] ?? 0) + toNumber(expense.amount);
  }
  return months;
}

export function ForecastPage() {
  const pet = usePetOutlet();
  const forecast = useForecast(pet.id);
  const summary = useSummary(pet.id);
  const expenses = useExpenses(pet.id);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[15px] text-muted">{describePet(pet)}</p>
        <h1 className="mt-1 text-[36px] leading-tight sm:text-[44px]">
          {pet.name}'s {year} forecast
        </h1>
      </div>

      {summary.isPending ? (
        <Skeleton className="h-[110px] rounded-card" />
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <div className="rounded-[22px] border-2 border-ink bg-sun p-5 shadow-hard">
            <p className="text-sm font-bold">Expected this year</p>
            <p className="money mt-1.5 text-[32px]">
              {formatUsdRange(summary.data.expected_low, summary.data.expected_high)}
            </p>
          </div>
          <div className="rounded-[22px] border-2 border-ink bg-surface p-5">
            <p className="text-sm font-bold">Spent so far</p>
            <p className="money mt-1.5 text-[32px]">{formatUsd(summary.data.spent_total)}</p>
          </div>
          <div className="rounded-[22px] border-2 border-ink bg-surface p-5">
            <p className="text-sm font-bold">Still expected</p>
            <p className="money mt-1.5 text-[32px]">
              {formatUsdRange(summary.data.still_low, summary.data.still_high)}
            </p>
          </div>
        </div>
      )}

      <section aria-labelledby="months-title" className="flex flex-col gap-4 rounded-hero border-2 border-ink bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="months-title" className="text-[26px]">
            Month by month
          </h2>
          <div className="flex gap-4 text-sm font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded border-2 border-dashed border-ink" aria-hidden="true" />
              Expected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded border-2 border-ink bg-coral" aria-hidden="true" />
              Spent
            </span>
          </div>
        </div>
        {forecast.isPending ? (
          <Skeleton className="h-[200px]" />
        ) : forecast.isError ? (
          <ErrorState error={forecast.error} onRetry={() => void forecast.refetch()} />
        ) : forecast.data.monthly ? (
          <MonthChart expected={forecast.data.monthly} spent={spentByMonth(expenses.data?.items ?? [], year)} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[20px] border-2 border-dashed border-ink bg-butter px-5 py-8 text-center">
            <Lock className="h-9 w-9" strokeWidth={2} aria-hidden="true" />
            <p className="font-display text-[22px] font-extrabold">See when the big bills land</p>
            <p className="max-w-[420px] text-[15px]">
              The month-by-month forecast shows which months will cost the most, so you can plan ahead.
            </p>
            <Button variant="primary" onClick={() => setCheckoutOpen(true)}>
              Unlock with yearly · $59.99
            </Button>
          </div>
        )}
      </section>

      {forecast.data && <ForecastBreakdown items={forecast.data.items} />}

      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} petName={pet.name} />
    </div>
  );
}
