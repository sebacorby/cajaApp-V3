import { baseFixture, type FutureFixture } from "./support.js";

export const datasetC: FutureFixture = {
  ...baseFixture(),
  statements: [{ id: "stmt-c", status: "accepted", periodLabel: "2026-07-01", periodKey: "2026-07", isActiveForPeriod: true, bankName: "Banco C", brand: "Visa", holderName: "JAVI" }],
  groups: [{ id: "group-c", statementId: "stmt-c", groupKey: "card-c", label: "Visa", cardLast4: "3333", holderName: "JAVI" }],
  rows: [{ id: "row-c", statementId: "stmt-c", groupKey: "card-c", rowType: "transaction", referenceRaw: "PLAN-C", dateIso: "2026-07-01", installmentRaw: "1/4", originalText: "Plan C" }],
  projections: [
    { id: "projection-c-2", statementId: "stmt-c", rowId: "row-c", monthKey: "2026-08", label: "Agosto-2026", installmentCurrent: 2, installmentTotal: 4, amountPesosRaw: "30000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
    { id: "projection-c-2-duplicate", statementId: "stmt-c", rowId: "row-c", monthKey: "2026-08", label: "Agosto-2026", installmentCurrent: 2, installmentTotal: 4, amountPesosRaw: "30000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
    { id: "projection-c-3", statementId: "stmt-c", rowId: "row-c", monthKey: "2026-09", label: "Setiembre-2026", installmentCurrent: 3, installmentTotal: 4, amountPesosRaw: "30000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
    { id: "projection-c-4", statementId: "stmt-c", rowId: "row-c", monthKey: "2026-10", label: "Octubre-2026", installmentCurrent: 4, installmentTotal: 4, amountPesosRaw: "30000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
  ],
  manualPurchases: [],
  expected: { rows: 3, duplicateOccurrences: 1, total: "90000.00" },
};
