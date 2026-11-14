import { Link } from "react-router-dom";
import { MarketingHeader } from "@/components/MarketingHeader";
import { buttonVariants } from "@/components/ui/button";
import { FeatureCards } from "@/features/landing/FeatureCards";
import { LandingHero } from "@/features/landing/LandingHero";
import { PricingSection } from "@/features/landing/PricingSection";
import { SiteFooter } from "@/features/landing/SiteFooter";
import { StatsBand } from "@/features/landing/StatsBand";

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
          <a href="#how" className="hidden px-3 py-2.5 text-[15px] font-bold no-underline sm:block">
            How it works
          </a>
          <a href="#pricing" className="hidden px-3 py-2.5 text-[15px] font-bold no-underline sm:block">
            Pricing
          </a>
          <Link to="/decode" className="px-3 py-2.5 text-[15px] font-bold no-underline">
            Decode an estimate
          </Link>
          <Link to="/quiz" className={buttonVariants({ variant: "primary", size: "md" })}>
            Start with my pet
          </Link>
        </nav>
      </MarketingHeader>
      <main>
        <LandingHero />
        <StatsBand />
        <FeatureCards />
        <PricingSection />
      </main>
      <SiteFooter />
    </div>
  );
}
