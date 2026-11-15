import { useState } from "react";
import { BuyFoodDialog } from "@/features/food/BuyFoodDialog";
import { useFoodStatus } from "@/features/food/api";
import { FoodStatusPanel } from "@/features/food/FoodStatusPanel";

/** Home shows the food status only when it needs action: running low or out. */
export function FoodReminder({ petId, petName }: { petId: string; petName: string }) {
  const status = useFoodStatus(petId);
  const [open, setOpen] = useState(false);

  // Quiet while loading or on error: Money > Food shows the full state.
  if (!status.data || (status.data.status !== "soon" && status.data.status !== "out")) {
    return null;
  }

  return (
    <>
      <FoodStatusPanel status={status.data} petName={petName} onLogBag={() => setOpen(true)} />
      <BuyFoodDialog petId={petId} petName={petName} open={open} onOpenChange={setOpen} />
    </>
  );
}
