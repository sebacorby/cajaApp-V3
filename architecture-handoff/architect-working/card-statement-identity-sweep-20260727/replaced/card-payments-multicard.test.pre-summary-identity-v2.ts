import { describe, expect, it } from "vitest";
import {
  buildCardIdentityKey,
  buildStatementVersionKey,
  cardIdentityDisplaySuffix,
  mergePresentedCards,
  sameCardAccount,
  selectLatestStatementPerCard,
} from "./card-payments-multicard.js";
import type { CardPaymentsResponse } from "./card-payments.service.js";

function statement(input: Partial<{
  id: string;
  periodKey: string;
  createdAt: Date;
  bankName: string;
  brand: string;
  accountNumber: string | null;
  holderName: string | null;
  statementNumber: string | null;
  last4: string[];
}> = {}) {
  return {
    id: input.id ?? crypto.randomUUID(),
    periodKey: input.periodKey ?? "2026-07",
    createdAt: input.createdAt ?? new Date("2026-07-27T12:00:00Z"),
    bankName: input.bankName ?? "Banco Galicia",
    brand: input.brand ?? "VISA",
    accountNumber: input.accountNumber === undefined ? null : input.accountNumber,
    holderName: input.holderName === undefined ? "JAVIER S CORBELLA" : input.holderName,
    statementNumber: input.statementNumber === undefined ? "VI-2026-07" : input.statementNumber,
    groups: (input.last4 ?? ["9138"]).map((cardLast4) => ({
      cardLast4,
      holderName: input.holderName === undefined ? "JAVIER S CORBELLA" : input.holderName,
    })),
  };
}

describe("card account identity", () => {
  it("keeps two Visa Galicia accounts separate when their last4 differ", () => {
    const visaA = statement({ id: "visa-a", last4: ["1111"], statementNumber: "SAME-FALLBACK" });
    const visaB = statement({ id: "visa-b", last4: ["2222"], statementNumber: "SAME-FALLBACK" });

    expect(sameCardAccount(visaA, visaB)).toBe(false);
    expect(selectLatestStatementPerCard([visaA, visaB])).toHaveLength(2);
  });

  it("keeps two Visa Galicia accounts separate when accountNumber differs even if a plastic overlaps", () => {
    const visaA = statement({ id: "visa-a", accountNumber: "ACC-0001", last4: ["9138"] });
    const visaB = statement({ id: "visa-b", accountNumber: "ACC-0002", last4: ["9138"] });

    expect(sameCardAccount(visaA, visaB)).toBe(false);
    expect(selectLatestStatementPerCard([visaA, visaB])).toHaveLength(2);
  });

  it("recognizes the same account by accountNumber across changing plastics", () => {
    const june = statement({ id: "jun", periodKey: "2026-06", accountNumber: "ACC-0001", last4: ["8238"] });
    const july = statement({ id: "jul", periodKey: "2026-07", accountNumber: "ACC-0001", last4: ["9138"] });

    expect(sameCardAccount(june, july)).toBe(true);
    expect(selectLatestStatementPerCard([june, july]).map((item) => item.id)).toEqual(["jul"]);
  });

  it("recognizes the same account only when the last4 set matches exactly", () => {
    const june = statement({ id: "jun", periodKey: "2026-06", last4: ["8238", "9138"], statementNumber: "OLD" });
    const july = statement({ id: "jul", periodKey: "2026-07", last4: ["8238", "9138"], statementNumber: "NEW" });

    expect(sameCardAccount(june, july)).toBe(true);
    expect(selectLatestStatementPerCard([june, july]).map((item) => item.id)).toEqual(["jul"]);
  });

  it("does not merge accounts on partial last4 overlap", () => {
    const first = statement({ id: "first", last4: ["8238", "9138"] });
    const second = statement({ id: "second", last4: ["9138", "1111"] });

    expect(sameCardAccount(first, second)).toBe(false);
    expect(selectLatestStatementPerCard([first, second])).toHaveLength(2);
  });

  it("uses statementNumber only as a fallback when no stronger identity exists", () => {
    const older = statement({ id: "old", periodKey: "2026-06", accountNumber: null, last4: [], statementNumber: "FALLBACK-1" });
    const newer = statement({ id: "new", periodKey: "2026-07", accountNumber: null, last4: [], statementNumber: "FALLBACK-1" });
    const other = statement({ id: "other", accountNumber: null, last4: [], statementNumber: "FALLBACK-2" });

    expect(selectLatestStatementPerCard([older, newer, other]).map((item) => item.id).sort()).toEqual(["new", "other"]);
  });

  it("builds separate card identity and statement version keys", () => {
    const item = statement({ id: "visa", periodKey: "2026-07", last4: ["9138"], statementNumber: "VI-2026-07" });

    expect(buildCardIdentityKey(item)).toContain("plastics:9138");
    expect(buildCardIdentityKey(item)).not.toContain("2026-07");
    expect(buildStatementVersionKey(item)).toContain("period:2026-07");
    expect(buildStatementVersionKey(item)).toContain("statement:vi-2026-07");
  });

  it("builds a human label from one or multiple card last4 values", () => {
    expect(cardIdentityDisplaySuffix(statement({ last4: ["1234"] }))).toBe("•••• 1234");
    expect(cardIdentityDisplaySuffix(statement({ last4: ["9138", "8238"] }))).toBe("•••• 8238 / •••• 9138");
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
      { cardId: "visa-a", cardLabel: "VISA · Banco Galicia · •••• 1111", cardLast4: "1111", holderName: null, movements: [], totalsByMonth: [{ monthKey: "2026-07", totals: { ars: "100.00", usd: "2.00" } }] },
      { cardId: "visa-b", cardLabel: "VISA · Banco Galicia · •••• 2222", cardLast4: "2222", holderName: null, movements: [], totalsByMonth: [{ monthKey: "2026-07", totals: { ars: "50.00", usd: "3.00" } }] },
    ], []);

    expect(merged.cards).toHaveLength(2);
    expect(merged.months[0].totals).toEqual({ ars: "150.00", usd: "5.00" });
  });
});
