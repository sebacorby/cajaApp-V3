import type { FutureOccurrence, FutureSourceType } from "../future.types.js";

export interface InstallmentParts {
  current: number;
  total: number;
}

const INSTALLMENT_PATTERN = /^(\d{1,3})\s*\/\s*(\d{1,3})$/;

export function parseInstallment(value: string): InstallmentParts {
  const normalized = value.trim();
  const match = INSTALLMENT_PATTERN.exec(normalized);
  if (!match) throw new Error(`Invalid installment value: ${value}`);
  const current = Number.parseInt(match[1], 10);
  const total = Number.parseInt(match[2], 10);
  const parsed = { current, total };
  if (!isValidInstallment(parsed)) throw new Error(`Invalid installment sequence: ${value}`);
  return parsed;
}

export function isValidInstallment(value: { current: number | null; total: number | null }): boolean {
  return Number.isSafeInteger(value.current)
    && Number.isSafeInteger(value.total)
    && value.current !== null
    && value.total !== null
    && value.current >= 1
    && value.total >= 1
    && value.current <= value.total;
}

export function isFinalInstallment(value: InstallmentParts): boolean {
  return value.current === value.total;
}

export function excludesCurrentPeriod(
  occurrence: Pick<FutureOccurrence, "monthKey">,
  currentPeriodKey: string | null,
  includeCurrentPeriod: boolean,
): boolean {
  return !includeCurrentPeriod
    && currentPeriodKey !== null
    && occurrence.monthKey === currentPeriodKey;
}

export function filterCurrentPeriod<T extends Pick<FutureOccurrence, "monthKey">>(
  occurrences: readonly T[],
  currentPeriodKey: string | null,
  includeCurrentPeriod: boolean,
): T[] {
  return occurrences.filter((occurrence) => !excludesCurrentPeriod(
    occurrence,
    currentPeriodKey,
    includeCurrentPeriod,
  ));
}

export function isSourcePurchase(value: {
  sourceType?: string;
  isManual?: boolean;
  rowType?: string;
}): boolean {
  return value.sourceType === "manual_card_purchase"
    && value.rowType !== "future_installment";
}

export function onlyPersistedOccurrences<T extends {
  sourceType?: string;
  isManual?: boolean;
  rowType?: string;
}>(values: readonly T[]): T[] {
  return values.filter((value) => !isSourcePurchase(value));
}

export function effectivePeriodKey(occurrence: Pick<FutureOccurrence, "monthKey">): string {
  return occurrence.monthKey;
}

export function isPersistedFutureOccurrence(value: {
  id?: string;
  sourceType?: FutureSourceType | string;
  rowType?: string;
}): boolean {
  return value.rowType === "future_installment"
    || value.sourceType === "card_statement"
    || value.sourceType === "manual_card_purchase";
}
