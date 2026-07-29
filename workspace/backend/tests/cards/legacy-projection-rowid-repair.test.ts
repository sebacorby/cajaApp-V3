import { describe, expect, it } from "vitest";
import {
  matchesLegacyProjectionGroup,
  matchesProjectionOccurrence,
  normalizeMoney,
  parseInstallmentRaw,
} from "../../src/modules/cards/legacy-projection-rowid-repair.js";

const projections = [4, 5, 6].map((installmentCurrent, index) => ({
  id: `projection-${index + 1}`,
  statementId: "statement-1",
  rowId: "preview-row-legacy",
  monthKey: `2026-${String(installmentCurrent + 4).padStart(2, "0")}`,
  installmentCurrent,
  installmentTotal: 6,
  amountPesosRaw: "3356.37",
  amountDollarsRaw: null,
  currencyOriginal: "ARS",
}));

const persistedRow = {
  id: "persisted-row-uuid",
  statementId: "statement-1",
  installmentRaw: "3/6",
  amountPesosRaw: "3356.37",
  amountDollarsRaw: null,
  currencyOriginal: "ARS",
};

describe("legacy projection rowId repair", () => {
  it("parses installment labels strictly", () => {
    expect(parseInstallmentRaw("3/6")).toEqual({ current: 3, total: 6 });
    expect(parseInstallmentRaw(" 3 / 6 ")).toEqual({ current: 3, total: 6 });
    expect(parseInstallmentRaw("7/6")).toBeNull();
    expect(parseInstallmentRaw("foo")).toBeNull();
  });

  it("normalizes Argentine and US money formats without floating point comparison", () => {
    expect(normalizeMoney("3.356,37")).toBe("3356.37");
    expect(normalizeMoney("3,356.37")).toBe("3356.37");
    expect(normalizeMoney("$ 3.356,37")).toBe("3356.37");
    expect(normalizeMoney("3356.37")).toBe("3356.37");
    expect(normalizeMoney("3.356")).toBe("3356.00");
  });

  it("matches the persisted source row from the future installment sequence", () => {
    expect(matchesLegacyProjectionGroup(projections, persistedRow)).toBe(true);
  });

  it("matches equivalent localized amount formatting", () => {
    expect(
      matchesLegacyProjectionGroup(projections, {
        ...persistedRow,
        amountPesosRaw: "$ 3.356,37",
      }),
    ).toBe(true);
  });

  it("does not guess when amount, currency or installment sequence differs", () => {
    expect(
      matchesLegacyProjectionGroup(projections, {
        ...persistedRow,
        amountPesosRaw: "9999.99",
      }),
    ).toBe(false);

    expect(
      matchesLegacyProjectionGroup(projections, {
        ...persistedRow,
        currencyOriginal: "USD",
      }),
    ).toBe(false);

    expect(
      matchesLegacyProjectionGroup(projections, {
        ...persistedRow,
        installmentRaw: "2/6",
      }),
    ).toBe(false);
  });

  it("refuses a repair when projections do not provide an amount anchor", () => {
    const weakProjections = projections.map((projection) => ({
      ...projection,
      amountPesosRaw: null,
      amountDollarsRaw: null,
    }));
    expect(matchesLegacyProjectionGroup(weakProjections, persistedRow)).toBe(false);
  });

  it("matches one projection occurrence to the correct source row", () => {
    const projection = {
      id: "projection-scentertuc-3",
      statementId: "statement-1",
      rowId: "wrong-but-valid-row-id",
      monthKey: "2026-08",
      installmentCurrent: 3,
      installmentTotal: 18,
      amountPesosRaw: "268333.33",
      amountDollarsRaw: null,
      currencyOriginal: "ARS",
    };

    const scentertuc = {
      id: "row-scentertuc",
      statementId: "statement-1",
      installmentRaw: "2/18",
      amountPesosRaw: "268.333,33",
      amountDollarsRaw: null,
      currencyOriginal: "ARS",
    };

    const iara = {
      id: "row-iara",
      statementId: "statement-1",
      installmentRaw: "1/3",
      amountPesosRaw: "21.666,68",
      amountDollarsRaw: null,
      currencyOriginal: "ARS",
    };

    expect(matchesProjectionOccurrence(projection, scentertuc, "2026-07")).toBe(true);
    expect(matchesProjectionOccurrence(projection, iara, "2026-07")).toBe(false);
  });

  it("rejects a candidate when the installment month does not match the statement period", () => {
    const projection = {
      id: "projection-scentertuc-3",
      statementId: "statement-1",
      rowId: "wrong-but-valid-row-id",
      monthKey: "2026-09",
      installmentCurrent: 3,
      installmentTotal: 18,
      amountPesosRaw: "268333.33",
      amountDollarsRaw: null,
      currencyOriginal: "ARS",
    };

    const row = {
      id: "row-scentertuc",
      statementId: "statement-1",
      installmentRaw: "2/18",
      amountPesosRaw: "268333.33",
      amountDollarsRaw: null,
      currencyOriginal: "ARS",
    };

    expect(matchesProjectionOccurrence(projection, row, "2026-07")).toBe(false);
  });
});
