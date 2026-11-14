import { cn } from "@/lib/utils";

// Figures and sources from docs/SPEC.md section 2.
const STATS = [
  {
    value: "39%",
    text: "of US pet owners have gone into debt for vet care.",
    source: "APPA, 2026",
    url: "https://citizenshipper.com/blog/press-room/whats-the-cost-to-own-a-pet/",
    color: "text-sun",
  },
  {
    value: "62%",
    text: "would go into debt to save their pet's life.",
    source: "Morning Consult for Healthy Paws, 2026",
    url: "https://www.healthypawspetinsurance.com/pet-insurance-research/love-vs-limits-the-new-economics-of-pet-care.html",
    color: "text-coral",
  },
  {
    value: "83%",
    text: "say their pet feels like their own child.",
    source: "Harris Poll, 2026",
    url: "https://theharrispoll.com/?p=28794",
    color: "text-mint",
  },
] as const;

export function StatsBand() {
  return (
    <section aria-label="Why it matters" className="bg-ink text-surface">
      <div className="container grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-7 py-10">
        {STATS.map((stat) => (
          <div key={stat.value}>
            <p className={cn("font-display text-[52px] font-extrabold leading-none", stat.color)}>
              {stat.value}
            </p>
            <p className="mt-2 text-base leading-snug">{stat.text}</p>
            <a
              href={stat.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block text-[13px] text-surface/80 underline-offset-2 hover:underline"
            >
              {stat.source}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
