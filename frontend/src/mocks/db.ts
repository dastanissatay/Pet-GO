/**
 * In-memory fake of the backend for local development and tests ONLY.
 * It follows the contract in docs/SPEC.md section 7 so the UI can be built
 * before the API exists. Its numbers are placeholders, never shown in
 * production: the production bundle talks to the real API.
 */
import type {
  CompleteQuestResult,
  ExpenseCreate,
  ExpenseRead,
  Benchmark,
  ExpenseUpdate,
  FoodPlan,
  FoodPurchase,
  FoodPurchaseCreate,
  FoodStatus,
  Forecast,
  InsuranceCheck,
  PetCreate,
  PetRead,
  PetUpdate,
  Plan,
  Progress,
  Quest,
  QuestCadence,
  QuestList,
  Samples,
  Summary,
} from "@/api/contract";

interface QuestDef {
  id: string;
  title: string;
  cadence: QuestCadence;
  xp: number;
  why: string;
  typical_cost: Quest["typical_cost"];
}

const QUESTS: QuestDef[] = [
  {
    id: "brush-teeth",
    title: "Brush {name}'s teeth",
    cadence: "daily",
    xp: 10,
    why: "Brushing helps push back a dental cleaning.",
    typical_cost: { name: "dental cleaning", low: 350, high: 600 },
  },
  {
    id: "check-ears",
    title: "Check ears after the walk",
    cadence: "daily",
    xp: 10,
    why: "Catching redness early avoids an ear infection visit.",
    typical_cost: { name: "ear infection visit", low: 150, high: 300 },
  },
  {
    id: "weigh-in",
    title: "Weigh {name} at home",
    cadence: "weekly",
    xp: 30,
    why: "Weight changes are an early warning sign.",
    typical_cost: null,
  },
  {
    id: "flea-tick",
    title: "Check the flea and tick schedule",
    cadence: "monthly",
    xp: 50,
    why: "Staying on schedule avoids a skin and allergy visit.",
    typical_cost: { name: "skin and allergy visit", low: 195, high: 300 },
  },
];

const FORECAST_ITEMS = [
  {
    category: "Wellness exam and vaccines",
    low: 210,
    high: 320,
    note: "One yearly checkup plus boosters.",
  },
  { category: "Flea, tick and heartworm", low: 280, high: 420, note: "Year-round prevention." },
  { category: "Dental cleaning", low: 350, high: 600, note: "Most dogs need one by age 4." },
  { category: "Lab work", low: 150, high: 220, note: "Yearly blood and stool tests." },
];

export const SAMPLES: Samples = {
  pet: {
    name: "Biscuit",
    species: "dog",
    breed: "Labrador Retriever",
    age_years: 4,
    size_class: "large",
    zip: "78704",
    insured: false,
    worry: "surprise",
  },
  estimate_text: "Comprehensive exam $75.00\nDental cleaning $520.00\nFull-mouth x-rays $310.00",
  receipt_text:
    "Oak Hill Animal Clinic\nDate: 10/28/2026\nAnnual wellness exam $64.00\nFecal test $22.00\nTOTAL $86.00",
};

export const BREEDS = {
  dog: [
    "Labrador Retriever",
    "Labradoodle",
    "Golden Retriever",
    "German Shepherd",
    "French Bulldog",
    "Bulldog",
    "Poodle",
    "Beagle",
    "Dachshund",
    "Chihuahua",
    "Mixed / not sure",
  ],
  cat: ["Domestic Shorthair", "Maine Coon", "Siamese", "Ragdoll", "Persian", "Mixed / not sure"],
} as const;

interface UserState {
  plan: Plan;
  decodes: number;
  pet: PetRead | null;
  expenses: ExpenseRead[];
  completions: { questId: string; periodKey: string; localDate: string; xp: number }[];
}

// Saved in the browser so a page reload doesn't wipe the mock pet and progress.
const STORAGE_KEY = "petgo:mockdb";

function loadUsers(): Map<string, UserState> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? new Map(JSON.parse(raw) as [string, UserState][]) : new Map();
  } catch {
    return new Map();
  }
}

const users = loadUsers();

export function saveDb(): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify([...users]));
  } catch {
    // Storage blocked: the mock still works for this page load.
  }
}

export function resetDb(): void {
  users.clear();
  saveDb();
}

export function userFor(deviceId: string): UserState {
  let user = users.get(deviceId);
  if (!user) {
    user = { plan: "free", decodes: 0, pet: null, expenses: [], completions: [] };
    users.set(deviceId, user);
  }
  return user;
}

const id = () => crypto.randomUUID();

export function createPet(user: UserState, body: PetCreate): PetRead {
  user.pet = { ...body, id: id() };
  user.expenses = [];
  user.completions = [];
  saveDb();
  return user.pet;
}

