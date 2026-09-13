import { describe, expect, it } from "vitest";
import type { NormalizedMovement } from "../../src/modules/movements/movements.service.js";
import { buildFutureOverview } from "../../src/modules/future/future.service.js";


function movement(
  overrides: Partial<NormalizedMovement> & Pick<NormalizedMovement, "id" | "occurredOn" | "effectiveMonthKey" | "type" | "sourceType" | "sourceId" | "description" | "currency" | "amount" | "status">,
): NormalizedMovement {
  return {
    category: { id: null, name: "Sin clasificar" },
    notes: null,
    editable: false,
    categoryEditable: false,
    createdAt: null,
    updatedAt: null,
    trace: { sourceLabel: "Origen de prueba" },
    ...overrides,
  };
}


describe("future commitments aggregation", () => {
  it("separa deuda confirmada de tarjeta e ingresos proyectados", () => {
    const result = buildFutureOverview([
      movement({
        id: "card-1",
        occurredOn: "2026-08-01",
        effectiveMonthKey: "2026-08",
        type: "expense",
        sourceType: "card_installment",
        sourceId: "projection-1",
        description: "Notebook cuota 3/12",
        currency: "ARS",
        amount: "150.000,00",
        status: "projected",
        category: { id: null, name: "Tarjetas" },
        trace: { sourceLabel: "Visa Galicia", statementId: "statement-1" },
      }),
      movement({
        id: "income-1",
        occurredOn: "2026-08-05",
        effectiveMonthKey: "2026-08",
        type: "income",
        sourceType: "income_recurring",
        sourceId: "salary-1",
        description: "Sueldo",
        currency: "ARS",
        amount: "1.500.000,00",
        status: "projected",
        category: { id: null, name: "Ingresos" },
        trace: { sourceLabel: "Empresa", incomeSourceId: "salary-1" },
      }),
    ], { from: "2026-08", months: 1 }, new Date("2026-07-12T12:00:00Z"));


    expect(result.months[0].totals.confirmedCardDebt.ars).toBe("150.000,00");
    expect(result.months[0].totals.projectedIncome.ars).toBe("1.500.000,00");
    expect(result.months[0].totals.expectedResult.ars).toBe("1.350.000,00");
    expect(result.months[0].groups[0].items[0].certainty).toBe("confirmed");
  });


  it("mantiene ARS y USD separados y suma compromisos confirmados", () => {
    const result = buildFutureOverview([
      movement({
        id: "manual-ars",
        occurredOn: "2026-09-10",
        effectiveMonthKey: "2026-09",
        type: "expense",
        sourceType: "manual_unexpected",
        sourceId: "manual-1",
        description: "Seguro anual",
        currency: "ARS",
        amount: "80.000,00",
        status: "pending",
      }),
      movement({
        id: "manual-usd",
        occurredOn: "2026-09-15",
        effectiveMonthKey: "2026-09",
        type: "expense",
        sourceType: "manual_adjustment",
        sourceId: "manual-2",
        description: "Servicio exterior",
        currency: "USD",
        amount: "120.50",
        status: "pending",
      }),
    ], { from: "2026-09", months: 1 }, new Date("2026-07-12T12:00:00Z"));


    expect(result.summary.confirmedOtherCommitments.ars).toBe("80.000,00");
    expect(result.summary.confirmedOtherCommitments.usd).toBe("120.50");
    expect(result.summary.expectedResult.ars).toBe("-80.000,00");
    expect(result.summary.expectedResult.usd).toBe("-120.50");
  });


  it("excluye gastos cotidianos ya realizados que no son deuda", () => {
    const result = buildFutureOverview([
      movement({
        id: "cash-1",
        occurredOn: "2026-07-05",
        effectiveMonthKey: "2026-07",
        type: "expense",
        sourceType: "manual_cash",
        sourceId: "cash-1",
        description: "Almuerzo",
        currency: "ARS",
        amount: "20.000,00",
        status: "actual",
      }),
    ], { from: "2026-07", months: 1 }, new Date("2026-07-12T12:00:00Z"));


    expect(result.months[0].componentCount).toBe(0);
    expect(result.summary.expectedCommitments.ars).toBe("0,00");
  });


  it("agrupa por origen y marca fechas de tarjeta estimadas", () => {
    const result = buildFutureOverview([
      movement({
        id: "card-1",
        occurredOn: "2026-10-01",
        effectiveMonthKey: "2026-10",
        type: "expense",
        sourceType: "card_installment",
        sourceId: "projection-1",
        description: "Compra A",
        currency: "ARS",
        amount: "10.000,00",
        status: "projected",
        category: { id: null, name: "Tarjetas" },
        trace: { sourceLabel: "Mastercard", statementId: "statement-1" },
      }),
      movement({
        id: "card-2",
        occurredOn: "2026-10-01",
        effectiveMonthKey: "2026-10",
        type: "expense",
        sourceType: "card_installment",
        sourceId: "projection-2",
        description: "Compra B",
        currency: "ARS",
        amount: "15.000,00",
        status: "projected",
        category: { id: null, name: "Tarjetas" },
        trace: { sourceLabel: "Mastercard", statementId: "statement-1" },
      }),
    ], { from: "2026-10", months: 1 }, new Date("2026-07-12T12:00:00Z"));


    expect(result.months[0].groups).toHaveLength(1);
    expect(result.months[0].groups[0].confirmed.ars).toBe("25.000,00");
    expect(result.months[0].dataQuality.estimatedDueDateItems).toBe(2);
    expect(result.dataQuality.status).toBe("partial");
  });
});