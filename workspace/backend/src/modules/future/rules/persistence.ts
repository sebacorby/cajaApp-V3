import type { FutureOccurrence } from "../future.types.js";
import { persistedMonthKeys as collectPersistedMonthKeys } from "./month-sequence.js";

export function persistedMonthKeys(
  occurrences: readonly Pick<FutureOccurrence, "monthKey">[],
): string[] {
  return collectPersistedMonthKeys(occurrences);
}
