import type { FutureOccurrence, FutureCardGroup, FutureMonth } from "../future.types.js";

function compareText(left: string | null | undefined, right: string | null | undefined): number {
  const a = left ?? "";
  const b = right ?? "";
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compareOccurrences(left: Pick<FutureOccurrence, "originReference" | "installmentCurrent" | "id">, right: Pick<FutureOccurrence, "originReference" | "installmentCurrent" | "id">): number {
  return compareText(left.originReference, right.originReference)
    || (left.installmentCurrent ?? Number.MAX_SAFE_INTEGER) - (right.installmentCurrent ?? Number.MAX_SAFE_INTEGER)
    || compareText(left.id, right.id);
}

export function sortOccurrences<T extends Pick<FutureOccurrence, "originReference" | "installmentCurrent" | "id">>(occurrences: readonly T[]): T[] {
  return [...occurrences].sort(compareOccurrences);
}

export function compareCards(left: Pick<FutureCardGroup, "cardLast4" | "holderName" | "cardId">, right: Pick<FutureCardGroup, "cardLast4" | "holderName" | "cardId">): number {
  return compareText(left.cardLast4, right.cardLast4)
    || compareText(left.holderName, right.holderName)
    || compareText(left.cardId, right.cardId);
}

export function sortCards<T extends Pick<FutureCardGroup, "cardLast4" | "holderName" | "cardId">>(cards: readonly T[]): T[] {
  return [...cards].sort(compareCards);
}

export function sortMonths<T extends Pick<FutureMonth, "monthKey">>(months: readonly T[]): T[] {
  return [...months].sort((left, right) => compareText(left.monthKey, right.monthKey));
}
