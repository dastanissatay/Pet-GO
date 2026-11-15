import type { Forecast, Summary } from "@/api/contract";
import { toNumber } from "@/lib/format";

export interface SavingsPlan {
  /** Months left in the calendar year, counting the current one. */
  monthsLeft: number;
  /** High end of what is still expected this year. */
  stillHigh: number;
  /** stillHigh spread over the months left, rounded up to whole dollars. */
  perMonthThisYear: number;
  /** The single forecast line with the highest top-of-range cost. */
  biggest: { category: string; high: number; perMonth: number } | null;
}

/**
 * Plain arithmetic on the forecast and spending so far. It plans for the high end of the
 * range so a bill at the top of the range is still covered. Nothing here is a prediction.
 */
export function savingsPlan(
  summary: Summary,
  forecast: Forecast,
  now: Date = new Date(),
): SavingsPlan {
  const monthsLeft = 12 - now.getMonth();
  const stillHigh = Math.max(0, toNumber(summary.still_high));
  const top = forecast.items.reduce<Forecast["items"][number] | null>(
    (best, item) => (best === null || item.high > best.high ? item : best),
    null,
  );
  return {
    monthsLeft,
    stillHigh,
    perMonthThisYear: Math.ceil(stillHigh / monthsLeft),
    biggest:
      top && top.high > 0
        ? { category: top.category, high: top.high, perMonth: Math.ceil(top.high / 12) }
        : null,
  };
}
