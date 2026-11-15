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

export type PetUpdate = Partial<PetCreate>;

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
  /** National average prices at the middle visit count. Always between low and high. */
  typical: number;
  high: number;
  note: string;
  source_urls: string[];
}

export type LifeStage = "young" | "adult" | "senior";

/** Local price level used for vet prices. 100 is the US average. */
export interface Region {
  name: string;
  price_level: number;
  source_label: string;
  source_url: string;
  year: number;
}

export interface Forecast {
  total_low: number;
  total_typical: number;
  total_high: number;
  items: ForecastItem[];
  /** 12 midpoint amounts Jan-Dec. Null on the free plan. */
  monthly: number[] | null;
  life_stage: LifeStage;
  region: Region;
  schedule_basis: string;
  typical_basis: string;
  typical_source_url: string;
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

export type QuestCadence = "daily" | "weekly" | "monthly";

export interface Quest {
  id: string;
  title: string;
  cadence: QuestCadence;
  xp: number;
  why: string;
  completed: boolean;
  typical_cost: TypicalCost | null;
}

export interface QuestList {
  daily: Quest[];
  weekly: Quest[];
  monthly: Quest[];
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

export type ExpenseUpdate = Partial<ExpenseCreate>;

export interface ExpenseDraft {
  amount: MoneyValue | null;
  spent_on: string | null;
  category: ExpenseCategory;
  note: string | null;
}

export interface Summary {
  spent_total: MoneyValue;
  expected_low: number;
  expected_typical: number;
  expected_high: number;
  still_low: number;
  still_typical: number;
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
  /** Typical local price with a band around it. typical is missing on older saved decodes. */
  range: { low: number; high: number; typical?: number | null } | null;
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
  /** Where typical prices were set for, e.g. "Texas". Missing on older saved decodes. */
  area?: string | null;
}

export interface DecodeHistoryItem {
  id: string;
  pet_id: string | null;
  created_at: string;
  total_charged: MoneyValue;
  result: DecodeResult;
}

export interface UnexpectedCost {
  price_id: string;
  name: string;
  low: number;
  high: number;
  source_url: string;
}

export interface InsuranceCheck {
  species: Species;
  insured: boolean;
  average_annual_premium: MoneyValue;
  average_monthly_premium: MoneyValue;
  premium_source_label: string;
  premium_source_url: string;
  routine_low: number;
  routine_high: number;
  unexpected_costs: UnexpectedCost[];
}

export interface ShopLink {
  store: string;
  url: string;
}

export interface SourceRef {
  label: string;
  url: string;
}

export interface FoodPlan {
  species: Species;
  life_stage: LifeStage;
  food_type: string;
  annual_low: number;
  annual_typical: number;
  annual_high: number;
  daily_kcal_low: number;
  daily_kcal_high: number;
  pounds_per_year_low: number;
  pounds_per_year_high: number;
  /** The weight range the estimate assumes, e.g. "Golden Retriever, 55-75 lb". */
  weight_basis: string;
  basis: string;
  sources: SourceRef[];
  tip: string;
  shop_links: ShopLink[];
}

export interface Benchmark {
  species: Species;
  us_average_vet_care: number;
  year: number;
  source_label: string;
  source_url: string;
  forecast_low: number;
  forecast_typical: number;
  forecast_high: number;
  /** Forecast categories left out so the comparison matches "vet care". */
  excluded_categories: string[];
}

export interface FoodPurchaseCreate {
  bought_on: string;
  lasts_days: number;
  amount?: string;
}

export interface FoodPurchase {
  id: string;
  bought_on: string;
  lasts_days: number;
  expense_id: string | null;
}

export interface FoodStatus {
  status: "none" | "ok" | "soon" | "out";
  last_bought_on: string | null;
  lasts_days: number | null;
  runs_out_on: string | null;
  buy_by: string | null;
  days_left: number | null;
  buy_ahead_days: number;
  food_type: string;
  shop_links: ShopLink[];
}
