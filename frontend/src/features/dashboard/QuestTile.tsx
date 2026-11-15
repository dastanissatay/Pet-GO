import { Check } from "lucide-react";
import type { Quest } from "@/api/contract";
import { Chip } from "@/components/Chip";
import { formatUsdRange } from "@/lib/format";
import { cn } from "@/lib/utils";

interface QuestTileProps {
  quest: Quest;
  pending: boolean;
  celebrate: boolean;
  onComplete: () => void;
}

/** One quest card. Fills its grid cell so every card in a row has the same height. */
export function QuestTile({ quest, pending, celebrate, onComplete }: QuestTileProps) {
  const done = quest.completed;
  const cost = quest.typical_cost;

  return (
    <button
      type="button"
      onClick={onComplete}
      disabled={done || pending}
      aria-pressed={done}
      aria-label={done ? `${quest.title}, done` : `Mark done: ${quest.title}, plus ${quest.xp} XP`}
      className={cn(
        "relative flex h-full flex-col gap-2 rounded-[20px] border-2 border-ink p-4 text-left text-ink transition-transform duration-100",
        done
          ? "cursor-default bg-lilac"
          : "bg-surface shadow-hard hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-hard-pressed",
        pending && "opacity-70",
      )}
    >
      {celebrate && (
        <span
          aria-hidden="true"
          className="money pointer-events-none absolute -top-2 right-4 animate-float-up text-xl"
        >
          +{quest.xp} XP
        </span>
      )}
      <Chip tone={done ? "surface" : "sun"} size="sm" className="self-start">
        {done ? (
          <>
            <Check className="h-3 w-3" strokeWidth={4} aria-hidden="true" />
            Done
          </>
        ) : (
          `+${quest.xp} XP`
        )}
      </Chip>
      <span className={cn("text-[17px] font-bold leading-tight", done && "line-through")}>
        {quest.title}
      </span>
      {/* Pinned to the bottom, so this line sits level across a row. */}
      <span className="mt-auto pt-1 text-[13px] text-muted">
        {done
          ? `+${quest.xp} XP earned`
          : cost
            ? `Typical ${cost.name}: ${formatUsdRange(cost.low, cost.high)}`
            : quest.why}
      </span>
    </button>
  );
}
