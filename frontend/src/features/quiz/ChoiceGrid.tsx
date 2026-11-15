import { Check } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

export interface Choice<T extends string | boolean> {
  value: T;
  label: string;
  hint?: string;
  visual?: React.ReactNode;
  tone?: "surface" | "sky" | "lilac" | "mint";
}

interface ChoiceGridProps<T extends string | boolean> {
  label: string;
  choices: Choice<T>[];
  value: T | null | undefined;
  onPick: (value: T) => void;
  layout?: "cards" | "rows";
  describedBy?: string;
}

const TONES = { surface: "bg-surface", sky: "bg-sky", lilac: "bg-lilac", mint: "bg-mint" } as const;

/** Big tappable answers. Buttons, so Enter and Space pick and advance. */
export function ChoiceGrid<T extends string | boolean>({
  label,
  choices,
  value,
  onPick,
  layout = "cards",
  describedBy,
}: ChoiceGridProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className={cn(
        layout === "cards"
          ? "grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]"
          : "flex flex-col gap-3",
      )}
    >
      {choices.map((choice) => {
        const selected = value === choice.value;
        return (
          <button
            key={String(choice.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(choice.value)}
            className={cn(
              "flex rounded-card border-ink text-left text-ink transition-transform duration-100 active:translate-y-px",
              layout === "cards"
                ? "min-h-[170px] flex-col items-center justify-center gap-3 p-5 text-center"
                : "items-center gap-4 px-5 py-4",
              selected
                ? "border-[3px] bg-mint shadow-hard-lg"
                : cn("border-2 hover:-translate-y-px", TONES[choice.tone ?? "surface"]),
            )}
          >
            {choice.visual}
            <span className={layout === "rows" ? "flex-1" : undefined}>
              <span className="block font-display text-[22px] font-extrabold leading-tight sm:text-2xl">
                {choice.label}
              </span>
              {choice.hint && (
                <span className="mt-1 block text-[15px] text-muted">{choice.hint}</span>
              )}
            </span>
            {selected && layout === "rows" && (
              <Check className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
