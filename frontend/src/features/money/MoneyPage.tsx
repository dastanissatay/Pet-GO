import { useMemo, useState } from "react";
import type { ExpenseRead } from "@/api/contract";
import { usePetOutlet } from "@/components/usePetOutlet";
import { Button } from "@/components/ui/button";
import { BenchmarkCard } from "@/features/benchmark/BenchmarkCard";
import { ExpensesCard } from "@/features/dashboard/ExpensesCard";
import { MoneyCard } from "@/features/dashboard/MoneyCard";
import { SavingsCard } from "@/features/dashboard/SavingsCard";
import { AddExpenseDialog } from "@/features/expenses/AddExpenseDialog";
import { DeleteExpenseDialog } from "@/features/expenses/DeleteExpenseDialog";
import { expenseToForm } from "@/features/expenses/expenseSchema";
import { PasteReceiptDialog } from "@/features/expenses/PasteReceiptDialog";
import { FoodCard } from "@/features/food/FoodCard";
import { ForecastSection } from "@/features/forecast/ForecastSection";
import { InsuranceCard } from "@/features/insurance/InsuranceCard";
import { describePet } from "@/features/pets/describePet";

type OpenDialog = "add" | "paste" | "edit" | "delete" | null;

const SECTIONS = [
  { id: "spending", label: "Spending" },
  { id: "forecast", label: "Forecast" },
  { id: "food", label: "Food" },
  { id: "savings", label: "Savings" },
  { id: "insurance", label: "Insurance" },
] as const;

/** All the money in one place: what was spent, what's expected, and how to plan for it. */
export function MoneyPage() {
  const pet = usePetOutlet();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  // The row being edited or deleted. Kept after closing so the dialog doesn't change mid-fade.
  const [selected, setSelected] = useState<ExpenseRead | null>(null);
  // Stable, so the edit dialog doesn't reset while open.
  const editValues = useMemo(() => (selected ? expenseToForm(selected) : undefined), [selected]);

  function openFor(kind: "edit" | "delete", expense: ExpenseRead) {
    setSelected(expense);
    setDialog(kind);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[15px] text-muted">{describePet(pet)}</p>
          <h1 className="mt-1 text-[36px] leading-tight sm:text-[44px]">{pet.name}'s money</h1>
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

      <nav
        aria-label="Money sections"
        className="sticky top-0 z-10 -mx-1 flex gap-2 overflow-x-auto bg-background px-1 py-2"
      >
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="shrink-0 rounded-full border-2 border-ink bg-surface px-4 py-2 text-sm font-bold text-ink no-underline hover:bg-sun focus-visible:shadow-focus focus-visible:outline-none"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <section id="spending" aria-label="Spending" className="flex scroll-mt-20 flex-col gap-6">
        <MoneyCard petId={pet.id} />
        <ExpensesCard
          petId={pet.id}
          petName={pet.name}
          onAdd={() => setDialog("add")}
          onPaste={() => setDialog("paste")}
          onEdit={(expense) => openFor("edit", expense)}
          onDelete={(expense) => openFor("delete", expense)}
        />
      </section>

      <section id="forecast" aria-label="Forecast" className="flex scroll-mt-20 flex-col gap-6">
        <BenchmarkCard petId={pet.id} petName={pet.name} />
        <ForecastSection pet={pet} />
      </section>

      <section id="food" aria-label="Food" className="scroll-mt-20">
        <FoodCard petId={pet.id} petName={pet.name} />
      </section>

      <section id="savings" aria-label="Savings" className="scroll-mt-20">
        <SavingsCard petId={pet.id} petName={pet.name} />
      </section>

      <section id="insurance" aria-label="Insurance" className="scroll-mt-20">
        <InsuranceCard petId={pet.id} petName={pet.name} />
      </section>

      <AddExpenseDialog
        petId={pet.id}
        open={dialog === "add"}
        onOpenChange={(open) => setDialog(open ? "add" : null)}
        onSwitchToPaste={() => setDialog("paste")}
      />
      <AddExpenseDialog
        petId={pet.id}
        open={dialog === "edit"}
        onOpenChange={(open) => setDialog(open ? "edit" : null)}
        initialValues={editValues}
        expenseId={selected?.id}
      />
      <DeleteExpenseDialog
        petId={pet.id}
        expense={selected}
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
      />
      <PasteReceiptDialog
        petId={pet.id}
        open={dialog === "paste"}
        onOpenChange={(open) => setDialog(open ? "paste" : null)}
      />
    </div>
  );
}
