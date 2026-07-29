import { baseFixture, type FutureFixture } from "./support.js";

export const datasetA: FutureFixture = {
  ...baseFixture(),
  statements: [{
    id: "stmt-a",
    status: "accepted",
    periodLabel: "2026-07-01",
    periodKey: "2026-07",
    isActiveForPeriod: true,
    bankName: "Banco A",
    brand: "Visa",
    holderName: "JAVI",
  }],
  groups: [{
    id: "group-a",
    statementId: "stmt-a",
    groupKey: "card-a",
    label: "Visa principal",
    cardLast4: "1234",
    holderName: "JAVI",
  }],
  rows: [
    { id: "row-a-single", statementId: "stmt-a", groupKey: "card-a", rowType: "transaction", referenceRaw: "SINGLE", dateIso: "2026-07-02", installmentRaw: "1/1", originalText: "Compra contado" },
    { id: "row-a-short", statementId: "stmt-a", groupKey: "card-a", rowType: "transaction", referenceRaw: "SHORT", dateIso: "2026-06-28", installmentRaw: "1/3", originalText: "Compra corta" },
    { id: "row-a-advanced", statementId: "stmt-a", groupKey: "card-a", rowType: "transaction", referenceRaw: "ADVANCED", dateIso: "2026-06-28", installmentRaw: "3/6", originalText: "Compra avanzada" },
    { id: "row-a-final", statementId: "stmt-a", groupKey: "card-a", rowType: "transaction", referenceRaw: "FINAL", dateIso: "2026-07-02", installmentRaw: "6/6", originalText: "Compra final" },
  ],
  projections: [
    { id: "projection-a-2", statementId: "stmt-a", rowId: "row-a-short", monthKey: "2026-08", label: "Agosto-2026", installmentCurrent: 2, installmentTotal: 3, amountPesosRaw: "10000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
    { id: "projection-a-3", statementId: "stmt-a", rowId: "row-a-short", monthKey: "2026-09", label: "Setiembre-2026", installmentCurrent: 3, installmentTotal: 3, amountPesosRaw: "10000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
    { id: "projection-a-4", statementId: "stmt-a", rowId: "row-a-advanced", monthKey: "2026-08", label: "Agosto-2026", installmentCurrent: 4, installmentTotal: 6, amountPesosRaw: "25000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
    { id: "projection-a-5", statementId: "stmt-a", rowId: "row-a-advanced", monthKey: "2026-09", label: "Setiembre-2026", installmentCurrent: 5, installmentTotal: 6, amountPesosRaw: "25000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
    { id: "projection-a-6", statementId: "stmt-a", rowId: "row-a-advanced", monthKey: "2026-10", label: "Octubre-2026", installmentCurrent: 6, installmentTotal: 6, amountPesosRaw: "25000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
  ],
  manualPurchases: [],
  expected: {
    rows: 5,
    periods: ["2026-08", "2026-09", "2026-10"],
    totals: { "2026-08": "35000.00", "2026-09": "35000.00", "2026-10": "25000.00" },
  },
};
