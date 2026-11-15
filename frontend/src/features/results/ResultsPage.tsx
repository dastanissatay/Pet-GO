import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { PaidPlan, PetRead } from "@/api/contract";
import { ErrorState } from "@/components/ErrorState";
import { MarketingHeader } from "@/components/MarketingHeader";
import { PetAvatar } from "@/components/PetAvatar";
import { RequirePet } from "@/components/RequirePet";
import { buttonVariants } from "@/components/ui/button";
import { useMe } from "@/features/account/api";
import { BenchmarkCard } from "@/features/benchmark/BenchmarkCard";
import { CheckoutDialog } from "@/features/checkout/CheckoutDialog";
import { useFoodPlan } from "@/features/food/api";
import { useForecast } from "@/features/forecast/api";
import { describePet } from "@/features/pets/describePet";
import { BuildingPlan } from "@/features/results/BuildingPlan";
import { ForecastBreakdown } from "@/features/results/ForecastBreakdown";
import { PaywallCard } from "@/features/results/PaywallCard";
import { formatUsd, formatUsdRange } from "@/lib/format";
import { useMinimumPending } from "@/lib/useMinimumPending";

export function ResultsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader>
        <Link to="/quiz" className="p-2.5 font-bold">
          Edit answers
        </Link>
      </MarketingHeader>
      <RequirePet loadingLabel="Loading your pet…">{(pet) => <Results pet={pet} />}</RequirePet>
    </div>
  );
}

function Results({ pet }: { pet: PetRead }) {
  const navigate = useNavigate();
  const forecast = useForecast(pet.id);
  const food = useFoodPlan(pet.id);
  const me = useMe();
  const showBuilding = useMinimumPending(forecast.isPending, 1800);
  const [checkoutPlan, setCheckoutPlan] = useState<PaidPlan | null>(null);

  if (showBuilding) return <BuildingPlan pet={pet} />;
  if (forecast.isError) {
    return (
      <div className="container py-16">
        <ErrorState
          title={`We couldn't build ${pet.name}'s plan`}
          error={forecast.error}
          onRetry={() => void forecast.refetch()}
        />
      </div>
    );
  }

  const data = forecast.data;
  if (!data) return null;
  const isPaid = me.data !== undefined && me.data.plan !== "free";

  return (
    <main className="container flex flex-wrap items-start gap-8 pb-16 pt-12">
      <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
        <div className="flex flex-wrap items-center gap-6 rounded-hero border-2 border-ink bg-sun px-8 py-7 shadow-hard-lg">
          <div className="flex min-w-0 flex-1 basis-[300px] flex-col gap-2">
            <span className="text-lg font-medium">{pet.name} will likely cost</span>
            <h1 className="money text-[56px] leading-[0.95] tracking-[-0.04em] sm:text-[80px]">
              about {formatUsd(data.total_typical)}
            </h1>
            <span className="text-base">this year · {describePet(pet)}</span>
            <span className="text-sm">
              Usually {formatUsdRange(data.total_low, data.total_high)}, depending on your vet and
              what comes up.
            </span>
            {food.data && (
              <span className="text-sm font-bold">
                Plus food: about {formatUsd(food.data.annual_typical)} a year, so about{" "}
                {formatUsd(data.total_typical + food.data.annual_typical)} all in.
              </span>
            )}
          </div>
          <PetAvatar species={pet.species} stage={1} size={140} label={null} />
        </div>
        <BenchmarkCard petId={pet.id} petName={pet.name} />
        <ForecastBreakdown forecast={data} />
      </section>

      <div className="flex-[1_1_340px]">
        {isPaid ? (
          <div className="flex flex-col gap-4 rounded-hero border-2 border-ink bg-mint p-6 shadow-hard-lg">
            <h2 className="text-[28px]">You're all set</h2>
            <p>Your plan includes unlimited decoding and the month-by-month forecast.</p>
            <Link to="/dashboard" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Go to the dashboard
            </Link>
          </div>
        ) : (
          <PaywallCard petName={pet.name} onChoose={setCheckoutPlan} />
        )}
      </div>

      {checkoutPlan && (
        <CheckoutDialog
          open
          onOpenChange={(open) => !open && setCheckoutPlan(null)}
          petName={pet.name}
          initialPlan={checkoutPlan}
          onConfirmed={() => navigate("/dashboard")}
        />
      )}
    </main>
  );
}
