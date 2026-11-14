import type { ForecastItem } from "@/api/contract";
import { formatUsdRange } from "@/lib/format";

export function ForecastBreakdown({ items }: { items: ForecastItem[] }) {
  return (
    <section className="overflow-hidden rounded-card border-2 border-ink bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink px-6 py-4">
        <h2 className="text-2xl">Where it goes</h2>
        <span className="text-sm text-muted">Ranges from US sources</span>
      </div>
      <ul>
        {items.map((item) => (
          <li
            key={item.category}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line px-6 py-4 last:border-b-0"
          >
            <span className="text-[17px] font-bold">{item.category}</span>
            <span className="money text-[22px]">{formatUsdRange(item.low, item.high)}</span>
            <span className="col-span-2 text-sm text-muted">
              {item.note}{" "}
              {item.source_urls.map((url, i) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="font-medium text-ink underline">
                  {item.source_urls.length > 1 ? `Source ${i + 1}` : "Source"}
                </a>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
