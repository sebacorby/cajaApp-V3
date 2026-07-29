import { baseFixture, type FutureFixture } from "./support.js";

export const datasetB: FutureFixture = {
  ...baseFixture(),
  statements: [{ id: "stmt-b", status: "accepted", periodLabel: "2026-07-01", periodKey: "2026-07", isActiveForPeriod: true, bankName: "Banco B", brand: "Visa", holderName: "JAVI" }],
  groups: [{ id: "group-b", statementId: "stmt-b", groupKey: "card-b", label: "Visa", cardLast4: "2222", holderName: "JAVI" }],
  rows: [
    { id: "row-b-ars", statementId: "stmt-b", groupKey: "card-b", rowType: "transaction", referenceRaw: "ARS", dateIso: "2026-07-01", installmentRaw: "1/2", originalText: "ARS" },
    { id: "row-b-usd", statementId: "stmt-b", groupKey: "card-b", rowType: "transaction", referenceRaw: "USD", dateIso: "2026-07-01", installmentRaw: "1/2", originalText: "USD" },
  ],
  projections: [
    { id: "projection-b-ars", statementId: "stmt-b", rowId: "row-b-ars", monthKey: "2026-08", label: "Agosto-2026", installmentCurrent: 2, installmentTotal: 2, amountPesosRaw: "10000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
    { id: "projection-b-usd", statementId: "stmt-b", rowId: "row-b-usd", monthKey: "2026-08", label: "Agosto-2026", installmentCurrent: 2, installmentTotal: 2, amountPesosRaw: null, amountDollarsRaw: "40.00", currencyOriginal: "USD", isManual: false },
  ],
  manualPurchases: [],
  expected: { rows: 2, totals: { ars: "10000.00", usd: "40.00" } },
};
