import { ErrorState } from "@/components/ErrorState";
import { SourceLink } from "@/components/SourceLink";
import { Skeleton } from "@/components/ui/skeleton";
import { useBenchmark } from "@/features/benchmark/api";
import { formatUsd, toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The pet's vet-care forecast next to what the average US owner spent on vet care. */
export function BenchmarkCard({ petId, petName }: { petId: string; petName: string }) {
  const benchmark = useBenchmark(petId);

  if (benchmark.isPending) return <Skeleton className="h-[188px] rounded-card" />;
  if (benchmark.isError) {
    return (
      <ErrorState
        title="The US comparison didn't load"
        error={benchmark.error}
        onRetry={() => void benchmark.refetch()}
      />
    );
  }

  const b = benchmark.data;
  const typical = b.forecast_typical;
  const average = b.us_average_vet_care;
  const max = Math.max(typical, average, 1);
  const owners = b.species === "dog" ? "dog owner" : "cat owner";
  const ratio = average > 0 ? typical / average : 0;

  const rows = [
    {
      label: `${petName}'s vet care forecast`,
      value: `~${formatUsd(typical)}`,
      width: typical / max,
      tone: "bg-coral",
    },
    {
      label: `Average US ${owners}, ${b.year}`,
      value: formatUsd(average),
      width: average / max,
      tone: "bg-sky",
    },
  ];

  return (
    <section
      aria-labelledby="benchmark-title"
      className="flex flex-col gap-4 rounded-card border-2 border-ink bg-surface p-6"
    >
      <h2 id="benchmark-title" className="text-2xl">
        Compared with the US average
      </h2>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.label} className="flex flex-col gap-1.5">
            <span className="flex justify-between gap-3 text-sm font-bold">
              <span>{row.label}</span>
              <span className="money text-base">{row.value}</span>
            </span>
            <span className="h-4 overflow-hidden rounded-full border-2 border-ink bg-butter">
              <span
                className={cn("block h-full", row.tone)}
                // Width depends on the data, so it can't be a Tailwind class.
                style={{ width: `${Math.round(toNumber(row.width) * 100)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm">
        {ratio >= 1.1
          ? `${petName}'s full care plan costs about ${ratio.toFixed(1)}× what the average owner spent.`
          : `${petName}'s care plan is close to what the average owner spent.`}{" "}
        The average is what owners reported spending, including those who skipped visits. The
        forecast prices the full recommended care.
        {b.excluded_categories.length > 0 &&
          ` To compare like with like, it leaves out ${b.excluded_categories
            .join(" and ")
            .toLowerCase()}, which owners mostly buy outside the clinic.`}
      </p>
      <p className="text-xs text-muted">
        Source: <SourceLink href={b.source_url}>{b.source_label}</SourceLink>
      </p>
    </section>
  );
}
