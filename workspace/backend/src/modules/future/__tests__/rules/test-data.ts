import type { FutureOccurrence } from "../../future.types.js";

export function occurrence(overrides: Partial<FutureOccurrence> = {}): FutureOccurrence {
  return {
    id: "projection-1",
    sourceType: "card_statement",
    sourceId: "row-1",
    statementId: "statement-1",
    statementPeriodKey: "2026-07",
    isManual: false,
    monthKey: "2026-08",
    label: "Agosto-2026",
    installmentCurrent: 2,
    installmentTotal: 3,
    amountPesosRaw: "10000.00",
    amountDollarsRaw: null,
    currencyOriginal: "ARS",
    description: "Compra de prueba",
    dateIso: "2026-06-28",
    referenceRaw: "REF-1",
    cardId: "card-1",
    cardLast4: "1234",
    holderName: "JAVI",
    cardLabel: "Visa •••• 1234",
    originReference: "statement-1",
    sourceLabel: "Visa •••• 1234",
    status: "confirmed",
    rowType: "future_installment",
    ...overrides,
  };
}
