import { Pencil } from "lucide-react";
import type { PetRead } from "@/api/contract";
import { Chip } from "@/components/Chip";
import { ErrorState } from "@/components/ErrorState";
import { PetAvatar, stageName } from "@/components/PetAvatar";
import { SpeechBubble } from "@/components/SpeechBubble";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { XpBar } from "@/components/XpBar";
import { PetPhoto } from "@/features/pets/PetPhoto";
import { STAGE_START_XP, useProgress, useQuests } from "@/features/quests/api";

function bubbleText(petName: string, nextQuest: string | undefined, xp: number): string {
  if (xp === 0) return `Hi, I'm ${petName}! Do one quest and I'll start growing.`;
  if (nextQuest) return `${nextQuest}? It helps keep my vet bills down.`;
  return "All done for today. Thank you!";
}

export function PetCard({ pet, onEdit }: { pet: PetRead; onEdit: () => void }) {
  const progress = useProgress(pet.id);
  const quests = useQuests(pet.id);

  if (progress.isPending) return <Skeleton className="h-[330px] rounded-hero" />;
  if (progress.isError)
    return <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />;

  const { xp, level, stage, next_level_xp: nextLevelXp, streak } = progress.data;
  const nextQuest = quests.data?.daily.find((q) => !q.completed)?.title;

  return (
    <section
      aria-label={`${pet.name}, level ${level}`}
      className="flex flex-col gap-4 rounded-hero border-2 border-ink bg-mint p-6 shadow-hard-lg"
    >
      <div className="flex items-end gap-4">
        <PetAvatar
          species={pet.species}
          stage={stage}
          size={stage === 1 ? 120 : 150}
          label={null}
        />
        <SpeechBubble>{bubbleText(pet.name, nextQuest, xp)}</SpeechBubble>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-1">
          <h2 className="text-[30px]">{pet.name}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit ${pet.name}'s details`}
            onClick={onEdit}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <span className="text-[15px] font-bold">
          Level {level} · {stageName(pet.species, stage)}
        </span>
      </div>
      <XpBar xp={xp} nextLevelXp={nextLevelXp} levelStartXp={STAGE_START_XP[stage]} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
        <span>
          {nextLevelXp === null
            ? `${xp} XP · top level`
            : `${xp} / ${nextLevelXp} XP to level ${level + 1}`}
        </span>
        {streak > 0 ? (
          <Chip tone="coral">{streak}-day streak</Chip>
        ) : (
          <Chip tone="dashed">Start a streak today</Chip>
        )}
      </div>
      <div className="border-t-2 border-dashed border-ink/30 pt-4">
        <PetPhoto petId={pet.id} petName={pet.name} />
      </div>
    </section>
  );
}
