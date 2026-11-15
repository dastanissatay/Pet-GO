import { z } from "zod";
import type { FoodPurchaseCreate } from "@/api/contract";
import { cleanAmount } from "@/features/expenses/expenseSchema";
import { formatDate, localDateIso, parseUsDate } from "@/lib/format";

/** Rule of thumb for dry kibble; the bag's own feeding chart is the better guide. */
export const CUPS_PER_POUND = 4;

export const foodPurchaseSchema = z.object({
  date: z
    .string()
    .trim()
    .refine((v) => parseUsDate(v) !== null, "Enter a date as MM/DD/YYYY.")
    .refine((v) => {
      const iso = parseUsDate(v);
      return iso === null || iso <= localDateIso();
    }, "The date can't be in the future."),
  lastsDays: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "Enter a number of days.")
    .refine((v) => Number(v) >= 1 && Number(v) <= 365, "Enter 1 to 365 days."),
  amount: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(cleanAmount(v)),
      "Enter a price like 54.99, or leave it empty.",
    )
    .refine((v) => v === "" || Number(cleanAmount(v)) > 0, "Enter a price above $0."),
});

export type FoodPurchaseValues = z.infer<typeof foodPurchaseSchema>;

export function emptyFoodPurchase(): FoodPurchaseValues {
  return { date: formatDate(localDateIso()), lastsDays: "", amount: "" };
}

export function toFoodPurchaseCreate(values: FoodPurchaseValues): FoodPurchaseCreate {
  const body: FoodPurchaseCreate = {
    bought_on: parseUsDate(values.date) ?? localDateIso(),
    lasts_days: Number(values.lastsDays),
  };
  if (values.amount !== "") body.amount = cleanAmount(values.amount);
  return body;
}

/** Days a bag lasts: pounds × cups per pound ÷ cups a day. Null when the inputs aren't usable. */
export function daysFromBag(pounds: number, cupsPerDay: number): number | null {
  if (!(pounds > 0) || !(cupsPerDay > 0)) return null;
  const days = Math.floor((pounds * CUPS_PER_POUND) / cupsPerDay);
  return Math.min(365, Math.max(1, days));
}

/** Backend field names that map onto form fields, for 422 errors. */
export const FOOD_FIELD_MAP: Record<string, keyof FoodPurchaseValues> = {
  bought_on: "date",
  lasts_days: "lastsDays",
  amount: "amount",
};
