import { describe, expect, it } from "vitest";
import type {
  CardStatementPreview,
  CardStatementRow,
} from "../../src/modules/cards/cards.types.js";
import {
  normalizeIssuerFutureReferences,
  parseIssuerPeriodLabel,
  resolveIssuerReferenceTargets,
} from "../../src/modules/cards/issuer-future-reference.js";

function futureRow(
  id: string,
  displayOrder: number,
  period: string,
  amountPesos: string,
): CardStatementRow {
  return {
    id,
    displayOrder,
    sourcePage: 8,
    sectionId: "future-installments",
    sectionLabel: "Cuotas a vencer",
    groupId: null,
    groupLabel: null,
    groupOrder: null,
    rowType: "future_installment_reference",
    editable: false,
    dateRaw: null,
    dateIso: null,
    markerRaw: null,
    referenceRaw: period,
    installmentRaw: null,
    installmentCurrent: null,
    installmentTotal: null,
    receiptRaw: null,
    amountPesos,
    amountDollars: null,
    currencyOriginal: "ARS",
    originalText: `${period} $ ${amountPesos}`,
    confidence: 0.99,
    warnings: [],
  };
}

function previewWith(
  rows: CardStatementRow[],
): Pick<CardStatementPreview, "futureInstallmentsBlock"> {
  return { futureInstallmentsBlock: rows };
}

function issuerRows(): CardStatementRow[] {
  return [
    futureRow("future-1", 1, "Julio-26", "955818.67"),
    futureRow("future-2", 2, "Agosto-26", "955818.67"),
    futureRow("future-3", 3, "Septiembre-26", "820801.97"),
    futureRow("future-4", 4, "Octubre-26", "562204.31"),
    futureRow("future-5", 5, "Noviembre-26", "562204.31"),
    futureRow("future-6", 6, "Diciembre-26", "302342.21"),
  ];
}

describe("issuer future installment references", () => {
  it("preserves explicit issuer periods and amounts", () => {
    const result = normalizeIssuerFutureReferences(previewWith(issuerRows()));

    expect(result.map((item) => item.issuerPeriodKey)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
    expect(result.map((item) => item.amountPesosRaw)).toEqual([
      "955818.67",
      "955818.67",
      "820801.97",
      "562204.31",
      "562204.31",
      "302342.21",
    ]);
  });

  it("maps a same-period issuer sequence to the following payment months", () => {
    const normalized = normalizeIssuerFutureReferences(previewWith(issuerRows()));
    const result = resolveIssuerReferenceTargets(normalized, "2026-07");

    expect(result.map((item) => item.targetPaymentMonthKey)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
    expect(
      result.every((item) => item.periodBasis === "next_statement_sequence"),
    ).toBe(true);
  });

  it("uses issuer months directly when the sequence starts in the next month", () => {
    const rows = [
      futureRow("future-1", 1, "Agosto-26", "100.00"),
      futureRow("future-2", 2, "Septiembre-26", "80.00"),
    ];
    const normalized = normalizeIssuerFutureReferences(previewWith(rows));
    const result = resolveIssuerReferenceTargets(normalized, "2026-07");

    expect(result.map((item) => item.targetPaymentMonthKey)).toEqual([
      "2026-08",
      "2026-09",
    ]);
    expect(
      result.every((item) => item.periodBasis === "explicit_future_month"),
    ).toBe(true);
  });

  it("does not guess when the issuer sequence cannot be mapped safely", () => {
    const rows = [futureRow("future-1", 1, "Noviembre-26", "100.00")];
    const normalized = normalizeIssuerFutureReferences(previewWith(rows));
    const result = resolveIssuerReferenceTargets(normalized, "2026-07");

    expect(result[0].targetPaymentMonthKey).toBeNull();
    expect(result[0].periodBasis).toBe("unknown");
  });

  it("parses common explicit issuer period labels and ignores unrelated text", () => {
    expect(parseIssuerPeriodLabel("Setiembre-26")?.issuerPeriodKey).toBe(
      "2026-09",
    );
    expect(parseIssuerPeriodLabel("03/2027")?.issuerPeriodKey).toBe("2027-03");
    expect(parseIssuerPeriodLabel("saldo de cuotas futuras")).toBeNull();
  });

  it("ignores rows that are not issuer future references", () => {
    const row = futureRow("future-1", 1, "Julio-26", "955818.67");
    row.rowType = "transaction";

    expect(normalizeIssuerFutureReferences(previewWith([row]))).toEqual([]);
  });
});
