import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { PetRead } from "@/api/contract";
import { PetAvatar } from "@/components/PetAvatar";
import { cn } from "@/lib/utils";

function steps(pet: PetRead): string[] {
  const age = pet.age_years === 0 ? "a young pet" : `age ${pet.age_years}`;
  return [
    `Finding routine care for a ${pet.breed}`,
    pet.size_class ? `Adjusting for size and ${age}` : `Adjusting for ${age}`,
    "Adding up the yearly range",
  ];
}

/** Shown while the forecast request runs. Steps advance on a timer for readability. */
export function BuildingPlan({ pet }: { pet: PetRead }) {
  const [active, setActive] = useState(0);
  const list = steps(pet);

  useEffect(() => {
    const timer = setInterval(() => setActive((i) => Math.min(i + 1, list.length - 1)), 600);
    return () => clearInterval(timer);
  }, [list.length]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="container flex flex-wrap items-center justify-center gap-14 py-16"
    >
      <div className="flex h-[260px] w-[260px] items-center justify-center rounded-full border-2 border-ink bg-sky shadow-hard-lg">
        <PetAvatar species={pet.species} stage={1} mood="happy" size={190} label={null} />
      </div>
      <div className="flex max-w-[520px] flex-1 basis-[380px] flex-col gap-5">
        <h1 className="text-[40px] leading-none sm:text-[52px]">Building {pet.name}'s plan…</h1>
        <ul className="flex flex-col gap-3">
          {list.map((step, i) => {
            const done = i < active;
            const current = i === active;
            return (
              <li
                key={step}
                className={cn(
                  "flex items-center gap-3.5 rounded-[18px] border-2 border-ink px-4 py-4 text-[17px]",
                  current ? "bg-sun font-bold" : "bg-surface font-medium",
                )}
              >
                {done ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-mint">
                    <Check className="h-4 w-4" strokeWidth={4} aria-hidden="true" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "h-7 w-7 rounded-full border-[3px] border-ink",
                      current ? "animate-spin border-t-transparent" : "border-dashed opacity-50",
                    )}
                  />
                )}
                {step}
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted">
          Prices come from US sources. Each one is linked in your plan.
        </p>
      </div>
    </div>
  );
}
