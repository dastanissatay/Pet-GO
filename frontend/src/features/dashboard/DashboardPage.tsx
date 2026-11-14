import { useState } from "react";
import { usePetOutlet } from "@/components/usePetOutlet";
import { Button } from "@/components/ui/button";
import { DecodeEntryCard } from "@/features/dashboard/DecodeEntryCard";
import { ExpensesCard } from "@/features/dashboard/ExpensesCard";
import { MoneyCard } from "@/features/dashboard/MoneyCard";
import { PetCard } from "@/features/dashboard/PetCard";
import { QuestsSection } from "@/features/dashboard/QuestsSection";
import { WelcomeBanner } from "@/features/dashboard/WelcomeBanner";
import { AddExpenseDialog } from "@/features/expenses/AddExpenseDialog";
import { useExpenses } from "@/features/expenses/api";
import { PasteReceiptDialog } from "@/features/expenses/PasteReceiptDialog";
import { useProgress } from "@/features/quests/api";
import { todayUs } from "@/lib/format";

type OpenDialog = "add" | "paste" | null;

export function DashboardPage() {
  const pet = usePetOutlet();
  const progress = useProgress(pet.id);
  const expenses = useExpenses(pet.id);
  const [dialog, setDialog] = useState<OpenDialog>(null);

  const firstVisit = progress.data?.xp === 0 && expenses.data?.total === 0;

  return (
    <div className="flex flex-col gap-6">
      {firstVisit ? (
        <WelcomeBanner petName={pet.name} />
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[15px] text-muted">{todayUs()}</p>
            <h1 className="mt-1 text-[36px] leading-tight sm:text-[44px]">Hi, {pet.name}'s family</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setDialog("paste")}>
              Paste a receipt
            </Button>
            <Button variant="primary" onClick={() => setDialog("add")}>
              Add expense
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <PetCard pet={pet} />
          <QuestsSection pet={pet} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <MoneyCard petId={pet.id} />
          <ExpensesCard
            petId={pet.id}
            petName={pet.name}
            onAdd={() => setDialog("add")}
            onPaste={() => setDialog("paste")}
          />
          <DecodeEntryCard />
        </div>
      </div>

      <AddExpenseDialog
        petId={pet.id}
        open={dialog === "add"}
        onOpenChange={(open) => setDialog(open ? "add" : null)}
        onSwitchToPaste={() => setDialog("paste")}
      />
      <PasteReceiptDialog
        petId={pet.id}
        open={dialog === "paste"}
        onOpenChange={(open) => setDialog(open ? "paste" : null)}
      />
    </div>
  );
}
