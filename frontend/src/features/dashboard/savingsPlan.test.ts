import { describe, expect, it } from "vitest";
import type { Forecast, Summary } from "@/api/contract";
import { savingsPlan } from "@/features/dashboard/savingsPlan";

const summary: Summary = {
  spent_total: "100.00",
  expected_low: 900,
  expected_typical: 1100,
  expected_high: 1500,
  still_low: 800,
  still_typical: 1000,
  still_high: 1400,
};

const forecast: Forecast = {
  total_low: 900,
  total_typical: 1100,
  total_high: 1500,
  monthly: null,
  items: [
    { category: "Checkups", low: 60, typical: 80, high: 120, note: "", source_urls: [] },
    { category: "Dental", low: 500, typical: 660, high: 1000, note: "", source_urls: [] },
    { category: "Vaccines", low: 340, typical: 360, high: 380, note: "", source_urls: [] },
  ],
  life_stage: "adult",
  region: {
    name: "Texas",
    price_level: 100,
    source_label: "Test",
    source_url: "https://example.com",
    year: 2025,
  },
  schedule_basis: "",
  typical_basis: "",
  typical_source_url: "https://example.com",
};

describe("savingsPlan", () => {
  it("spreads what is still expected over the months left, counting this month", () => {
    const plan = savingsPlan(summary, forecast, new Date(2026, 10, 15));
    expect(plan.monthsLeft).toBe(2);
    expect(plan.perMonthThisYear).toBe(700);
  });

  it("uses the whole year in January and one month in December", () => {
    expect(savingsPlan(summary, forecast, new Date(2026, 0, 3)).monthsLeft).toBe(12);
    const december = savingsPlan(summary, forecast, new Date(2026, 11, 31));
    expect(december.monthsLeft).toBe(1);
    expect(december.perMonthThisYear).toBe(1400);
  });

  it("picks the line with the highest top-of-range cost", () => {
    const plan = savingsPlan(summary, forecast, new Date(2026, 5, 1));
    expect(plan.biggest).toEqual({ category: "Dental", high: 1000, perMonth: 84 });
  });

  it("asks for nothing once the high end is already spent", () => {
    const plan = savingsPlan({ ...summary, still_high: 0 }, forecast, new Date(2026, 5, 1));
    expect(plan.perMonthThisYear).toBe(0);
  });

  it("has no biggest line when the forecast is empty", () => {
    expect(savingsPlan(summary, { ...forecast, items: [] }).biggest).toBeNull();
  });
});
