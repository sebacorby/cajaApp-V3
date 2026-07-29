/**
 * Integration tests for the AI extraction pipeline's date normalization.
 *
 * Tests that `normalizeModelResponse` (called internally by `extractCardStatement`)
 * accepts non-ISO date strings and normalizes them to ISO YYYY-MM-DD before schema validation.
 *
 * R3-3 RED → GREEN: these tests fail BEFORE the R3-2 fix (non-ISO dates pass through
 * as-is and fail Zod validation) and pass AFTER (non-ISO dates are normalized to ISO).
 */
import { describe, it, expect } from "vitest";
import { AiExtractionService } from "../../src/modules/ai/ai-extraction.service.js";
import { cardStatementPreviewSchema } from "../../src/modules/cards/cards.schemas.js";
import { validateData } from "../../src/shared/validation.js";

const aiService = new AiExtractionService();

/** Minimal raw model output object that `normalizeModelResponse` expects */
function makeRawOutput(overrides: {
  currentDueDate?: string | null;
  nextClosingDate?: string | null;
  nextDueDate?: string | null;
} = {}) {
  return {
    statementId: "stmt-test-001",
    source: {
      bankName: "Banco Galicia",
      brand: "Visa",
      statementNumber: "001",
      pageCount: 1,
    },
    summary: {
      totalPesos: "100000.00",
      totalDollars: "100.00",
      minimumPaymentPesos: "10000.00",
      currentDueDate: "2026-07-15",
      nextClosingDate: "2026-07-28",
      nextDueDate: "2026-08-15",
      ...overrides,
    },
    sections: [],
    groups: [],
    rows: [],
    futureInstallmentsBlock: [],
  };
}

describe("AI extraction pipeline — non-ISO date normalization", () => {
  /**
   * Call normalizeModelResponse via the internal path by extracting the logic
   * into a testable shape. Since normalizeModelResponse is private, we call it
   * through an any-cast on the service instance.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callNormalize = (raw: Record<string, unknown>, pageCount: number) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (aiService as any).normalizeModelResponse(raw, pageCount);

  it("normalizes DD-Mon-YY currentDueDate to ISO", () => {
    const raw = makeRawOutput({ currentDueDate: "13-Jul-26" });
    const result = callNormalize(raw, 1) as Record<string, unknown>;
    expect(result.summary).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.summary as any).currentDueDate).toBe("2026-07-13");
  });

  it("normalizes DD/MM/YYYY nextDueDate to ISO", () => {
    const raw = makeRawOutput({ nextDueDate: "15/08/2026" });
    const result = callNormalize(raw, 1) as Record<string, unknown>;
    expect(result.summary).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.summary as any).nextDueDate).toBe("2026-08-15");
  });

  it("normalizes Month DD, YYYY nextClosingDate to ISO", () => {
    const raw = makeRawOutput({ nextClosingDate: "July 28, 2026" });
    const result = callNormalize(raw, 1) as Record<string, unknown>;
    expect(result.summary).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.summary as any).nextClosingDate).toBe("2026-07-28");
  });

  it("normalized output passes cardStatementPreviewSchema validation", () => {
    const raw = makeRawOutput({
      currentDueDate: "13-Jul-26",
      nextClosingDate: "28-Jul-26",
      nextDueDate: "15/08/2026",
    });
    const result = callNormalize(raw, 1);
    // This throws if the result doesn't match the schema — proving ISO normalization works
    expect(() => validateData(cardStatementPreviewSchema, result)).not.toThrow();
  });

  it("mixed non-ISO formats across all three date fields", () => {
    const raw = makeRawOutput({
      currentDueDate: "13-Jul-26",
      nextClosingDate: "July 28, 2026",
      nextDueDate: "15/08/2026",
    });
    const result = callNormalize(raw, 1) as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary = result.summary as any;
    expect(summary.currentDueDate).toBe("2026-07-13");
    expect(summary.nextClosingDate).toBe("2026-07-28");
    expect(summary.nextDueDate).toBe("2026-08-15");
  });
});
