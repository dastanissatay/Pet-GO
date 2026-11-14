import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { QuestsSection } from "@/features/dashboard/QuestsSection";
import { getDeviceId } from "@/lib/device";
import { createPet, SAMPLES, userFor } from "@/mocks/db";
import { renderWithProviders } from "@/test/render";

describe("QuestsSection", () => {
  it("completes a daily quest and marks it done", async () => {
    const pet = createPet(userFor(getDeviceId()), SAMPLES.pet);
    renderWithProviders(<QuestsSection pet={pet} />);

    const quest = await screen.findByRole("button", { name: /mark done: brush biscuit's teeth/i });
    await userEvent.click(quest);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /brush biscuit's teeth, done/i })).toBeDisabled(),
    );
  });

  it("shows an error with retry when quests fail to load", async () => {
    const pet = { ...SAMPLES.pet, id: "00000000-0000-4000-8000-999999999999" };
    renderWithProviders(<QuestsSection pet={pet} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/quests didn't load/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
