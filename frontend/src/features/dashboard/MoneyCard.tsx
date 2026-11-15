import { ErrorState } from "@/components/ErrorState";
import { RangeBar } from "@/components/RangeBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSummary } from "@/features/forecast/api";
import { formatUsd, formatUsdRange, toNumber } from "@/lib/format";

export function MoneyCard({ petId }: { petId: string }) {
  const summary = useSummary(petId);

  if (summary.isPending) return <Skeleton className="h-[230px] rounded-hero" />;
  if (summary.isError) {
    return (
      <ErrorState
        title="Money didn't load"
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />
    );
  }

  const s = summary.data;
  const spent = toNumber(s.spent_total);

  return (
    <section
      aria-labelledby="money-title"
      className="flex flex-col gap-3.5 rounded-hero border-2 border-ink bg-surface p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="money-title" className="text-[26px]">
          Money so far
        </h2>
        <span className="money text-[40px] leading-none">{formatUsd(spent)}</span>
      </div>
      <RangeBar spent={spent} low={s.expected_low} high={s.expected_high} />
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span>Spent this year</span>
        <span>Striped zone: expected {formatUsdRange(s.expected_low, s.expected_high)}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-button bg-butter p-3.5">
          <p className="text-[13px] text-muted">Still expected</p>
          <p className="money mt-1 text-[22px]">~{formatUsd(s.still_typical)}</p>
          <p className="text-xs text-muted">{formatUsdRange(s.still_low, s.still_high)}</p>
        </div>
        <div className="rounded-button bg-butter p-3.5">
          <p className="text-[13px] text-muted">Expected this year</p>
          <p className="money mt-1 text-[22px]">~{formatUsd(s.expected_typical)}</p>
          <p className="text-xs text-muted">{formatUsdRange(s.expected_low, s.expected_high)}</p>
        </div>
      </div>
    </section>
  );
}
