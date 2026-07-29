import type { FutureOccurrence } from "../future.types.js";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function requireMonthKey(value: string, fieldName = "monthKey"): string {
  const normalized = value.trim();
  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must use YYYY-MM format`);
  }
  return normalized;
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && MONTH_KEY_PATTERN.test(value);
}

export function monthKeyWithOffset(monthKey: string, offset: number): string {
  const valid = requireMonthKey(monthKey);
  if (!Number.isSafeInteger(offset)) {
    throw new Error("month offset must be an integer");
  }
  const [year, month] = valid.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthSequence(from: string, months: number): string[] {
  const start = requireMonthKey(from, "from");
  validateHorizon(months);
  return Array.from({ length: months }, (_, index) => monthKeyWithOffset(start, index));
}

export function validateHorizon(months: number): number {
  if (!Number.isSafeInteger(months) || months < 1 || months > 24) {
    throw new Error("months must be an integer between 1 and 24");
  }
  return months;
}

export function filterToMonthRange<T extends { monthKey: string }>(
  occurrences: readonly T[],
  from: string,
  months: number,
): T[] {
  const allowed = new Set(monthSequence(from, months));
  return occurrences.filter((occurrence) => allowed.has(occurrence.monthKey));
}

export function monthLabel(monthKey: string): string {
  const valid = requireMonthKey(monthKey);
  const [year, month] = valid.split("-");
  const names = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return `${names[Number(month) - 1]} ${year}`;
}

export function persistedMonthKeys(occurrences: readonly Pick<FutureOccurrence, "monthKey">[]): string[] {
  return Array.from(new Set(
    occurrences
      .map((occurrence) => occurrence.monthKey)
      .filter(isMonthKey),
  )).sort((left, right) => left.localeCompare(right));
}
