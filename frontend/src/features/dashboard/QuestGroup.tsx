import type * as React from "react";
import type { Quest } from "@/api/contract";
import { QuestTile } from "@/features/dashboard/QuestTile";
import { cn } from "@/lib/utils";

const TONES = { sun: "bg-sun", mint: "bg-mint", lilac: "bg-lilac" } as const;

interface QuestGroupProps {
  id: string;
  title: string;
  /** When the group starts over, e.g. "Resets at midnight". */
  resets: string;
  tone: "sun" | "mint" | "lilac";
  quests: Quest[];
  pendingId: string | null;
  justDone: string | null;
  onComplete: (quest: Quest) => void;
  /** Shown under the cards, e.g. a note once everything is done. */
  footer?: React.ReactNode;
}

/** A labelled set of quests that share a cadence: today, this week or this month. */
export function QuestGroup({
  id,
  title,
  resets,
  tone,
  quests,
  pendingId,
  justDone,
  onComplete,
  footer,
}: QuestGroupProps) {
  if (quests.length === 0) return null;
  const doneCount = quests.filter((quest) => quest.completed).length;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 border-t-2 border-dashed border-ink/30 pt-5 first-of-type:border-t-0 first-of-type:pt-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3
            id={`${id}-title`}
            className={cn(
              "rounded-full border-2 border-ink px-3 py-1 text-sm font-bold",
              TONES[tone],
            )}
          >
            {title}
          </h3>
          <span className="text-sm text-muted">{resets}</span>
        </div>
        <span className="text-sm font-bold">
          {doneCount} of {quests.length} done
        </span>
      </div>
      <ul className="grid auto-rows-fr grid-cols-1 gap-3.5 sm:grid-cols-2">
        {quests.map((quest) => (
          <li key={quest.id}>
            <QuestTile
              quest={quest}
              pending={pendingId === quest.id}
              celebrate={justDone === quest.id}
              onComplete={() => onComplete(quest)}
            />
          </li>
        ))}
      </ul>
      {footer}
    </section>
  );
}
