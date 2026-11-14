/**
 * TEMPORARY hand-written mirror of the API contract in docs/SPEC.md section 7.
 *
 * Why it exists: the backend is being built in parallel, so there is no OpenAPI
 * schema to generate from yet. As soon as `make gen-api` produces
 * `src/api/generated/schema.ts`, replace each type below with an alias to the
 * generated one (e.g. `export type PetRead = components["schemas"]["PetRead"]`)
 * and keep this file only as that alias layer. Never grow it by hand after that.
 */
import type { MoneyValue } from "@/lib/format";

export type Species = "dog" | "cat";
export type SizeClass = "small" | "medium" | "large";
export type Worry = "surprise" | "monthly" | "normal";
export type Plan = "free" | "monthly" | "yearly";
export type PaidPlan = Exclude<Plan, "free">;
export type ExpenseCategory =
  "wellness" | "dental" | "medication" | "emergency" | "food" | "grooming" | "other";

export interface Page<T> {
  items: T[];
  total: number;
}

export interface Me {
  plan: Plan;
  free_decodes_left: number;
}

export interface PetCreate {
  name: string;
  species: Species;
  breed: string;
  age_years: number;
  size_class: SizeClass | null;
  zip: string;
  insured: boolean;
  worry: Worry;
}

export interface PetRead extends PetCreate {
  id: string;
}

export interface Samples {
  pet: PetCreate;
  estimate_text: string;
  receipt_text: string;
}

export interface Breed {
  name: string;
  species: Species;
}

export interface ForecastItem {
  category: string;
  low: number;
  high: number;
  note: string;
  source_urls: string[];
}

export interface Forecast {
  total_low: number;
  total_high: number;
  items: ForecastItem[];
  /** 12 midpoint amounts Jan-Dec. Null on the free plan. */
  monthly: number[] | null;
}

export interface Progress {
  xp: number;
  level: number;
  stage: 1 | 2 | 3;
  next_level_xp: number | null;
  streak: number;
}

export interface TypicalCost {
  name: string;
  low: number;
  high: number;
}

export interface Quest {
  id: string;
  title: string;
  cadence: "daily" | "weekly";
  xp: number;
  why: string;
  completed: boolean;
  typical_cost: TypicalCost | null;
}

export interface QuestList {
  daily: Quest[];
  weekly: Quest[];
}

export interface CompleteQuestResult {
  progress: Progress;
  leveled_up: boolean;
}

export interface ExpenseCreate {
  amount: string;
  spent_on: string;
  category: ExpenseCategory;
  note: string | null;
}

export interface ExpenseRead {
  id: string;
  amount: MoneyValue;
  spent_on: string;
  category: ExpenseCategory;
  note: string | null;
}

export interface ExpenseDraft {
  amount: MoneyValue | null;
  spent_on: string | null;
  category: ExpenseCategory;
  note: string | null;
}

export interface Summary {
  spent_total: MoneyValue;
  expected_low: number;
  expected_high: number;
  still_low: number;
  still_high: number;
}

export interface SubscriptionCreate {
  plan: PaidPlan;
}

export type DecodeVerdict = "within" | "above" | "below" | "unknown";

export interface EstimateLine {
  raw_text: string;
  description: string;
  charged: MoneyValue;
  matched_id: string | null;
  range: { low: number; high: number } | null;
  verdict: DecodeVerdict;
  explanation: string;
  question_for_vet: string | null;
  source_url: string | null;
}

export interface DecodeCounts {
  within: number;
  above: number;
  below: number;
  unknown: number;
}

export interface DecodeResult {
  lines: EstimateLine[];
  total_charged: MoneyValue;
  summary: string;
  counts: DecodeCounts;
}
