import { describe, expect, it } from "vitest";
import {
  mergePresentedCards,
  selectLatestStatementPerCard,
} from "./card-payments-multicard.js";
import type { CardPaymentsResponse } from "./card-payments.service.js";

function statement(input: Partial<{
  id: string;
  periodKey: string;
  createdAt: Date;
  bankName: string;
  brand: string;
  statementNumber: string;
  last4: string[];
}> = {}) {
  return {
    id: input.id ?? crypto.randomUUID(),
    periodKey: input.periodKey ?? "2026-07",
    createdAt: input.createdAt ?? new Date("2026-07-27T12:00:00Z"),
    bankName: input.bankName ?? "Banco Galicia",
    brand: input.brand ?? "VISA",
    statementNumber: input.statementNumber ?? "VISA-ACCOUNT-1",
    groups: (input.last4 ?? ["9138"]).map((cardLast4) => ({ cardLast4 })),
  };
}

describe("selectLatestStatementPerCard", () => {
  it("keeps Visa and Mastercard at the same time", () => {
    const visa = statement({ id: "visa", brand: "VISA", statementNumber: "V-1", last4: ["8238", "9138"] });
    const master = statement({ id: "master", brand: "MASTERCARD", statementNumber: "M-1", last4: ["4157"] });
    expect(selectLatestStatementPerCard([visa, master]).map((item) => item.id).sort()).toEqual(["master", "visa"]);
  });

  it("replaces only an older statement of the same card account", () => {
    const visaJune = statement({ id: "visa-jun", periodKey: "2026-06", statementNumber: "V-1", last4: ["8238", "9138"] });
    const visaJuly = statement({ id: "visa-jul", periodKey: "2026-07", statementNumber: "V-1", last4: ["8238", "9138"] });
    const master = statement({ id: "master", brand: "MASTERCARD", statementNumber: "M-1", last4: ["4157"] });
    expect(selectLatestStatementPerCard([visaJune, visaJuly, master]).map((item) => item.id).sort()).toEqual(["master", "visa-jul"]);
  });

  it("uses overlapping plastics to recognize the same account when metadata changes", () => {
    const older = statement({ id: "old", periodKey: "2026-06", statementNumber: "OLD", last4: ["8238", "9138"] });
    const newer = statement({ id: "new", periodKey: "2026-07", statementNumber: "NEW", last4: ["9138", "1111"] });
    expect(selectLatestStatementPerCard([older, newer]).map((item) => item.id)).toEqual(["new"]);
  });

  it("keeps separate accounts with same bank and brand when identifiers differ", () => {
    const first = statement({ id: "first", statementNumber: "V-1", last4: ["1111"] });
    const second = statement({ id: "second", statementNumber: "V-2", last4: ["2222"] });
    expect(selectLatestStatementPerCard([first, second])).toHaveLength(2);
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
