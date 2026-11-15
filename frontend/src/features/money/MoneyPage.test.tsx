import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Outlet, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { PetRead } from "@/api/contract";
import { MoneyPage } from "@/features/money/MoneyPage";
import { getDeviceId } from "@/lib/device";
import { addExpense, createPet, SAMPLES, userFor } from "@/mocks/db";
import { renderWithProviders } from "@/test/render";

function renderMoney(pet: PetRead) {
  function PetRoute() {
    return <Outlet context={pet} />;
  }
  return renderWithProviders(
    <Routes>
      <Route element={<PetRoute />}>
        <Route path="/money" element={<MoneyPage />} />
      </Route>
    </Routes>,
    { route: "/money" },
  );
}

function seed() {
  const user = userFor(getDeviceId());
  const pet = createPet(user, SAMPLES.pet);
  addExpense(user, { amount: "40.00", spent_on: "2026-01-10", category: "wellness", note: "Exam" });
  return { user, pet };
}

describe("MoneyPage expense rows", () => {
  it("edits an expense", async () => {
    const { pet } = seed();
    renderMoney(pet);

    await userEvent.click(await screen.findByRole("button", { name: /edit exam, 01\/10\/2026/i }));
    const dialog = await screen.findByRole("dialog", { name: /edit expense/i });
    const amount = within(dialog).getByLabelText(/amount/i);
    await userEvent.clear(amount);
    await userEvent.type(amount, "55.50");
    await userEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));

    const table = await screen.findByRole("table");
    await waitFor(() => expect(within(table).getByText("$55.50")).toBeInTheDocument());
  });

  it("deletes an expense after confirming", async () => {
    const { pet, user } = seed();
    renderMoney(pet);

    await userEvent.click(
      await screen.findByRole("button", { name: /delete exam, 01\/10\/2026/i }),
    );
    const dialog = await screen.findByRole("dialog", { name: /delete this expense/i });
    await userEvent.click(within(dialog).getByRole("button", { name: /delete expense/i }));

    expect(await screen.findByText(/track your first vet bill/i)).toBeInTheDocument();
    expect(user.expenses).toHaveLength(0);
  });
});
