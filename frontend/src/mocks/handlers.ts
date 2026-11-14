import { delay, http, HttpResponse } from "msw";
import type { ExpenseCreate, PetCreate, SubscriptionCreate } from "@/api/contract";
import {
  addExpense,
  BREEDS,
  completeQuest,
  createPet,
  forecastFor,
  progressFor,
  questsFor,
  SAMPLES,
  saveDb,
  summaryFor,
  undoQuest,
  userFor,
} from "@/mocks/db";

const API = "*/api/v1";

function err(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
  return HttpResponse.json({ error: { code, message, details } }, { status });
}

function deviceOf(request: Request): string | null {
  const value = request.headers.get("X-Device-Id");
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Resolves the caller and their pet, mirroring the backend's ownership checks. */
function withPet(request: Request, petId: string | readonly string[] | undefined) {
  const device = deviceOf(request);
  if (!device) return { error: err(400, "DEVICE_ID_REQUIRED", "Missing device ID.") } as const;
  const user = userFor(device);
  if (!user.pet || user.pet.id !== petId) {
    return { error: err(404, "PET_NOT_FOUND", "We couldn't find that pet.") } as const;
  }
  return { user, pet: user.pet } as const;
}

export const handlers = [
  http.get(`${API}/me`, ({ request }) => {
    const device = deviceOf(request);
    if (!device) return err(400, "DEVICE_ID_REQUIRED", "Missing device ID.");
    const user = userFor(device);
    return HttpResponse.json({ plan: user.plan, free_decodes_left: Math.max(0, 1 - user.decodes) });
  }),

  http.get(`${API}/samples`, () => HttpResponse.json(SAMPLES)),

  http.get(`${API}/breeds`, ({ request }) => {
    const url = new URL(request.url);
    const species = url.searchParams.get("species") === "cat" ? "cat" : "dog";
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const items = BREEDS[species]
      .filter((name) => name.toLowerCase().includes(q))
      .map((name) => ({ name, species }));
    return HttpResponse.json({ items, total: items.length });
  }),

  http.post(`${API}/pets`, async ({ request }) => {
    const device = deviceOf(request);
    if (!device) return err(400, "DEVICE_ID_REQUIRED", "Missing device ID.");
    const body = (await request.json()) as PetCreate;
    if (!/^\d{5}$/.test(body.zip)) {
      return err(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
        fields: { zip: "Enter a 5-digit US ZIP code." },
      });
    }
    return HttpResponse.json(createPet(userFor(device), body), { status: 201 });
  }),

  http.get(`${API}/pets/current`, ({ request }) => {
    const device = deviceOf(request);
    if (!device) return err(400, "DEVICE_ID_REQUIRED", "Missing device ID.");
    const pet = userFor(device).pet;
    return pet ? HttpResponse.json(pet) : err(404, "PET_NOT_FOUND", "No pet yet.");
  }),

  http.get(`${API}/pets/:petId/forecast`, async ({ request, params }) => {
    const found = withPet(request, params.petId);
    if ("error" in found) return found.error;
    await delay(1200); // lets the "Building the plan" step be seen in dev
    return HttpResponse.json(forecastFor(found.user));
  }),

  http.get(`${API}/pets/:petId/summary`, ({ request, params }) => {
    const found = withPet(request, params.petId);
    if ("error" in found) return found.error;
    return HttpResponse.json(summaryFor(found.user));
  }),

  http.get(`${API}/pets/:petId/progress`, ({ request, params }) => {
    const found = withPet(request, params.petId);
    if ("error" in found) return found.error;
    return HttpResponse.json(progressFor(found.user, today()));
  }),

  http.get(`${API}/pets/:petId/quests`, ({ request, params }) => {
    const found = withPet(request, params.petId);
    if ("error" in found) return found.error;
    const localDate = new URL(request.url).searchParams.get("local_date") ?? today();
    return HttpResponse.json(questsFor(found.user, localDate));
  }),

  http.post(`${API}/pets/:petId/quests/:questId/complete`, async ({ request, params }) => {
    const found = withPet(request, params.petId);
    if ("error" in found) return found.error;
    const { local_date: localDate } = (await request.json()) as { local_date: string };
    const result = completeQuest(found.user, String(params.questId), localDate);
    if (result === "not_found") return err(404, "QUEST_NOT_FOUND", "We couldn't find that quest.");
    if (result === "already_done") return err(409, "QUEST_ALREADY_DONE", "Already done for now.");
    return HttpResponse.json(result);
  }),

  http.delete(`${API}/pets/:petId/quests/:questId/complete`, ({ request, params }) => {
    const found = withPet(request, params.petId);
    if ("error" in found) return found.error;
    const localDate = new URL(request.url).searchParams.get("local_date") ?? today();
    undoQuest(found.user, String(params.questId), localDate);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/pets/:petId/expenses`, ({ request, params }) => {
    const found = withPet(request, params.petId);
    if ("error" in found) return found.error;
    return HttpResponse.json({ items: found.user.expenses, total: found.user.expenses.length });
  }),

  http.post(`${API}/pets/:petId/expenses`, async ({ request, params }) => {
    const found = withPet(request, params.petId);
    if ("error" in found) return found.error;
    const body = (await request.json()) as ExpenseCreate;
    return HttpResponse.json(addExpense(found.user, body), { status: 201 });
  }),

  http.post(`${API}/receipts/parse`, async ({ request }) => {
    const { text } = (await request.json()) as { text: string };
    const total = /total\D*([\d,]+\.\d{2})/i.exec(text)?.[1];
    const date = /(\d{2})\/(\d{2})\/(\d{4})/.exec(text);
    if (!total) return err(422, "NO_AMOUNT_FOUND", "We couldn't find a total in that receipt.");
    await delay(600);
    return HttpResponse.json({
      amount: total.replace(/,/g, ""),
      spent_on: date ? `${date[3]}-${date[1]}-${date[2]}` : null,
      category: "wellness",
      note: "Vet visit",
    });
  }),

  http.post(`${API}/subscriptions`, async ({ request }) => {
    const device = deviceOf(request);
    if (!device) return err(400, "DEVICE_ID_REQUIRED", "Missing device ID.");
    const { plan } = (await request.json()) as SubscriptionCreate;
    userFor(device).plan = plan;
    saveDb();
    return HttpResponse.json({ plan });
  }),
];
