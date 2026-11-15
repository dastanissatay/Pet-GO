import type { Forecast, LifeStage } from "@/api/contract";
import { SourceLink } from "@/components/SourceLink";
import { formatUsd, formatUsdRange, toNumber } from "@/lib/format";

const STAGE_LABEL: Record<LifeStage, string> = {
  young: "first-year",
  adult: "adult",
  senior: "senior",
};

/** How local prices compare with the US average, in words. */
function priceLevelText(level: number): string {
  const diff = Math.round(level - 100);
  if (Math.abs(diff) < 2) return "about the US average";
  return `${Math.abs(diff)}% ${diff > 0 ? "above" : "below"} the US average`;
}

export function ForecastBreakdown({ forecast }: { forecast: Forecast }) {
  const { items, region } = forecast;
  return (
    <section className="overflow-hidden rounded-card border-2 border-ink bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink px-6 py-4">
        <h2 className="text-2xl">Where it goes</h2>
        <span className="text-sm text-muted">~ typical price for your area</span>
      </div>
      <ul>
        {items.map((item) => (
          <li
            key={item.category}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line px-6 py-4 last:border-b-0"
          >
            <span className="text-[17px] font-bold first-letter:uppercase">{item.category}</span>
            <span className="text-right">
              <span className="money block text-[22px]">~{formatUsd(item.typical)}</span>
              <span className="block text-xs text-muted">
                {formatUsdRange(item.low, item.high)}
              </span>
            </span>
            <span className="col-span-2 text-sm text-muted">
              {item.note}
              {item.source_urls.length > 0 && (
                <span className="ml-1.5 inline-flex flex-wrap gap-x-2.5">
                  {item.source_urls.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-ink underline"
                    >
                      {item.source_urls.length > 1 ? `Source ${i + 1}` : "Source"}
                    </a>
                  ))}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1 border-t-2 border-ink bg-butter px-6 py-4 text-sm">
        <p>
          <span className="font-bold">Priced for {region.name}:</span> prices there run{" "}
          {priceLevelText(toNumber(region.price_level))} (
          <SourceLink href={region.source_url}>{region.source_label}</SourceLink>).
        </p>
        <p>
          <span className="font-bold">
            Uses the {STAGE_LABEL[forecast.life_stage]} care schedule.
          </span>{" "}
          {forecast.schedule_basis}
        </p>
        <p>
          <span className="font-bold">Typical prices:</span> {forecast.typical_basis}{" "}
          <SourceLink href={forecast.typical_source_url}>Source</SourceLink>
        </p>
      </div>
    </section>
  );
}
