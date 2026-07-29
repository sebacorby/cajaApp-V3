import { describe, expect, it } from "vitest";
import type { CardPaymentsResponse } from "./card-payments.service.js";
import { applyDynamicTaxProjection } from "./card-payments-tax-engine.js";
import type { PersistedStatementPaymentRow } from "./card-payments-statement-normalizer.js";

function baseResponse(): CardPaymentsResponse {
  return {
    baseline: {
      statementId: "visa-1",
      periodKey: "2026-07",
      bankName: "Banco Galicia",
      brand: "VISA",
      fileName: "visa.pdf",
      currentDueDate: "2026-07-13",
      nextClosingDate: "2026-07-30",
      nextDueDate: "2026-08-07",
      total: { ars: "1924476.04", usd: "3.22" },
      acceptedAt: "2026-07-27T00:00:00.000Z",
    },
    range: { from: "2026-07", to: "2026-12", months: 6 },
    months: ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"].map(
      (monthKey, index) => ({
        monthKey,
        label: monthKey,
        status: index === 0 ? "confirmed" : "projected",
        totals: { ars: "0.00", usd: "0.00" },
      }),
    ),
    cards: [
      {
        cardId: "statement:visa-1",
        cardLabel: "VISA · Banco Galicia",
        cardLast4: null,
        holderName: "JAVIER S CORBELLA",
        totalsByMonth: [],
        movements: [
          {
            id: "plan-v",
            sourceType: "statement_row",
            description: "VISA PLAN V 09/12 (TNA 83,81)",
            dateIso: "2025-10-16",
            cells: [
              { monthKey: "2026-07", status: "confirmed", installmentNumber: 9, installmentTotal: 12, ars: "267164.67", usd: "0.00" },
              { monthKey: "2026-08", status: "projected", installmentNumber: 10, installmentTotal: 12, ars: "267164.67", usd: "0.00" },
              { monthKey: "2026-09", status: "projected", installmentNumber: 11, installmentTotal: 12, ars: "267164.67", usd: "0.00" },
              { monthKey: "2026-10", status: "projected", installmentNumber: 12, installmentTotal: 12, ars: "267164.67", usd: "0.00" },
            ],
          },
          {
            id: "current-rest",
            sourceType: "statement_row",
            description: "RESTO DEL RESUMEN",
            dateIso: "2026-06-01",
            cells: [
              { monthKey: "2026-07", status: "confirmed", installmentNumber: null, installmentTotal: null, ars: "1624082.21", usd: "3.22" },
            ],
          },
          {
            id: "future-purchase",
            sourceType: "statement_row",
            description: "COMPRA FUTURA",
            dateIso: "2026-06-01",
            cells: [
              { monthKey: "2026-08", status: "projected", installmentNumber: 2, installmentTotal: 6, ars: "100000.00", usd: "10.00" },
              { monthKey: "2026-09", status: "projected", installmentNumber: 3, installmentTotal: 6, ars: "100000.00", usd: "0.00" },
            ],
          },
        ],
      },
    ],
    issuerValidation: { available: false, items: [] },
    warnings: [],
  };
}

const taxRows: PersistedStatementPaymentRow[] = [
  {
    id: "plan-v",
    displayOrder: 1,
    rowType: "transaction",
    dateIso: "2025-10-16",
    installmentRaw: "09/12",
    referenceRaw: "VISA PLAN V 09/12 (TNA 83,81)",
    originalText: "16-10-25 VISA PLAN V 9-12 (TNA 83,81) 040943 267.164,67",
    amountPesosRaw: "267164.67",
    amountDollarsRaw: null,
    currencyOriginal: "ARS",
  },
  {
    id: "plan-v-vat",
    displayOrder: 90,
    rowType: "tax",
    dateIso: "2026-05-28",
    installmentRaw: null,
    referenceRaw: "DB IVA $ PLAN V",
    originalText: "28-05-26 DB IVA $ PLAN V 040943 62494,55 13.123,85",
    amountPesosRaw: "13123.85",
    amountDollarsRaw: null,
    currencyOriginal: "ARS",
  },
  {
    id: "stamp",
    displayOrder: 91,
    rowType: "tax",
    dateIso: "2026-07-02",
    installmentRaw: null,
    referenceRaw: "IMPUESTO DE SELLOS",
    originalText: "02-07-26 IMPUESTO DE SELLOS $ 19.053,78",
    amountPesosRaw: "19053.78",
    amountDollarsRaw: null,
    currencyOriginal: "ARS",
  },
  {
    id: "stamp-p",
    displayOrder: 92,
    rowType: "tax",
    dateIso: "2026-07-02",
    installmentRaw: null,
    referenceRaw: "IMPUESTO DE SELLOS P",
    originalText: "02-07-26 IMPUESTO DE SELLOS P $ 44,67",
    amountPesosRaw: "44.67",
    amountDollarsRaw: null,
    currencyOriginal: "ARS",
  },
  {
    id: "rg4240",
    displayOrder: 93,
    rowType: "tax",
    dateIso: "2026-07-02",
    installmentRaw: null,
    referenceRaw: "IVA RG 4240 21%",
    originalText: "02-07-26 IVA RG 4240 21%( 4794,58) 1.006,86",
    amountPesosRaw: "1006.86",
    amountDollarsRaw: null,
    currencyOriginal: "ARS",
  },
];

describe("dynamic card taxes", () => {
  it("reconciles the accepted month and recalculates future Visa taxes from their bases", () => {
    const result = applyDynamicTaxProjection(baseResponse(), taxRows, {
      configured: true,
      pair: "USD_ARS",
      rate: "1500.00",
      effectiveDate: "2026-07-27",
      source: "manual",
      status: "active",
      updatedAt: null,
    });

    const card = result.cards[0];
    const taxes = card.movements.filter((movement) => movement.id.startsWith("tax:"));
    expect(card.movements.slice(-4).map((movement) => movement.id)).toEqual([
      "tax:plan-v-vat",
      "tax:stamp",
      "tax:stamp-p",
      "tax:rg4240",
    ]);

    const planVat = taxes.find((movement) => movement.id === "tax:plan-v-vat")!;
    expect(planVat.cells.map((cell) => [cell.monthKey, cell.ars])).toEqual([
      ["2026-07", "13123.85"],
      ["2026-08", "10122.01"],
      ["2026-09", "6910.51"],
      ["2026-10", "3474.71"],
    ]);

    const rg = taxes.find((movement) => movement.id === "tax:rg4240")!;
    expect(rg.cells.find((cell) => cell.monthKey === "2026-08")?.ars).toBe("3150.00");

    const stampForeign = taxes.find((movement) => movement.id === "tax:stamp-p")!;
    expect(stampForeign.cells.find((cell) => cell.monthKey === "2026-08")?.ars).toBe("150.00");

    const july = card.totalsByMonth.find((item) => item.monthKey === "2026-07")!;
    expect(july.totals).toEqual({ ars: "1924476.04", usd: "3.22" });
  });

  it("keeps a statement reconcilable even when it has no tax rules", () => {
    const response = baseResponse();
    response.baseline!.total = { ars: "1891246.88", usd: "3.22" };
    const result = applyDynamicTaxProjection(response, taxRows.filter((row) => row.rowType !== "tax"), {
      configured: false,
      pair: "USD_ARS",
      rate: null,
      effectiveDate: null,
      source: null,
      status: "missing",
      updatedAt: null,
    });
    const july = result.cards[0].totalsByMonth.find((item) => item.monthKey === "2026-07")!;
    expect(july.totals).toEqual({ ars: "1891246.88", usd: "3.22" });
  });
});
