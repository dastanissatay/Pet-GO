import type { ExpenseCategory } from "@/api/contract";

export const EXPENSE_CATEGORIES = [
  "wellness",
  "dental",
  "medication",
  "emergency",
  "food",
  "grooming",
  "other",
] as const satisfies readonly ExpenseCategory[];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  wellness: "Wellness",
  dental: "Dental",
  medication: "Medication",
  emergency: "Emergency",
  food: "Food",
  grooming: "Grooming",
  other: "Other",
};
