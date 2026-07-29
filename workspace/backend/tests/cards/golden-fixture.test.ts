import { describe, it, expect } from "vitest";
import { cardStatementPreviewSchema } from "../../src/modules/cards/cards.schemas.js";
import { validateData } from "../../src/shared/validation.js";
import fs from "fs/promises";
import path from "path";

const GOLDEN_FIXTURE_PATH = path.join(
  process.cwd(),
  "..",
  "..",
  "contracts",
  "examples",
  "cards",
  "visa-galicia-julio2026.sanitized.preview.json"
);

describe("Golden fixture validation", () => {
  let fixture: Record<string, unknown>;

  beforeEach(async () => {
    const content = await fs.readFile(GOLDEN_FIXTURE_PATH, "utf-8");
    fixture = JSON.parse(content);
  });

  it("fixture has correct section order", () => {
    const sections = fixture.sections as Array<{ id: string; displayOrder: number }>;
    const sectionIds = sections.map(s => s.id);

    expect(sectionIds).toEqual([
      "header",
      "total-to-pay",
      "billing-cycle",
      "payment-limits-rates",
      "consolidated",
      "consumption-detail",
      "charges-and-taxes",
      "statement-total",
      "plan-v",
      "future-installments",
      "legal-text",
    ]);
  });

  it("fixture has correct group order", () => {
    const groups = fixture.groups as Array<{ id: string; cardLast4: string }>;
    const groupIds = groups.map(g => g.id);
    const cardLast4s = groups.map(g => g.cardLast4);

    expect(groupIds).toEqual(["g-6792", "g-5884", "g-4255", "g-0015"]);
    expect(cardLast4s).toEqual(["6792", "5884", "4255", "0015"]);
  });

  it("fixture has charges after groups", () => {
    const rows = fixture.rows as Array<{ id: string; rowType: string; sectionId: string }>;

    const lastGroupRowIndex = rows.findIndex(r => r.id === "r-0015-t");
    const chargeRowIndex = rows.findIndex(r => r.sectionId === "charges-and-taxes");

    expect(chargeRowIndex).toBeGreaterThan(lastGroupRowIndex);
    expect(lastGroupRowIndex).toBeGreaterThan(0);
  });

  it("fixture has all required sections", () => {
    const sections = fixture.sections as Array<{ id: string }>;
    const sectionIds = new Set(sections.map(s => s.id));

    expect(sectionIds.has("header")).toBe(true);
    expect(sectionIds.has("total-to-pay")).toBe(true);
    expect(sectionIds.has("billing-cycle")).toBe(true);
    expect(sectionIds.has("payment-limits-rates")).toBe(true);
    expect(sectionIds.has("consolidated")).toBe(true);
    expect(sectionIds.has("consumption-detail")).toBe(true);
    expect(sectionIds.has("charges-and-taxes")).toBe(true);
    expect(sectionIds.has("statement-total")).toBe(true);
    expect(sectionIds.has("plan-v")).toBe(true);
    expect(sectionIds.has("future-installments")).toBe(true);
    expect(sectionIds.has("legal-text")).toBe(true);
  });

  it("fixture has valid preview schema", () => {
    const validated = validateData(cardStatementPreviewSchema, fixture);
    expect(validated.sections.length).toBeGreaterThan(0);
    expect(validated.groups.length).toBeGreaterThan(0);
    expect(validated.rows.length).toBeGreaterThan(0);
  });

  it("fixture groups match card order", () => {
    const groups = fixture.groups as Array<{ id: string; holderName: string }>;
    expect(groups[0].holderName).toContain("JAVIER SEB CORBELLA");
    expect(groups[1].holderName).toContain("EMILSE RITA JIMENEZ");
    expect(groups[2].holderName).toContain("JAVIER SEB CORBELLA");
    expect(groups[3].holderName).toContain("LUCAS SALVA JIMENEZ");
  });

  it("fixture has futureInstallmentsBlock with months", () => {
    const fib = fixture.futureInstallmentsBlock as Array<{ referenceRaw: string }>;
    const references = fib.map(r => r.referenceRaw);

    expect(references).toContain("Julio/26");
    expect(references).toContain("Agosto/26");
    expect(references).toContain("Setiembre/26");
    expect(references).toContain("Octubre/26");
    expect(references).toContain("Noviembre/26");
    expect(references).toContain("Diciembre/26");
    expect(references).toContain("A partir de Enero/27");
  });
});
