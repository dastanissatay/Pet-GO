import { describe, expect, it } from "vitest";
import {
  daysFromBag,
  foodPurchaseSchema,
  toFoodPurchaseCreate,
} from "@/features/food/foodPurchaseSchema";

describe("daysFromBag", () => {
  it("uses about 4 cups per pound", () => {
    expect(daysFromBag(30, 4)).toBe(30);
    expect(daysFromBag(15, 1.5)).toBe(40);
  });

  it("stays between 1 and 365 days and rejects empty input", () => {
    expect(daysFromBag(200, 0.5)).toBe(365);
    expect(daysFromBag(0, 2)).toBeNull();
    expect(daysFromBag(10, 0)).toBeNull();
  });
});

describe("foodPurchaseSchema", () => {
  it("accepts a purchase with or without a price", () => {
    expect(
      foodPurchaseSchema.safeParse({ date: "11/01/2026", lastsDays: "30", amount: "" }).success,
    ).toBe(true);
    expect(
      foodPurchaseSchema.safeParse({ date: "11/01/2026", lastsDays: "30", amount: "$54.99" })
        .success,
    ).toBe(true);
  });

  it("rejects zero days and bad prices", () => {
    expect(
      foodPurchaseSchema.safeParse({ date: "11/01/2026", lastsDays: "0", amount: "" }).success,
    ).toBe(false);
    expect(
      foodPurchaseSchema.safeParse({ date: "11/01/2026", lastsDays: "30", amount: "abc" }).success,
    ).toBe(false);
  });

  it("sends the price only when one was given", () => {
    expect(toFoodPurchaseCreate({ date: "11/01/2026", lastsDays: "30", amount: "" })).toEqual({
      bought_on: "2026-11-01",
      lasts_days: 30,
    });
    expect(
      toFoodPurchaseCreate({ date: "11/01/2026", lastsDays: "45", amount: "$1,054.99" }),
    ).toEqual({ bought_on: "2026-11-01", lasts_days: 45, amount: "1054.99" });
  });
});
