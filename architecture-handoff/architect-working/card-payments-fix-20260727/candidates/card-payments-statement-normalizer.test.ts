import { describe, expect, it } from "vitest";
import type { CardPaymentsResponse } from "./card-payments.service.js";
import { repairMovementInstallmentSequence } from "./card-payments-presentation.base.js";
import {
  normalizeAcceptedStatementAccount,
  type PersistedStatementPaymentRow,
} from "./card-payments-statement-normalizer.js";

function baseResponse(): CardPaymentsResponse {
  return {
    baseline: {
      statementId: "statement-visa",
      periodKey: "2026-07",
      bankName: "Banco Galicia",
      brand: "VISA",
      fileName: "visa-galicia-mas-julio2026.pdf",
      currentDueDate: "2026-07-13",
      nextClosingDate: "2026-07-30",
      nextDueDate: "2026-08-07",
      total: { ars: "310.00", usd: "0.00" },
      acceptedAt: "2026-07-27T00:00:00.000Z",
    },
    range: { from: "2026-07", to: "2026-12", months: 6 },
    months: ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"].map(
      (monthKey, index) => ({
        monthKey,
        label: monthKey,
        status: index === 0 ? "confirmed" as const : "projected" as const,
        totals: { ars: "0.00", usd: "0.00" },
      }),
    ),
    cards: [
      {
        cardId: "group-8238",
        cardLabel: "JAVIER S CORBELLA",
        cardLast4: "8238",
        holderName: "JAVIER S CORBELLA",
        movements: [],
        totalsByMonth: [],
      },
      {
        cardId: "group-9138",
        cardLabel: "JAVIER S CORBELLA",
        cardLast4: "9138",
        holderName: "JAVIER S CORBELLA",
        movements: [],
        totalsByMonth: [],
      },
    ],
    issuerValidation: { available: false, items: [] },
    warnings: [],
  };
}

const rows: PersistedStatementPaymentRow[] = [
  {
    id: "juanita",
    displayOrder: 1,
    rowType: "transaction",
    dateIso: "2026-06-06",
    installmentRaw: "01/06",
    referenceRaw: "MERPAGO*JUANITAJO",
    originalText: "06-06-26 * MERPAGO*JUANITAJO 01/06 148961 100,00",
    amountPesosRaw: "100,00",
    amountDollarsRaw: null,
    currencyOriginal: "ARS",
  },
  {
    id: "plan-v",
    displayOrder: 2,
    rowType: "transaction",
    dateIso: "2025-10-16",
    installmentRaw: "09/12",
    referenceRaw: "VISA PLAN V 09/12",
    originalText: "16-10-25 VISA PLAN V 9-12 040943 200,00",
    amountPesosRaw: "200,00",
    amountDollarsRaw: null,
    currencyOriginal: "ARS",
  },
  {
    id: "tax",
    displayOrder: 3,
    rowType: "tax",
    dateIso: "2026-07-02",
    installmentRaw: null,
    referenceRaw: "IMPUESTO DE SELLOS $",
    originalText: "02-07-26 IMPUESTO DE SELLOS $ 10,00",
    amountPesosRaw: "10,00",
    amountDollarsRaw: null,
    currencyOriginal: "ARS",
  },
  {
    id: "group-total",
    displayOrder: 4,
    rowType: "group_total",
    dateIso: null,
    installmentRaw: null,
    referenceRaw: "Total Consumos",
    originalText: "Total Consumos 310,00",
    amountPesosRaw: "310,00",
    amountDollarsRaw: null,
    currencyOriginal: "ARS",
  },
];

describe("accepted statement card-payment normalization", () => {
  it("treats multiple plastics from one Visa statement as a single account", () => {
    const normalized = normalizeAcceptedStatementAccount(baseResponse(), {
      rows,
      groups: [
        { cardLast4: "8238", holderName: "JAVIER S CORBELLA" },
        { cardLast4: "9138", holderName: "JAVIER S CORBELLA" },
      ],
    });

    expect(normalized.cards).toHaveLength(1);
    expect(normalized.cards[0].cardLabel).toBe("VISA · Banco Galicia");
    expect(normalized.cards[0].cardLast4).toBeNull();
    expect(normalized.cards[0].holderName).toBe("JAVIER S CORBELLA");
    expect(normalized.cards[0].movements.filter((movement) => movement.sourceType === "statement_row"))
      .toHaveLength(3);
    expect(normalized.cards[0].movements.some((movement) => movement.id === "group-total")).toBe(false);
  });

  it("propagates every accepted installment sequence into future months", () => {
    const normalized = normalizeAcceptedStatementAccount(baseResponse(), {
      rows,
      groups: [
        { cardLast4: "8238", holderName: "JAVIER S CORBELLA" },
        { cardLast4: "9138", holderName: "JAVIER S CORBELLA" },
      ],
    });

    const rowById = new Map(rows.map((row) => [row.id, row]));
    for (const movement of normalized.cards[0].movements) {
      if (movement.sourceType !== "statement_row") continue;
      repairMovementInstallmentSequence({
        movement,
        row: rowById.get(movement.id),
        statementMonthKey: "2026-07",
        rangeFrom: "2026-07",
        rangeTo: "2026-12",
      });
    }

    const juanita = normalized.cards[0].movements.find((movement) => movement.id === "juanita")!;
    expect(juanita.cells.map((cell) => [cell.monthKey, cell.installmentNumber])).toEqual([
      ["2026-07", 1],
      ["2026-08", 2],
      ["2026-09", 3],
      ["2026-10", 4],
      ["2026-11", 5],
      ["2026-12", 6],
    ]);

    const planV = normalized.cards[0].movements.find((movement) => movement.id === "plan-v")!;
    expect(planV.cells.map((cell) => [cell.monthKey, cell.installmentNumber])).toEqual([
      ["2026-07", 9],
      ["2026-08", 10],
      ["2026-09", 11],
      ["2026-10", 12],
    ]);
  });
});
