import { PiggyBank } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { savingsPlan } from "@/features/dashboard/savingsPlan";
import { useForecast, useSummary } from "@/features/forecast/api";
import { formatUsd } from "@/lib/format";

export function SavingsCard({ petId, petName }: { petId: string; petName: string }) {
  const summary = useSummary(petId);
  const forecast = useForecast(petId);

  if (summary.isPending || forecast.isPending) {
    return <Skeleton className="h-[200px] rounded-hero" />;
  }
  if (summary.isError || forecast.isError) {
    return (
      <ErrorState
        title="Savings goal didn't load"
        error={summary.error ?? forecast.error}
        onRetry={() => {
          void summary.refetch();
          void forecast.refetch();
        }}
      />
    );
  }

  const plan = savingsPlan(summary.data, forecast.data);
  const months = `${plan.monthsLeft} month${plan.monthsLeft === 1 ? "" : "s"}`;

  return (
    <section
      aria-labelledby="savings-title"
      className="flex flex-col gap-3.5 rounded-hero border-2 border-ink bg-sky p-6"
    >
      <div className="flex items-center gap-2.5">
        <PiggyBank aria-hidden="true" className="size-7" />
        <h2 id="savings-title" className="text-[26px]">
          Savings goal
        </h2>
      </div>

      {plan.stillHigh > 0 ? (
        <div className="rounded-button border-2 border-ink bg-surface p-4">
          <p className="text-[13px] text-muted">To be ready for the rest of this year</p>
          <p className="money mt-1 text-[28px]">{formatUsd(plan.perMonthThisYear)} / month</p>
          <p className="mt-1 text-sm">
            Up to {formatUsd(plan.stillHigh)} is still expected for {petName}, spread over the{" "}
            {months} left.
          </p>
        </div>
      ) : (
        <div className="rounded-button border-2 border-ink bg-surface p-4">
          <p className="font-bold">You've reached the high end of this year's expected range.</p>
          <p className="mt-1 text-sm">Anything more this year is above the forecast.</p>
        </div>
      )}

      {plan.biggest && (
        <div className="rounded-button bg-butter p-4">
          <p className="text-[13px] text-muted">Biggest single line in the forecast</p>
          <p className="mt-1 font-bold">
            {plan.biggest.category}: up to {formatUsd(plan.biggest.high)}
          </p>
          <p className="mt-1 text-sm">
            Putting aside {formatUsd(plan.biggest.perMonth)} a month covers it within a year.
          </p>
        </div>
      )}

      <p className="text-xs text-muted">
        Based on the high end of {petName}'s forecast range. Cost information, not financial advice.
      </p>
    </section>
  );
}
