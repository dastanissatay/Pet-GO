import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK = [
  { label: "Under 1", value: 0 },
  { label: "1–3", value: 2 },
  { label: "4–7", value: 5 },
  { label: "8+ senior", value: 9 },
] as const;

function inBand(age: number, label: (typeof QUICK)[number]["label"]): boolean {
  if (label === "Under 1") return age === 0;
  if (label === "1–3") return age >= 1 && age <= 3;
  if (label === "4–7") return age >= 4 && age <= 7;
  return age >= 8;
}

interface AgeStepperProps {
  value: number;
  onChange: (age: number) => void;
}

export function AgeStepper({ value, onChange }: AgeStepperProps) {
  const set = (n: number) => onChange(Math.min(30, Math.max(0, n)));
  return (
    <div className="flex flex-col gap-5">
      <div
        role="group"
        aria-label="Age in years"
        className="flex items-center justify-between rounded-hero border-2 border-ink bg-surface px-5 py-6 shadow-hard md:max-w-[460px]"
      >
        <button
          type="button"
          aria-label="One year younger"
          onClick={() => set(value - 1)}
          disabled={value <= 0}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-butter disabled:opacity-40"
        >
          <Minus className="h-7 w-7" strokeWidth={3} aria-hidden="true" />
        </button>
        <div className="text-center">
          <p aria-live="polite" className="money text-[72px] leading-none">
            {value === 0 ? "<1" : value}
          </p>
          <p className="mt-1 font-bold">{value === 1 ? "year" : "years"}</p>
        </div>
        <button
          type="button"
          aria-label="One year older"
          onClick={() => set(value + 1)}
          disabled={value >= 30}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-sun disabled:opacity-40"
        >
          <Plus className="h-7 w-7" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
      <div role="group" aria-label="Quick picks" className="flex flex-wrap gap-2">
        {QUICK.map((q) => {
          const selected = inBand(value, q.label);
          return (
            <button
              key={q.label}
              type="button"
              aria-pressed={selected}
              onClick={() => set(q.value)}
              className={cn(
                "h-11 rounded-full border-2 border-ink px-4 text-sm font-bold",
                selected ? "bg-ink text-surface" : "bg-surface text-ink",
              )}
            >
              {q.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
