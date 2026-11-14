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
  Forecast,
  PetCreate,
  PetRead,
  Plan,
  Progress,
  Quest,
  QuestList,
  Samples,
  Summary,
} from "@/api/contract";

interface QuestDef {
  id: string;
  title: string;
  cadence: "daily" | "weekly";
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
];

const FORECAST_ITEMS = [
  { category: "Wellness exam and vaccines", low: 210, high: 320, note: "One yearly checkup plus boosters." },
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

const users = new Map<string, UserState>();

export function resetDb(): void {
  users.clear();
}

export function userFor(deviceId: string): UserState {
  let user = users.get(deviceId);
  if (!user) {
    user = { plan: "free", decodes: 0, pet: null, expenses: [], completions: [] };
    users.set(deviceId, user);
  }
  return user;
}

let counter = 0;
const id = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;

export function createPet(user: UserState, body: PetCreate): PetRead {
  user.pet = { ...body, id: id() };
  user.expenses = [];
  user.completions = [];
  return user.pet;
}

export function forecastFor(user: UserState): Forecast {
  const items = FORECAST_ITEMS.map((item) => ({ ...item, source_urls: ["https://example.com/mock-source"] }));
  const totalLow = items.reduce((sum, i) => sum + i.low, 0);
  const totalHigh = items.reduce((sum, i) => sum + i.high, 0);
  const mid = (totalLow + totalHigh) / 2;
  const monthly = [0.05, 0.05, 0.2, 0.05, 0.05, 0.3, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05].map((share) =>
    Math.round(mid * share),
  );
  return {
    total_low: totalLow,
    total_high: totalHigh,
    items,
    monthly: user.plan === "free" ? null : monthly,
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
  return def.cadence === "daily" ? localDate : isoWeekKey(localDate);
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
  return { xp, level: stage, stage, next_level_xp: stage === 1 ? 100 : stage === 2 ? 300 : null, streak };
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
  if (user.completions.some((c) => c.questId === questId && c.periodKey === key)) return "already_done";
  const before = progressFor(user, localDate).stage;
  user.completions.push({ questId, periodKey: key, localDate, xp: def.xp });
  const progress = progressFor(user, localDate);
  return { progress, leveled_up: progress.stage > before };
}

export function undoQuest(user: UserState, questId: string, localDate: string): void {
  const def = QUESTS.find((q) => q.id === questId);
  if (!def) return;
  const key = periodKey(def, localDate);
  user.completions = user.completions.filter((c) => !(c.questId === questId && c.periodKey === key));
}

export function addExpense(user: UserState, body: ExpenseCreate): ExpenseRead {
  const expense: ExpenseRead = { ...body, id: id() };
  user.expenses = [expense, ...user.expenses].sort((a, b) => b.spent_on.localeCompare(a.spent_on));
  return expense;
}

export function summaryFor(user: UserState): Summary {
  const forecast = forecastFor(user);
  const spent = user.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  return {
    spent_total: spent.toFixed(2),
    expected_low: forecast.total_low,
    expected_high: forecast.total_high,
    still_low: Math.max(0, forecast.total_low - spent),
    still_high: Math.max(0, forecast.total_high - spent),
  };
}
