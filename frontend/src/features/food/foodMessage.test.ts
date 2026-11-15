import { describe, expect, it } from "vitest";
import type { FoodStatus } from "@/api/contract";
import { foodMessage } from "@/features/food/foodMessage";

const base: FoodStatus = {
  status: "ok",
  last_bought_on: "2026-11-01",
  lasts_days: 30,
  runs_out_on: "2026-12-01",
  buy_by: "2026-11-26",
  days_left: 16,
  buy_ahead_days: 5,
  food_type: "Medium breed adult dry dog food",
  shop_links: [],
};

describe("foodMessage", () => {
  it("says when to order next while there is plenty left", () => {
    const message = foodMessage(base, "Biscuit");
    expect(message.title).toBe("About 16 days of food left");
    expect(message.detail).toMatch(/around 11\/26\/2026/);
  });

  it("warns when food is running low or out", () => {
    expect(foodMessage({ ...base, status: "soon", days_left: 1 }, "Biscuit").title).toBe(
      "Running low: about 1 day of food left",
    );
    expect(foodMessage({ ...base, status: "out", days_left: -3 }, "Biscuit").detail).toMatch(
      /expected to run out on 12\/01\/2026/,
    );
    expect(foodMessage({ ...base, status: "out", days_left: 0 }, "Biscuit").detail).toMatch(
      /runs out today/,
    );
  });

  it("asks for the first bag when nothing is logged", () => {
    expect(foodMessage({ ...base, status: "none" }, "Biscuit").title).toBe("No food logged yet");
  });
});
