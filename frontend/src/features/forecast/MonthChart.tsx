import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const CHART_HEIGHT = 180;

interface MonthChartProps {
  expected: number[];
  spent: number[];
}

/** Expected (dashed outline) and spent (coral) per month. CSS only, no chart library. */
export function MonthChart({ expected, spent }: MonthChartProps) {
  const max = Math.max(1, ...expected, ...spent);
  const height = (n: number) => Math.max(n > 0 ? 6 : 0, Math.round((n / max) * CHART_HEIGHT));
  const description = MONTHS.map((m, i) => {
    const e = expected[i] ?? 0;
    const s = spent[i] ?? 0;
    return `${m}: expected ${formatUsd(e)}${s > 0 ? `, spent ${formatUsd(s)}` : ""}`;
  }).join("; ");

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div
        role="img"
        aria-label={`Cost by month. ${description}.`}
        className="grid grid-cols-12 items-end gap-1.5 border-b-2 border-ink sm:gap-2.5"
        style={{ height: CHART_HEIGHT + 4 }}
      >
        {MONTHS.map((month, i) => {
          const e = expected[i] ?? 0;
          const s = spent[i] ?? 0;
          return (
            <div key={month} className="relative flex h-full items-end justify-center">
              <div
                className="w-full rounded-t-lg border-2 border-b-0 border-dashed border-ink"
                style={{ height: height(e) }}
              />
              {s > 0 && (
                <div
                  className={cn("absolute bottom-0 w-[70%] rounded-t-md border-2 border-b-0 border-ink bg-coral")}
                  style={{ height: height(s) }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="grid grid-cols-12 gap-1.5 text-center text-[11px] font-bold sm:gap-2.5 sm:text-[13px]">
        {MONTHS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </figure>
  );
}
