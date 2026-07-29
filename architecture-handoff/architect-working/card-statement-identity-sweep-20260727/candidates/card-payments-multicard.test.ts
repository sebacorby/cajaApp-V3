import { describe, expect, it } from "vitest";
import {
  mergePresentedCards,
  selectCurrentStatementsForPayments,
} from "./card-payments-multicard.js";
import type { CardPaymentsResponse } from "./card-payments.service.js";

function statement(input: Partial<{
  id: string;
  periodKey: string;
  createdAt: Date;
  bankName: string;
  brand: string;
  accountNumber: string | null;
  statementNumber: string;
  currentDueDate: string;
}> = {}) {
  return {
    id: input.id ?? crypto.randomUUID(),
    periodKey: input.periodKey ?? "2026-07",
    createdAt: input.createdAt ?? new Date("2026-07-27T12:00:00Z"),
    bankName: input.bankName ?? "Banco Galicia",
    brand: input.brand ?? "VISA",
    accountNumber:
      input.accountNumber === undefined ? "1163998245" : input.accountNumber,
    holderName: "Javier",
    statementNumber: input.statementNumber ?? "VI-JUL",
    currentDueDate: input.currentDueDate ?? "2026-07-13",
    nextClosingDate: "2026-07-30",
    nextDueDate: "2026-08-07",
    groups: [
      { cardLast4: "8238", holderName: "TITULAR" },
      { cardLast4: "9138", holderName: "ADICIONAL" },
    ],
  };
}

describe("selectCurrentStatementsForPayments", () => {
  it("keeps Visa and Mastercard simultaneously", () => {
    const visa = statement({ id: "visa", brand: "VISA", accountNumber: "1163998245", statementNumber: "VI-JUL" });
    const master = statement({ id: "master", brand: "MASTERCARD BLACK", accountNumber: "2724883-0-4", statementNumber: "027012704157" });
    expect(selectCurrentStatementsForPayments([visa, master]).map((item) => item.id).sort())
      .toEqual(["master", "visa"]);
  });

  it("never treats titular/adicional groups as separate account identity", () => {
    const visa = statement({ id: "visa" });
    expect(selectCurrentStatementsForPayments([visa])).toHaveLength(1);
  });

  it("collapses a true duplicate summary by number + period + date", () => {
    const oldCopy = statement({ id: "old", createdAt: new Date("2026-07-27T10:00:00Z") });
    const newCopy = statement({ id: "new", createdAt: new Date("2026-07-27T12:00:00Z") });
    expect(selectCurrentStatementsForPayments([oldCopy, newCopy]).map((item) => item.id))
      .toEqual(["new"]);
  });

  it("keeps two Visa accounts from the same bank separate", () => {
    const first = statement({ id: "v1", accountNumber: "1111111111", statementNumber: "V1" });
    const second = statement({ id: "v2", accountNumber: "2222222222", statementNumber: "V2" });
    expect(selectCurrentStatementsForPayments([first, second])).toHaveLength(2);
  });

  it("uses only the newest month for the same stable account series", () => {
    const july = statement({ id: "jul", accountNumber: "1163998245", statementNumber: "VI-JUL", periodKey: "2026-07", currentDueDate: "2026-07-13" });
    const august = statement({ id: "aug", accountNumber: "1163998245", statementNumber: "VI-AUG", periodKey: "2026-08", currentDueDate: "2026-08-13" });
    expect(selectCurrentStatementsForPayments([july, august]).map((item) => item.id))
      .toEqual(["aug"]);
  });

  it("does not merge legacy summaries with no stable account identity", () => {
    const visa = statement({ id: "visa", accountNumber: null, statementNumber: "VI-JUL" });
    const master = statement({ id: "master", brand: "MASTERCARD BLACK", accountNumber: null, statementNumber: "MC-JUL" });
    expect(selectCurrentStatementsForPayments([visa, master])).toHaveLength(2);
  });
});

describe("mergePresentedCards", () => {
  it("sums monthly totals across cards without deleting either card", () => {
    const base = {
      baseline: null,
      range: { from: "2026-07", to: "2026-08", months: 2 },
      months: [
        { monthKey: "2026-07", label: "Jul 2026", status: "confirmed", totals: { ars: "0.00", usd: "0.00" } },
        { monthKey: "2026-08", label: "Ago 2026", status: "projected", totals: { ars: "0.00", usd: "0.00" } },
      ],
      cards: [],
      issuerValidation: { available: false, items: [] },
      warnings: [],
    } satisfies CardPaymentsResponse;

    const merged = mergePresentedCards(base, [
      { cardId: "visa", cardLabel: "VISA", cardLast4: null, holderName: null, movements: [], totalsByMonth: [{ monthKey: "2026-07", totals: { ars: "100.00", usd: "2.00" } }] },
      { cardId: "master", cardLabel: "MASTERCARD", cardLast4: null, holderName: null, movements: [], totalsByMonth: [{ monthKey: "2026-07", totals: { ars: "50.00", usd: "3.00" } }] },
    ], []);

    expect(merged.cards).toHaveLength(2);
    expect(merged.months[0].totals).toEqual({ ars: "150.00", usd: "5.00" });
  });
});
