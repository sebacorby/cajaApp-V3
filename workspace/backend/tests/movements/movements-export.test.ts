import { describe, expect, it } from "vitest";
import { buildMovementsCsv, type NormalizedMovement } from "../../src/modules/movements/movements.service.js";

function movement(overrides: Partial<NormalizedMovement> = {}): NormalizedMovement {
  return {
    id: "manual:1",
    occurredOn: "2026-07-12",
    effectiveMonthKey: "2026-07",
    type: "expense",
    sourceType: "manual_cash",
    sourceId: "11111111-1111-4111-8111-111111111111",
    description: 'Compra, con "detalle"',
    category: { id: "cat-1", name: "Alimentos" },
    currency: "ARS",
    amount: "12.345,67",
    status: "actual",
    notes: "Nota; con separador",
    editable: true,
    categoryEditable: true,
    createdAt: null,
    updatedAt: null,
    trace: { sourceLabel: "Carga manual" },
    ...overrides,
  };
}

describe("buildMovementsCsv", () => {
  it("exporta columnas de negocio y trazabilidad en UTF-8", () => {
    const csv = buildMovementsCsv([movement()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Fecha";"Mes de impacto";"Tipo"');
    expect(csv).toContain('"Compra, con ""detalle"""');
    expect(csv).toContain('"Nota; con separador"');
    expect(csv).toContain('"12.345,67"');
  });

  it("preserva ARS y USD sin conversión y agrega ids de origen", () => {
    const csv = buildMovementsCsv([
      movement(),
      movement({
        id: "card:2",
        sourceType: "card_installment",
        sourceId: "projection-2",
        currency: "USD",
        amount: "45.50",
        trace: { sourceLabel: "Visa", statementId: "statement-2" },
      }),
    ]);
    expect(csv).toContain('"ARS";"12.345,67"');
    expect(csv).toContain('"USD";"45.50"');
    expect(csv).toContain('"statement-2"');
  });
});
