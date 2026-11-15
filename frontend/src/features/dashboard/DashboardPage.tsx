import { useState } from "react";
import { usePetOutlet } from "@/components/usePetOutlet";
import { PetCard } from "@/features/dashboard/PetCard";
import { QuestsSection } from "@/features/dashboard/QuestsSection";
import { WelcomeBanner } from "@/features/dashboard/WelcomeBanner";
import { useExpenses } from "@/features/expenses/api";
import { FoodReminder } from "@/features/food/FoodReminder";
import { EditPetDialog } from "@/features/pets/EditPetDialog";
import { useProgress } from "@/features/quests/api";
import { todayUs } from "@/lib/format";

/** Home: the pet, its progress and photo, and today's quests. Money lives on its own page. */
export function DashboardPage() {
  const pet = usePetOutlet();
  const progress = useProgress(pet.id);
  const expenses = useExpenses(pet.id);
  const [editOpen, setEditOpen] = useState(false);

  const firstVisit = progress.data?.xp === 0 && expenses.data?.total === 0;

  return (
    <div className="flex flex-col gap-8">
      {firstVisit ? (
        <WelcomeBanner petName={pet.name} />
      ) : (
        <div>
          <p className="text-[15px] text-muted">{todayUs()}</p>
          <h1 className="mt-1 text-[36px] leading-tight sm:text-[44px]">Hi, {pet.name}'s family</h1>
        </div>
      )}

      <FoodReminder petId={pet.id} petName={pet.name} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Stays in view while the quest list scrolls past it. */}
        <div className="xl:sticky xl:top-6">
          <PetCard pet={pet} onEdit={() => setEditOpen(true)} />
        </div>
        <QuestsSection pet={pet} />
      </div>

      <EditPetDialog pet={pet} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
