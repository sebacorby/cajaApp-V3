import { baseFixture, type FutureFixture } from "./support.js";

export const datasetD: FutureFixture = {
  ...baseFixture(),
  statements: [{ id: "stmt-d", status: "accepted", periodLabel: "2026-07-01", periodKey: "2026-07", isActiveForPeriod: true, bankName: "Banco D", brand: "Visa", holderName: "JAVI" }],
  groups: [
    { id: "group-d-valid", statementId: "stmt-d", groupKey: "card-d", label: "Visa", cardLast4: "4444", holderName: "JAVI" },
    { id: "group-d-missing", statementId: "stmt-d", groupKey: "card-missing", label: "Sin tarjeta", cardLast4: null, holderName: null },
  ],
  rows: [
    { id: "row-d-invalid", statementId: "stmt-d", groupKey: "card-d", rowType: "transaction", referenceRaw: "INVALID", dateIso: "2026-07-01", installmentRaw: "ambiguous", originalText: "Cuota inválida" },
    { id: "row-d-currency", statementId: "stmt-d", groupKey: "card-d", rowType: "transaction", referenceRaw: "CURRENCY", dateIso: "2026-07-01", installmentRaw: "2/3", originalText: "Sin moneda" },
    { id: "row-d-card", statementId: "stmt-d", groupKey: "card-missing", rowType: "transaction", referenceRaw: "CARD", dateIso: "2026-07-01", installmentRaw: "2/3", originalText: "Sin tarjeta" },
  ],
  projections: [
    { id: "projection-d-invalid", statementId: "stmt-d", rowId: "row-d-invalid", monthKey: "2026-08", label: "", installmentCurrent: null, installmentTotal: null, amountPesosRaw: "9000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
    { id: "projection-d-currency", statementId: "stmt-d", rowId: "row-d-currency", monthKey: "2026-08", label: "Agosto-2026", installmentCurrent: 2, installmentTotal: 3, amountPesosRaw: "5000.00", amountDollarsRaw: null, currencyOriginal: "MIXED", isManual: false },
    { id: "projection-d-card", statementId: "stmt-d", rowId: "row-d-card", monthKey: "2026-08", label: "Agosto-2026", installmentCurrent: 2, installmentTotal: 3, amountPesosRaw: "5000.00", amountDollarsRaw: null, currencyOriginal: "ARS", isManual: false },
  ],
  manualPurchases: [],
  expected: { rows: 3, invalidInstallmentRows: 1, missingCurrencyRows: 1, missingCardRows: 1, totals: { ars: "0.00", usd: "0.00" } },
};
