import { formatUsd, formatUsdRange } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RangeBarProps {
  spent: number;
  low: number;
  high: number;
  className?: string;
}

/** Spent so far (coral) against the expected range (striped mint zone). */
export function RangeBar({ spent, low, high, className }: RangeBarProps) {
  const max = Math.max(high * 1.15, spent * 1.05, 1);
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / max) * 100))}%`;
  return (
    <div
      role="img"
      aria-label={`Spent ${formatUsd(spent)}. Expected ${formatUsdRange(low, high)} this year.`}
      className={cn(
        "relative h-[26px] overflow-hidden rounded-full border-2 border-ink bg-butter",
        className,
      )}
    >
      <div
        className="striped-range absolute inset-y-0 border-x-2 border-ink"
        style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }}
      />
      {spent > 0 && (
        <div
          className="absolute inset-y-0 left-0 border-r-2 border-ink bg-coral transition-[width] duration-300"
          style={{ width: pct(spent) }}
        />
      )}
    </div>
  );
}
