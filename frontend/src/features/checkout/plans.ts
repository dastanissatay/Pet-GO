import type { PaidPlan } from "@/api/contract";

/** Prices under test (spec section 3). Display strings only; nothing is charged. */
export const PLANS: Record<PaidPlan, { label: string; price: string; perMonth: string }> = {
  yearly: { label: "Yearly", price: "$59.99", perMonth: "$5.00 a month" },
  monthly: { label: "Monthly", price: "$9.99", perMonth: "Cancel anytime" },
};
