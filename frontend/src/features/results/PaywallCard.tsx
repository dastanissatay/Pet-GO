import { Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { PaidPlan } from "@/api/contract";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/features/checkout/plans";
import { cn } from "@/lib/utils";

const PERKS = ["Unlimited estimate decoding", "Month-by-month forecast", "Every daily and weekly quest"];

interface PaywallCardProps {
  petName: string;
  onChoose: (plan: PaidPlan) => void;
}

export function PaywallCard({ petName, onChoose }: PaywallCardProps) {
  const [plan, setPlan] = useState<PaidPlan>("yearly");

  return (
    <aside
      aria-labelledby="paywall-title"
      className="flex flex-col gap-4 rounded-hero border-2 border-ink bg-surface p-6 shadow-hard-lg"
    >
      <h2 id="paywall-title" className="text-[30px] leading-tight">
        Unlock {petName}'s full plan
      </h2>
      <ul className="flex flex-col gap-2.5">
        {PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-2.5">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-ink bg-mint">
              <Check className="h-3 w-3" strokeWidth={4} aria-hidden="true" />
            </span>
            {perk}
          </li>
        ))}
      </ul>

      <fieldset className="mt-1 flex flex-col gap-3">
        <legend className="sr-only">Choose a plan</legend>
        {(["yearly", "monthly"] as const).map((option) => {
          const selected = plan === option;
          return (
            <label
              key={option}
              className={cn(
                "relative flex cursor-pointer items-center justify-between rounded-[18px] border-ink px-[18px] py-4 has-[:focus-visible]:shadow-focus",
                selected ? "border-[3px] bg-butter" : "border-2 bg-surface",
              )}
            >
              <input
                type="radio"
                name="plan"
                value={option}
                checked={selected}
                onChange={() => setPlan(option)}
                className="sr-only"
              />
              {option === "yearly" && (
                <Chip tone="coral" size="sm" className="absolute -top-3 right-4">
                  Save 50%
                </Chip>
              )}
              <span>
                <span className="block text-[17px] font-bold">{PLANS[option].label}</span>
                <span className="block text-sm text-muted">{PLANS[option].perMonth}</span>
              </span>
              <span className="money text-[28px]">{PLANS[option].price}</span>
            </label>
          );
        })}
      </fieldset>

      <Button variant="primary" size="lg" onClick={() => onChoose(plan)}>
        Get the {PLANS[plan].label.toLowerCase()} plan
      </Button>
      <Link to="/dashboard" className="self-center p-1.5 font-bold">
        Continue free
      </Link>
    </aside>
  );
}
