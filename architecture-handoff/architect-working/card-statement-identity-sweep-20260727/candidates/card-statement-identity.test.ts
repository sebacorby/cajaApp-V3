import { describe, expect, it } from "vitest";
import {
  buildAccountSeriesKey,
  buildStatementSummaryKey,
} from "./card-statement-identity.js";
import { extractGaliciaMastercardAccountNumber } from "../card-import/galicia-mastercard.parser.js";
import { extractGaliciaVisaAccountNumber } from "../card-import/galicia-visa.parser.js";

function summary(overrides: Partial<{
  id: string;
  bankName: string;
  brand: string;
  accountNumber: string;
  statementNumber: string;
  periodKey: string;
  currentDueDate: string;
}> = {}) {
  return {
    id: overrides.id ?? "s1",
    bankName: overrides.bankName ?? "Banco Galicia",
    brand: overrides.brand ?? "VISA",
    accountNumber: overrides.accountNumber ?? "1163998245",
    statementNumber: overrides.statementNumber ?? "VI00000000001089271",
    periodKey: overrides.periodKey ?? "2026-07",
    currentDueDate: overrides.currentDueDate ?? "2026-07-13",
    nextClosingDate: "2026-07-30",
    nextDueDate: "2026-08-07",
    createdAt: new Date("2026-07-27T12:00:00Z"),
  };
}

describe("statement summary identity", () => {
  it("uses statement number + period + exact date", () => {
    const base = summary();
    expect(buildStatementSummaryKey(base)).toBe(
      "banco galicia|visa|statement:vi00000000001089271|period:2026-07|date:2026-07-13",
    );
    expect(buildStatementSummaryKey(summary({ currentDueDate: "2026-07-14" })))
      .not.toBe(buildStatementSummaryKey(base));
    expect(buildStatementSummaryKey(summary({ periodKey: "2026-08" })))
      .not.toBe(buildStatementSummaryKey(base));
    expect(buildStatementSummaryKey(summary({ statementNumber: "VI-OTHER" })))
      .not.toBe(buildStatementSummaryKey(base));
  });

  it("keeps account-series identity stable across monthly statement numbers", () => {
    expect(buildAccountSeriesKey(summary({ statementNumber: "JUL", periodKey: "2026-07" })))
      .toBe(buildAccountSeriesKey(summary({ statementNumber: "AUG", periodKey: "2026-08" })));
  });

  it("does not guess an account series when accountNumber is absent", () => {
    const one = summary({ id: "one", accountNumber: "", statementNumber: "ONE" });
    const two = summary({ id: "two", accountNumber: "", statementNumber: "TWO" });
    expect(buildAccountSeriesKey(one)).not.toBe(buildAccountSeriesKey(two));
  });
});

describe("issuer account extraction", () => {
  it("extracts Galicia Visa N° Cuenta", () => {
    expect(extractGaliciaVisaAccountNumber("N° Cuenta: 1163998245 Sucursal: 772"))
      .toBe("1163998245");
  });

  it("extracts Galicia Mastercard N° de Socio", () => {
    expect(extractGaliciaMastercardAccountNumber("N° de Socio: 2724883-0-4 Sucursal: 357"))
      .toBe("2724883-0-4");
  });
});
