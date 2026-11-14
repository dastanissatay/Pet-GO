// Money arrives as number or as a decimal string (Pydantic serializes Decimal as a string).
export type MoneyValue = number | string;

export function toNumber(value: MoneyValue): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const withCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `$1,240`, or `$86.50` when the amount has cents. */
export function formatUsd(value: MoneyValue): string {
  const n = toNumber(value);
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return hasCents ? withCents.format(n) : wholeDollars.format(Math.round(n));
}

/** `$990–$1,560` with an en dash, as on the designs. */
export function formatUsdRange(low: MoneyValue, high: MoneyValue): string {
  return `${formatUsd(low)}–${formatUsd(high)}`;
}

/** `2026-10-28` -> `10/28/2026`. Accepts a full ISO timestamp too. */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

/** `10/28/2026` -> `2026-10-28`, or null when the text is not a real date. */
export function parseUsDate(text: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!valid) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The browser's own calendar date, which the quest API needs for daily streaks. */
export function localDateIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayUs(now: Date = new Date()): string {
  return formatDate(localDateIso(now));
}
