import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import { cardStatementPreviewSchema } from "../../src/modules/cards/cards.schemas.js";
import { resolveCardStatementPeriodKey } from "../../src/modules/cards/cards.service.js";
import { installmentProjectionService } from "../../src/modules/projections/installment-projection.service.js";
import type { CardStatementPreview } from "../../src/modules/cards/cards.types.js";

/**
 * Build a minimal but valid preview. Tests override individual fields.
 */
function preview(
  overrides: Partial<CardStatementPreview> = {},
): CardStatementPreview {
  return {
    statementId: null,
    source: {
      bankName: "Banco Galicia",
      brand: "Visa",
      statementNumber: "123",
      pageCount: 8,
    },
    summary: {
      totalPesos: "100.000,00",
      totalDollars: "10.00",
      minimumPaymentPesos: "10.000,00",
      currentDueDate: "2026-07-15",
      nextClosingDate: "2026-07-28",
      nextDueDate: "2026-08-15",
    },
    sections: [],
    groups: [],
    rows: [],
    futureInstallmentsBlock: [],
    ...overrides,
  };
}

describe("cardStatementPreviewSchema — ISO date validation", () => {
  it("accepts a preview with valid ISO dates", () => {
    const result = cardStatementPreviewSchema.parse(preview());
    expect(result.summary.currentDueDate).toBe("2026-07-15");
    expect(result.summary.nextClosingDate).toBe("2026-07-28");
    expect(result.summary.nextDueDate).toBe("2026-08-15");
  });

  it("accepts null for summary dates", () => {
    const input = preview({
      summary: {
        ...preview().summary,
        currentDueDate: null,
        nextClosingDate: null,
        nextDueDate: null,
      },
    });
    const result = cardStatementPreviewSchema.parse(input);
    expect(result.summary.currentDueDate).toBeNull();
    expect(result.summary.nextClosingDate).toBeNull();
    expect(result.summary.nextDueDate).toBeNull();
  });

  it("rejects non-ISO currentDueDate '13-Jul-26'", () => {
    const input = preview({
      summary: {
        ...preview().summary,
        currentDueDate: "13-Jul-26",
      },
    });
    let caught: unknown;
    try {
      cardStatementPreviewSchema.parse(input);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ZodError);
    const zodError = caught as ZodError;
    const currentDueDateIssue = zodError.issues.find(
      (issue) => issue.path.join(".") === "summary.currentDueDate",
    );
    expect(currentDueDateIssue).toBeDefined();
  });

  it("rejects non-ISO nextClosingDate '31/07/26'", () => {
    const input = preview({
      summary: {
        ...preview().summary,
        nextClosingDate: "31/07/26",
      },
    });
    let caught: unknown;
    try {
      cardStatementPreviewSchema.parse(input);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ZodError);
    const zodError = caught as ZodError;
    const issue = zodError.issues.find(
      (i) => i.path.join(".") === "summary.nextClosingDate",
    );
    expect(issue).toBeDefined();
  });

  it("rejects non-ISO nextDueDate '15-Aug-2026'", () => {
    const input = preview({
      summary: {
        ...preview().summary,
        nextDueDate: "15-Aug-2026",
      },
    });
    let caught: unknown;
    try {
      cardStatementPreviewSchema.parse(input);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ZodError);
    const zodError = caught as ZodError;
    const issue = zodError.issues.find(
      (i) => i.path.join(".") === "summary.nextDueDate",
    );
    expect(issue).toBeDefined();
  });
});

describe("acceptDraft periodKey resolution — FEAT-024 rebound", () => {
  it("does not crash with 'statementPeriodKey must use YYYY-MM format' when currentDueDate is non-ISO '13-Jul-26'", () => {
    // Reproduces the bug: AI extraction returned "13-Jul-26" instead of "2026-07-13".
    // Pre-fix code computed `statementMonthKey = "13-Jul-26".slice(0, 7) = "13-Jul-"`
    // and passed it to calculateProjections → requireMonthKey → threw.
    // Post-fix: periodKey is derived from resolveCardStatementPeriodKey (null for
    // non-ISO) and falls back to getStatementMonthKey(rows) which uses valid dateIso.
    const row = {
      id: "r1",
      displayOrder: 1,
      sourcePage: 1,
      sectionId: "consumption-detail",
      sectionLabel: "Consumo",
      groupId: "g-6792",
      groupLabel: "TARJETA 6792",
      groupOrder: 1,
      rowType: "transaction" as const,
      editable: true,
      dateRaw: "13-Jul-26",
      dateIso: "2026-07-13",
      markerRaw: null,
      referenceRaw: "AMAZON.COM",
      installmentRaw: "1/3",
      installmentCurrent: 1,
      installmentTotal: 3,
      receiptRaw: "123",
      amountPesos: "10000.00",
      amountDollars: null,
      currencyOriginal: "ARS" as const,
      originalText: "AMAZON.COM 1/3 10000.00",
      confidence: 0.95,
      warnings: [],
    };

    const input = preview({
      summary: {
        ...preview().summary,
        currentDueDate: "13-Jul-26",
        nextClosingDate: null,
        nextDueDate: null,
      },
      rows: [row],
    });

    // Mirror the post-fix acceptDraft logic (cards.service.ts lines 659-680).
    const periodKey =
      resolveCardStatementPeriodKey(input) ??
      installmentProjectionService.getStatementMonthKey(input.rows);

    // periodKey must be a valid YYYY-MM (not "13-Jul-" and not null when rows exist).
    expect(periodKey).toMatch(/^\d{4}-\d{2}$/);
    expect(periodKey).toBe("2026-07");

    // calculateProjections must not throw the YYYY-MM format error.
    let projections: ReturnType<
      typeof installmentProjectionService.calculateProjections
    >;
    expect(() => {
      projections = installmentProjectionService.calculateProjections(
        input.rows,
        periodKey,
      );
    }).not.toThrow();
    // We won't assert projection shape deeply — just that the call succeeded.
    expect(projections!).toBeDefined();
  });

  it("falls back to today's YYYY-MM when currentDueDate is non-ISO and rows have no valid dateIso", () => {
    const rowNoDate = {
      id: "r1",
      displayOrder: 1,
      sourcePage: 1,
      sectionId: "consumption-detail",
      sectionLabel: "Consumo",
      groupId: "g-6792",
      groupLabel: "TARJETA 6792",
      groupOrder: 1,
      rowType: "transaction" as const,
      editable: true,
      dateRaw: null,
      dateIso: null,
      markerRaw: null,
      referenceRaw: "AMAZON.COM",
      installmentRaw: null,
      installmentCurrent: null,
      installmentTotal: null,
      receiptRaw: "123",
      amountPesos: "10000.00",
      amountDollars: null,
      currencyOriginal: "ARS" as const,
      originalText: "AMAZON.COM 10000.00",
      confidence: 0.95,
      warnings: [],
    };

    const input = preview({
      summary: {
        ...preview().summary,
        currentDueDate: "13-Jul-26",
        nextClosingDate: null,
        nextDueDate: null,
      },
      rows: [rowNoDate],
    });

    const periodKey =
      resolveCardStatementPeriodKey(input) ??
      installmentProjectionService.getStatementMonthKey(input.rows);

    expect(periodKey).toMatch(/^\d{4}-\d{2}$/);
    // Today's month — the safe fallback when nothing else works.
    const today = new Date();
    const expectedMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    expect(periodKey).toBe(expectedMonth);

    expect(() =>
      installmentProjectionService.calculateProjections(input.rows, periodKey),
    ).not.toThrow();
  });
});
