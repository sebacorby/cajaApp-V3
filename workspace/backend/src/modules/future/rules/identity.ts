import type { FutureOccurrence } from "../future.types.js";

function identityPart(value: string | number | null | undefined): string {
  return encodeURIComponent(String(value ?? ""));
}

export function occurrenceIdentity(occurrence: Pick<FutureOccurrence, "sourceType" | "sourceId" | "installmentCurrent" | "monthKey" | "currencyOriginal" | "cardId">): string {
  return [
    occurrence.sourceType,
    occurrence.sourceId,
    occurrence.installmentCurrent,
    occurrence.monthKey,
    occurrence.currencyOriginal,
    occurrence.cardId,
  ].map(identityPart).join(":");
}

export function deduplicateOccurrences(occurrences: readonly FutureOccurrence[]): {
  occurrences: FutureOccurrence[];
  duplicateOccurrences: number;
} {
  const byIdentity = new Map<string, FutureOccurrence>();
  let duplicateOccurrences = 0;

  for (const occurrence of occurrences) {
    const identity = occurrenceIdentity(occurrence);
    const existing = byIdentity.get(identity);
    if (!existing) {
      byIdentity.set(identity, occurrence);
      continue;
    }
    duplicateOccurrences += 1;
    if (occurrence.id.localeCompare(existing.id) < 0) {
      byIdentity.set(identity, occurrence);
    }
  }

  return {
    occurrences: Array.from(byIdentity.values()),
    duplicateOccurrences,
  };
}
