import { Check, Search } from "lucide-react";
import { useDeferredValue, useId, useState } from "react";
import type { Species } from "@/api/contract";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useBreeds } from "@/features/pets/api";
import { cn } from "@/lib/utils";

export const MIXED_BREED = "Mixed / not sure";

interface BreedPickerProps {
  species: Species;
  value: string;
  onChange: (breed: string) => void;
  error?: string;
  errorId: string;
}

export function BreedPicker({ species, value, onChange, error, errorId }: BreedPickerProps) {
  const [query, setQuery] = useState(value === MIXED_BREED ? "" : value);
  const deferred = useDeferredValue(query.trim());
  const breeds = useBreeds(species, deferred);
  const inputId = useId();
  const listId = useId();
  const items = (breeds.data?.items ?? []).filter((b) => b.name !== MIXED_BREED).slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-[15px] font-bold">
          Search breeds
        </label>
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
            strokeWidth={2.5}
            aria-hidden="true"
          />
          <Input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Labrador"
            autoComplete="off"
            aria-controls={listId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="pl-12"
          />
        </div>
      </div>

      <div id={listId} role="group" aria-label="Breed results" aria-busy={breeds.isFetching}>
        {breeds.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : breeds.isError ? (
          <p className="rounded-button border-2 border-ink bg-surface p-4">
            Breeds didn't load. Type your breed above, or choose Mixed / not sure.
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-button border-2 border-dashed border-ink p-4">
            No match for "{deferred}". Keep "{query.trim() || "your answer"}" or choose Mixed / not
            sure.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-[18px] border-2 border-ink bg-surface">
            {items.map((breed) => {
              const selected = value === breed.name;
              return (
                <li key={breed.name} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onChange(breed.name);
                      setQuery(breed.name);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3.5 text-left text-base",
                      selected ? "bg-mint font-bold" : "hover:bg-butter",
                    )}
                  >
                    {breed.name}
                    {selected && <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Button
        type="button"
        variant={value === MIXED_BREED ? "dark" : "secondary"}
        aria-pressed={value === MIXED_BREED}
        className="border-dashed"
        onClick={() => onChange(MIXED_BREED)}
      >
        {MIXED_BREED}
      </Button>

      {query.trim() &&
        value !== query.trim() &&
        value !== MIXED_BREED &&
        items.every((b) => b.name !== query.trim()) && (
          <Button
            type="button"
            variant="link"
            className="self-start px-0"
            onClick={() => onChange(query.trim())}
          >
            Use "{query.trim()}" as the breed
          </Button>
        )}

      {error && (
        <p id={errorId} role="alert" className="text-[15px] font-bold text-error">
          {error}
        </p>
      )}
    </div>
  );
}
