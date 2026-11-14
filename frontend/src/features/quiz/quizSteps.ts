import type { QuizValues } from "@/features/quiz/quizSchema";

export type StepId = "species" | "name" | "breed" | "age" | "size" | "zip" | "insured" | "worry";

export interface StepDef {
  id: StepId;
  field: keyof QuizValues;
  /** Single-choice steps advance on their own after a pick. */
  autoAdvance: boolean;
}

export const STEPS: readonly StepDef[] = [
  { id: "species", field: "species", autoAdvance: true },
  { id: "name", field: "name", autoAdvance: false },
  { id: "breed", field: "breed", autoAdvance: false },
  { id: "age", field: "age_years", autoAdvance: false },
  { id: "size", field: "size_class", autoAdvance: true },
  { id: "zip", field: "zip", autoAdvance: false },
  { id: "insured", field: "insured", autoAdvance: true },
  { id: "worry", field: "worry", autoAdvance: false },
];

export function isSkipped(step: StepDef, values: Partial<QuizValues>): boolean {
  return step.id === "size" && values.species === "cat";
}

/** Steps the user actually sees, given current answers. */
export function visibleSteps(values: Partial<QuizValues>): StepDef[] {
  return STEPS.filter((step) => !isSkipped(step, values));
}

export function stepIndexForField(field: string, values: Partial<QuizValues>): number {
  return visibleSteps(values).findIndex((step) => step.field === field);
}
