import { cn } from "@/lib/utils";

interface PillRadioGroupProps<T extends string> {
  legend: string;
  name: string;
  value: T | null;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** A row of pill-shaped radio buttons inside a fieldset. Keyboard works as native radios. */
export function PillRadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: PillRadioGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex h-11 cursor-pointer items-center rounded-full border-2 border-ink px-4 text-sm font-bold has-[:focus-visible]:shadow-focus",
                selected ? "bg-ink text-surface" : "bg-surface text-ink",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
