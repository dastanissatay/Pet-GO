import { ShieldQuestion } from "lucide-react";
import { Chip } from "@/components/Chip";
import { ErrorState } from "@/components/ErrorState";
import { SourceLink } from "@/components/SourceLink";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsuranceCheck } from "@/features/insurance/api";
import { formatUsd, formatUsdRange, toNumber } from "@/lib/format";

/** Average premium next to routine and unexpected costs. Information only, no recommendation. */
export function InsuranceCard({ petId, petName }: { petId: string; petName: string }) {
  const check = useInsuranceCheck(petId);

  if (check.isPending) return <Skeleton className="h-[320px] rounded-hero" />;
  if (check.isError) {
    return (
      <ErrorState
        title="Insurance check didn't load"
        error={check.error}
        onRetry={() => void check.refetch()}
      />
    );
  }

  const data = check.data;
  const monthly = toNumber(data.average_monthly_premium);
  const top = data.unexpected_costs[0];
  const monthsOfPremium = top && monthly > 0 ? Math.round(top.high / monthly) : null;
  const animal = data.species === "dog" ? "dogs" : "cats";

  return (
    <section
      aria-labelledby="insurance-title"
      className="flex flex-col gap-5 rounded-hero border-2 border-ink bg-surface p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldQuestion aria-hidden="true" className="size-7" />
          <h2 id="insurance-title" className="text-[26px]">
            Insurance check
          </h2>
        </div>
        <Chip tone={data.insured ? "sun" : "dashed"}>
          {data.insured ? `${petName} is insured` : `${petName} isn't insured`}
        </Chip>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-button border-2 border-ink bg-lilac p-4">
          <p className="text-[13px] font-bold">Average US premium for {animal}</p>
          <p className="money mt-1 text-[28px]">
            {formatUsd(data.average_monthly_premium)} / month
          </p>
          <p className="mt-1 text-sm">
            {formatUsd(data.average_annual_premium)} a year for accident and illness cover.
          </p>
          <p className="mt-2 text-xs">
            Source:{" "}
            <SourceLink href={data.premium_source_url}>{data.premium_source_label}</SourceLink>
          </p>
        </div>
        <div className="rounded-button border-2 border-ink bg-butter p-4">
          <p className="text-[13px] font-bold">{petName}'s routine care this year</p>
          <p className="money mt-1 text-[28px]">
            {formatUsdRange(data.routine_low, data.routine_high)}
          </p>
          <p className="mt-1 text-sm">
            Checkups, vaccines and prevention. Accident-and-illness plans usually don't pay for
            these; wellness add-ons cost extra.
          </p>
        </div>
      </div>

      {data.unexpected_costs.length > 0 && (
        <div>
          <h3 className="text-lg">Unexpected bills a plan is meant for</h3>
          {top && monthsOfPremium !== null && (
            <p className="mt-1 text-sm">
              One {top.name.toLowerCase()} at the top of its range ({formatUsd(top.high)}) is about{" "}
              {monthsOfPremium} months of the average premium.
            </p>
          )}
          <ul className="mt-3 divide-y divide-line rounded-button border-2 border-ink">
            {data.unexpected_costs.map((cost) => (
              <li
                key={cost.price_id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <span className="font-bold">{cost.name}</span>
                <span className="flex items-center gap-3">
                  <span className="money">{formatUsdRange(cost.low, cost.high)}</span>
                  <SourceLink href={cost.source_url}>
                    <span className="sr-only">Source for {cost.name}</span>
                    <span aria-hidden="true">Source</span>
                  </SourceLink>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted">
        Plans differ in deductibles, reimbursement and exclusions, so compare real quotes. This is
        cost information, not insurance advice.
      </p>
    </section>
  );
}
