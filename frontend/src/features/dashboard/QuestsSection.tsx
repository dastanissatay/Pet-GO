import { useState } from "react";
import { toast } from "sonner";
import type { PetRead, Quest } from "@/api/contract";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelUpDialog } from "@/features/dashboard/LevelUpDialog";
import { QuestGroup } from "@/features/dashboard/QuestGroup";
import { useCompleteQuest, useQuests, useUndoQuest } from "@/features/quests/api";
import { errorMessage } from "@/lib/api";

export function QuestsSection({ pet }: { pet: PetRead }) {
  const quests = useQuests(pet.id);
  const complete = useCompleteQuest(pet.id);
  const undo = useUndoQuest(pet.id);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [levelUpStage, setLevelUpStage] = useState<2 | 3 | null>(null);

  function onComplete(quest: Quest) {
    complete.mutate(quest.id, {
      onSuccess: (result) => {
        setJustDone(quest.id);
        toast(`+${quest.xp} XP · ${quest.title}`, {
          action: { label: "Undo", onClick: () => undo.mutate(quest.id) },
        });
        if (result.leveled_up && result.progress.stage > 1) {
          setLevelUpStage(result.progress.stage === 3 ? 3 : 2);
        }
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  if (quests.isPending) {
    return (
      <div className="grid grid-cols-2 gap-3.5">
        <Skeleton className="h-[140px] rounded-[20px]" />
        <Skeleton className="h-[140px] rounded-[20px]" />
      </div>
    );
  }
  if (quests.isError) {
    return (
      <ErrorState
        title="Quests didn't load"
        error={quests.error}
        onRetry={() => void quests.refetch()}
      />
    );
  }

  const { daily, weekly, monthly } = quests.data;
  const pendingId = complete.isPending ? (complete.variables ?? null) : null;
  const allDailyDone = daily.length > 0 && daily.every((q) => q.completed);
  const shared = { pendingId, justDone, onComplete };

  return (
    <section aria-labelledby="quests-title" className="flex flex-col gap-5">
      <h2 id="quests-title" className="text-[26px]">
        Quests
      </h2>
      {daily.length === 0 && (
        <p className="rounded-[20px] border-2 border-dashed border-ink p-4">
          No quests today. Enjoy the day off.
        </p>
      )}
      <QuestGroup
        id="quests-today"
        title="Today"
        resets="Resets at midnight"
        tone="sun"
        quests={daily}
        {...shared}
        footer={
          allDailyDone && (
            <p className="rounded-button border-2 border-ink bg-surface px-4 py-3 text-sm font-medium">
              All done for today. Come back tomorrow to keep the streak going.
            </p>
          )
        }
      />
      <QuestGroup
        id="quests-week"
        title="This week"
        resets="Resets on Monday"
        tone="mint"
        quests={weekly}
        {...shared}
      />
      <QuestGroup
        id="quests-month"
        title="This month"
        resets="Resets on the 1st"
        tone="lilac"
        quests={monthly}
        {...shared}
      />
      <LevelUpDialog pet={pet} stage={levelUpStage} onClose={() => setLevelUpStage(null)} />
    </section>
  );
}
