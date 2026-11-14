import type { PetRead } from "@/api/contract";
import { Chip } from "@/components/Chip";
import { PetAvatar, stageName } from "@/components/PetAvatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { STAGE_START_XP } from "@/features/quests/api";

interface LevelUpDialogProps {
  pet: PetRead;
  stage: 2 | 3 | null;
  onClose: () => void;
}

export function LevelUpDialog({ pet, stage, onClose }: LevelUpDialogProps) {
  return (
    <Dialog open={stage !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideClose className="max-w-[480px] justify-items-center text-center">
        {stage !== null && (
          <>
            <Chip tone="ink">Level {stage} unlocked</Chip>
            <div className="flex h-[210px] w-[210px] animate-pop-in items-center justify-center rounded-full border-2 border-ink bg-sun">
              <PetAvatar species={pet.species} stage={stage} mood="happy" size={170} label={null} />
            </div>
            <DialogTitle className="text-[36px] leading-none sm:text-[40px]">
              {pet.name} grew up!
            </DialogTitle>
            <DialogDescription className="text-[17px] text-ink">
              {STAGE_START_XP[stage]} XP of daily care. {pet.name} is now a{" "}
              {stageName(pet.species, stage)}.
            </DialogDescription>
            <Button variant="primary" size="lg" className="w-full" onClick={onClose}>
              Keep going
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
