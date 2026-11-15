import { ShoppingCart, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { SourceLink } from "@/components/SourceLink";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFoodPlan, useFoodStatus } from "@/features/food/api";
import { BuyFoodDialog } from "@/features/food/BuyFoodDialog";
import { FoodStatusPanel } from "@/features/food/FoodStatusPanel";
import { formatUsd, formatUsdRange } from "@/lib/format";

const wholeNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const formatNumber = (n: number) => wholeNumber.format(n);

/** The kind of food that fits the pet, what it costs a year, and where to buy it. */
export function FoodCard({ petId, petName }: { petId: string; petName: string }) {
  const food = useFoodPlan(petId);
  const status = useFoodStatus(petId);
  const [logOpen, setLogOpen] = useState(false);

  if (food.isPending) return <Skeleton className="h-[260px] rounded-hero" />;
  if (food.isError) {
    return (
      <ErrorState
        title="Food costs didn't load"
        error={food.error}
        onRetry={() => void food.refetch()}
      />
    );
  }

  const plan = food.data;
  return (
    <section
      aria-labelledby="food-title"
      className="flex flex-col gap-4 rounded-hero border-2 border-ink bg-surface p-6"
    >
      <div className="flex items-center gap-2.5">
        <UtensilsCrossed aria-hidden="true" className="size-7" />
        <h2 id="food-title" className="text-[26px]">
          Food
        </h2>
      </div>

      {status.data && (
        <FoodStatusPanel status={status.data} petName={petName} onLogBag={() => setLogOpen(true)} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-button border-2 border-ink bg-lilac p-4">
          <p className="text-[13px] font-bold">What fits {petName}</p>
          <p className="mt-1 text-xl font-bold leading-tight">{plan.food_type}</p>
          <p className="mt-2 text-sm">{plan.tip}</p>
        </div>
        <div className="rounded-button border-2 border-ink bg-butter p-4">
          <p className="text-[13px] font-bold">Food a year</p>
          <p className="money mt-1 text-[28px]">~{formatUsd(plan.annual_typical)}</p>
          <p className="text-xs text-muted">
            {formatUsdRange(plan.annual_low, plan.annual_high)}. Not part of the vet forecast.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-button border-2 border-ink p-3">
          <dt className="text-[13px] font-bold">Sized for</dt>
          <dd className="mt-0.5">{plan.weight_basis}</dd>
        </div>
        <div className="rounded-button border-2 border-ink p-3">
          <dt className="text-[13px] font-bold">Calories a day</dt>
          <dd className="money mt-0.5 text-lg">
            {formatNumber(plan.daily_kcal_low)}–{formatNumber(plan.daily_kcal_high)} kcal
          </dd>
        </div>
        <div className="rounded-button border-2 border-ink p-3">
          <dt className="text-[13px] font-bold">Dry food a year</dt>
          <dd className="money mt-0.5 text-lg">
            {formatNumber(plan.pounds_per_year_low)}–{formatNumber(plan.pounds_per_year_high)} lb
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        {plan.shop_links.map((link) => (
          <a
            key={link.store}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "secondary", size: "md" })}
          >
            <ShoppingCart aria-hidden="true" className="size-4" />
            Find it on {link.store}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ))}
      </div>

      <p className="text-xs text-muted">
        {plan.basis} Store links open a search, not a specific product. Cost information, not a diet
        plan: ask your vet how much {petName} should eat.
      </p>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span>Sources:</span>
        {plan.sources.map((source) => (
          <SourceLink key={source.url} href={source.url}>
            {source.label}
          </SourceLink>
        ))}
      </p>
      <BuyFoodDialog petId={petId} petName={petName} open={logOpen} onOpenChange={setLogOpen} />
    </section>
  );
}