export function forecastFor(user: UserState): Forecast {
  const items = FORECAST_ITEMS.map((item) => ({
    ...item,
    typical: Math.round((item.low + item.high) / 2),
    source_urls: ["https://example.com/mock-source"],
  }));
  const totalLow = items.reduce((sum, i) => sum + i.low, 0);
  const totalTypical = items.reduce((sum, i) => sum + i.typical, 0);
  const totalHigh = items.reduce((sum, i) => sum + i.high, 0);
  const monthly = [0.05, 0.05, 0.2, 0.05, 0.05, 0.3, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05].map(
    (share) => Math.round(totalTypical * share),
  );
  return {
    total_low: totalLow,
    total_typical: totalTypical,
    total_high: totalHigh,
    items,
    monthly: user.plan === "free" ? null : monthly,
    life_stage: "adult",
    region: {
      name: "US average",
      price_level: 100,
      source_label: "Mock price level source",
      source_url: "https://example.com/mock-source",
      year: 2023,
    },
    schedule_basis: "Mock care schedule basis.",
    typical_basis: "Mock typical price basis.",
    typical_source_url: "https://example.com/mock-source",
  };
}

function isoWeekKey(localDate: string): string {
  const date = new Date(`${localDate}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function periodKey(def: QuestDef, localDate: string): string {
  if (def.cadence === "daily") return localDate;
  if (def.cadence === "monthly") return localDate.slice(0, 7);
  return isoWeekKey(localDate);
}

function previousDay(localDate: string): string {
  const date = new Date(`${localDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function progressFor(user: UserState, today: string): Progress {
  const xp = user.completions.reduce((sum, c) => sum + c.xp, 0);
  const stage: Progress["stage"] = xp >= 300 ? 3 : xp >= 100 ? 2 : 1;
  const days = new Set(user.completions.map((c) => c.localDate));
  let cursor = days.has(today) ? today : previousDay(today);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return {
    xp,
    level: stage,
    stage,
    next_level_xp: stage === 1 ? 100 : stage === 2 ? 300 : null,
    streak,
  };
}

export function questsFor(user: UserState, localDate: string): QuestList {
  const name = user.pet?.name ?? "your pet";
  const toQuest = (def: QuestDef): Quest => ({
    id: def.id,
    title: def.title.replace("{name}", name),
    cadence: def.cadence,
    xp: def.xp,
    why: def.why,
    typical_cost: def.typical_cost,
    completed: user.completions.some(
      (c) => c.questId === def.id && c.periodKey === periodKey(def, localDate),
    ),
  });
  return {
    daily: QUESTS.filter((q) => q.cadence === "daily").map(toQuest),
    weekly: QUESTS.filter((q) => q.cadence === "weekly").map(toQuest),
    monthly: QUESTS.filter((q) => q.cadence === "monthly").map(toQuest),
  };
}

export function completeQuest(
  user: UserState,
  questId: string,
  localDate: string,
): CompleteQuestResult | "not_found" | "already_done" {
  const def = QUESTS.find((q) => q.id === questId);
  if (!def) return "not_found";
  const key = periodKey(def, localDate);
  if (user.completions.some((c) => c.questId === questId && c.periodKey === key))
    return "already_done";
  const before = progressFor(user, localDate).stage;
  user.completions.push({ questId, periodKey: key, localDate, xp: def.xp });
  saveDb();
  const progress = progressFor(user, localDate);
  return { progress, leveled_up: progress.stage > before };
}

export function undoQuest(user: UserState, questId: string, localDate: string): void {
  const def = QUESTS.find((q) => q.id === questId);
  if (!def) return;
  const key = periodKey(def, localDate);
  user.completions = user.completions.filter(
    (c) => !(c.questId === questId && c.periodKey === key),
  );
  saveDb();
}

export function addExpense(user: UserState, body: ExpenseCreate): ExpenseRead {
  const expense: ExpenseRead = { ...body, id: id() };
  user.expenses = [expense, ...user.expenses].sort((a, b) => b.spent_on.localeCompare(a.spent_on));
  saveDb();
  return expense;
}

function sortExpenses(expenses: ExpenseRead[]): ExpenseRead[] {
  return [...expenses].sort((a, b) => b.spent_on.localeCompare(a.spent_on));
}

export function updateExpense(
  user: UserState,
  expenseId: string,
  body: ExpenseUpdate,
): ExpenseRead | null {
  const current = user.expenses.find((e) => e.id === expenseId);
  if (!current) return null;
  const updated: ExpenseRead = { ...current, ...body };
  user.expenses = sortExpenses(user.expenses.map((e) => (e.id === expenseId ? updated : e)));
  saveDb();
  return updated;
}

export function deleteExpense(user: UserState, expenseId: string): boolean {
  const before = user.expenses.length;
  user.expenses = user.expenses.filter((e) => e.id !== expenseId);
  saveDb();
  return user.expenses.length < before;
}

export function updatePet(user: UserState, body: PetUpdate): PetRead | null {
  if (!user.pet) return null;
  user.pet = { ...user.pet, ...body };
  if (user.pet.species === "cat") user.pet.size_class = null;
  saveDb();
  return user.pet;
}

/** Placeholder numbers in the real response shape. Never shown in production. */
export function foodFor(user: UserState): FoodPlan {
  const query = "medium breed adult dry dog food";
  return {
    species: user.pet?.species ?? "dog",
    life_stage: "adult",
    food_type: "Medium breed adult dry dog food",
    annual_low: 876,
    annual_typical: 960,
    annual_high: 1059,
    daily_kcal_low: 1100,
    daily_kcal_high: 1400,
    pounds_per_year_low: 230,
    pounds_per_year_high: 310,
    weight_basis: "medium dog, 20-50 lb",
    basis: "Mock basis",
    sources: [{ label: "Mock food source", url: "https://example.com/mock-source" }],
    tip: "Mock tip",
    shop_links: [
      { store: "Walmart", url: `https://www.walmart.com/search?q=${encodeURIComponent(query)}` },
      { store: "Amazon", url: `https://www.amazon.com/s?k=${encodeURIComponent(query)}` },
    ],
  };
}

const foodPurchases = new Map<UserState, FoodPurchase[]>();

export function addFoodPurchase(user: UserState, body: FoodPurchaseCreate): FoodPurchase {
  const purchase: FoodPurchase = {
    id: id(),
    bought_on: body.bought_on,
    lasts_days: body.lasts_days,
    expense_id: null,
  };
  if (body.amount !== undefined) {
    purchase.expense_id = addExpense(user, {
      spent_on: body.bought_on,
      amount: body.amount,
      category: "food",
      note: "Dry dog food",
    }).id;
  }
  foodPurchases.set(user, [...(foodPurchases.get(user) ?? []), purchase]);
  return purchase;
}

function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function foodStatusFor(user: UserState, localDate: string): FoodStatus {
  const plan = foodFor(user);
  const latest = (foodPurchases.get(user) ?? []).slice(-1)[0];
  const common = { buy_ahead_days: 5, food_type: plan.food_type, shop_links: plan.shop_links };
  if (!latest) {
    return {
      status: "none",
      last_bought_on: null,
      lasts_days: null,
      runs_out_on: null,
      buy_by: null,
      days_left: null,
      ...common,
    };
  }
  const runsOut = addDaysIso(latest.bought_on, latest.lasts_days);
  const daysLeft = Math.round(
    (Date.parse(`${runsOut}T00:00:00Z`) - Date.parse(`${localDate}T00:00:00Z`)) / 86_400_000,
  );
  return {
    status: daysLeft <= 0 ? "out" : daysLeft <= 5 ? "soon" : "ok",
    last_bought_on: latest.bought_on,
    lasts_days: latest.lasts_days,
    runs_out_on: runsOut,
    buy_by: addDaysIso(runsOut, -5),
    days_left: daysLeft,
    ...common,
  };
}

/** Placeholder numbers in the real response shape. Never shown in production. */
export function benchmarkFor(user: UserState): Benchmark {
  const forecast = forecastFor(user);
  return {
    species: user.pet?.species ?? "dog",
    us_average_vet_care: 600,
    year: 2025,
    source_label: "Mock benchmark source",
    source_url: "https://example.com/mock-source",
    forecast_low: forecast.total_low,
    forecast_typical: forecast.total_typical,
    forecast_high: forecast.total_high,
    excluded_categories: [],
  };
}

/** Placeholder numbers in the real response shape. Never shown in production. */
export function insuranceFor(user: UserState): InsuranceCheck {
  const forecast = forecastFor(user);
  return {
    species: user.pet?.species ?? "dog",
    insured: user.pet?.insured ?? false,
    average_annual_premium: 600,
    average_monthly_premium: 50,
    premium_source_label: "Mock premium source",
    premium_source_url: "https://example.com/mock-source",
    routine_low: forecast.total_low,
    routine_high: forecast.total_high,
    unexpected_costs: [
      {
        price_id: "mock_surgery",
        name: "Mock surgery",
        low: 1000,
        high: 3000,
        source_url: "https://example.com/mock-source",
      },
    ],
  };
}

export function summaryFor(user: UserState): Summary {
  const forecast = forecastFor(user);
  const spent = user.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  return {
    spent_total: spent.toFixed(2),
    expected_low: forecast.total_low,
    expected_typical: forecast.total_typical,
    expected_high: forecast.total_high,
    still_low: Math.max(0, forecast.total_low - spent),
    still_typical: Math.max(0, forecast.total_typical - spent),
    still_high: Math.max(0, forecast.total_high - spent),
  };
}
