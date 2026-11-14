import { Link } from "react-router-dom";
import { Chip } from "@/components/Chip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    perks: ["Yearly cost range", "1 estimate decode", "Daily care quests", "Expense tracking"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Yearly",
    price: "$59.99",
    period: " /year",
    perks: [
      "Unlimited estimate decoding",
      "Month-by-month forecast",
      "Every daily and weekly quest",
      "Works out to $5.00 a month",
    ],
    cta: "Get yearly",
    featured: true,
  },
  {
    name: "Monthly",
    price: "$9.99",
    period: " /month",
    perks: ["Everything in Yearly", "Cancel anytime"],
    cta: "Get monthly",
    featured: false,
  },
] as const;

export function PricingSection() {
  return (
    <section id="pricing" className="container flex scroll-mt-6 flex-col gap-8 pb-20 pt-12">
      <h2 className="text-[36px] leading-tight sm:text-[48px]">Start free. Upgrade when it pays off.</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-stretch gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "relative flex flex-col gap-3.5 rounded-card border-ink p-6",
              tier.featured ? "border-[3px] bg-butter shadow-hard-lg" : "border-2 bg-surface",
            )}
          >
            {tier.featured && (
              <Chip tone="coral" className="absolute -top-4 left-6">
                Best value · save 50%
              </Chip>
            )}
            <h3 className="font-sans text-lg font-bold tracking-normal">{tier.name}</h3>
            <p className="money text-[44px] leading-none">
              {tier.price}
              <span className="font-sans text-base font-medium">{tier.period}</span>
            </p>
            <ul className="list-disc pl-5 text-[15px] leading-8">
              {tier.perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <Link
              to="/quiz"
              className={cn(
                buttonVariants({ variant: tier.featured ? "primary" : "secondary", size: "lg" }),
                "mt-auto",
              )}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
