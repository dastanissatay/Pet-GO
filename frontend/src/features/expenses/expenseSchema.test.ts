import { describe, expect, it } from "vitest";
import { expenseFormSchema, toExpenseCreate, type ExpenseFormValues } from "@/features/expenses/expenseSchema";

const valid: ExpenseFormValues = { amount: "$1,086.5", date: "10/28/2026", category: "wellness", note: " " };

describe("expenseFormSchema", () => {
  it("accepts dollar signs and commas", () => {
    expect(expenseFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["0", "-5", "12.345", "lots"])("rejects amount %s", (amount) => {
    expect(expenseFormSchema.safeParse({ ...valid, amount }).success).toBe(false);
  });

  it("rejects dates that are not MM/DD/YYYY", () => {
    expect(expenseFormSchema.safeParse({ ...valid, date: "2026-10-28" }).success).toBe(false);
  });

  it("rejects future dates", () => {
    expect(expenseFormSchema.safeParse({ ...valid, date: "01/01/2999" }).success).toBe(false);
  });

  it("builds the API body with an ISO date, 2 decimals and no empty note", () => {
    expect(toExpenseCreate(valid)).toEqual({
      amount: "1086.50",
      spent_on: "2026-10-28",
      category: "wellness",
      note: null,
    });
  });
});
