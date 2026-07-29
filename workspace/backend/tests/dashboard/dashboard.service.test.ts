import { describe, expect, it } from "vitest";
import { buildDashboardOverview } from "../../src/modules/dashboard/dashboard.service.js";
import type { NormalizedMovement } from "../../src/modules/movements/movements.service.js";


function movement(
  partial: Partial<NormalizedMovement> & Pick<
    NormalizedMovement,
    "id" | "occurredOn" | "type" | "currency" | "amount" | "status"
  >,
): NormalizedMovement {
  return {
    effectiveMonthKey: partial.occurredOn.slice(0, 7),
    sourceType: "manual_cash",
    sourceId: partial.id,
    description: partial.id,
    category: { id: "cat-food", name: "Supermercado" },
    notes: null,
    editable: true,
    categoryEditable: true,
    createdAt: null,
    updatedAt: null,
    trace: { sourceLabel: "Prueba" },
    ...partial,
  };
}


describe("buildDashboardOverview", () => {
  it("separa realizados, pendientes y proyectados sin mezclar ARS y USD", () => {
    const result = buildDashboardOverview([
      movement({ id: "income-ars", occurredOn: "2026-07-01", type: "income", currency: "ARS", amount: "100.000,00", status: "actual" }),
      movement({ id: "expense-ars", occurredOn: "2026-07-02", type: "expense", currency: "ARS", amount: "25.000,00", status: "actual" }),
      movement({ id: "pending-usd", occurredOn: "2026-07-03", type: "expense", currency: "USD", amount: "50.00", status: "pending" }),
      movement({ id: "projected-ars", occurredOn: "2026-07-04", type: "expense", currency: "ARS", amount: "10.000,00", status: "projected" }),
    ], [{ id: "cat-food", name: "Supermercado", color: "#10b981", icon: "shopping-cart" }], { from: "2026-07-01", to: "2026-07-31" });


    expect(result.summary.actual.incomeArs).toBe("100.000,00");
    expect(result.summary.actual.expenseArs).toBe("25.000,00");
    expect(result.summary.actual.balanceArs).toBe("75.000,00");
    expect(result.summary.actual.savingsRateArs).toBe("75.00");
    expect(result.summary.actual.savingsRateUsd).toBeNull();
    expect(result.summary.pending.expenseUsd).toBe("50.00");
    expect(result.summary.projected.expenseArs).toBe("10.000,00");
    expect(result.summary.expected.balanceArs).toBe("65.000,00");
    expect(result.summary.expected.balanceUsd).toBe("-50.00");
  });


  it("no inventa una tasa de ahorro cuando no existe una base de ingresos", () => {
    const result = buildDashboardOverview([
      movement({
        id: "expense-without-income",
        occurredOn: "2026-07-08",
        type: "expense",
        currency: "ARS",
        amount: "5.000,00",
        status: "actual",
      }),
    ], [], { from: "2026-07-01", to: "2026-07-31" });


    expect(result.summary.actual.balanceArs).toBe("-5.000,00");
    expect(result.summary.actual.savingsRateArs).toBeNull();
    expect(result.summary.actual.savingsRateUsd).toBeNull();
  });


  it("calcula categorías sólo con egresos realizados", () => {
    const result = buildDashboardOverview([
      movement({ id: "food-1", occurredOn: "2026-07-05", type: "expense", currency: "ARS", amount: "30.000,00", status: "actual" }),
      movement({ id: "food-future", occurredOn: "2026-07-06", type: "expense", currency: "ARS", amount: "20.000,00", status: "projected" }),
    ], [{ id: "cat-food", name: "Supermercado", color: "#10b981", icon: "shopping-cart" }], { from: "2026-07-01", to: "2026-07-31" });


    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].amountArs).toBe("30.000,00");
    expect(result.categories[0].shareArs).toBe("100.00");
  });


  it("compara contra el período calendario inmediatamente anterior", () => {
    const result = buildDashboardOverview([
      movement({ id: "current", occurredOn: "2026-07-10", type: "income", currency: "ARS", amount: "120.000,00", status: "actual" }),
      movement({ id: "previous", occurredOn: "2026-06-09", type: "income", currency: "ARS", amount: "100.000,00", status: "actual" }),
    ], [], { from: "2026-07-01", to: "2026-07-31" });


    expect(result.previousRange).toEqual({ from: "2026-06-01", to: "2026-06-30" });
    expect(result.comparison.incomeArs).toBe("20.00");
  });


  it("expone la última actualización real del período sin tomar registros externos", () => {
    const result = buildDashboardOverview([
      movement({
        id: "older-current",
        occurredOn: "2026-07-05",
        type: "expense",
        currency: "ARS",
        amount: "1.000,00",
        status: "actual",
        createdAt: "2026-07-05T12:00:00.000Z",
        updatedAt: "2026-07-06T10:00:00.000Z",
      }),
      movement({
        id: "latest-current",
        occurredOn: "2026-07-10",
        type: "expense",
        currency: "ARS",
        amount: "2.000,00",
        status: "actual",
        createdAt: "2026-07-10T12:00:00.000Z",
        updatedAt: "2026-07-12T15:30:00.000Z",
      }),
      movement({
        id: "newer-outside-range",
        occurredOn: "2026-08-01",
        type: "expense",
        currency: "ARS",
        amount: "3.000,00",
        status: "actual",
        createdAt: "2026-08-01T18:00:00.000Z",
        updatedAt: "2026-08-02T18:00:00.000Z",
      }),
    ], [], { from: "2026-07-01", to: "2026-07-31" });


    expect(result.dataQuality.lastUpdatedAt).toBe("2026-07-12T15:30:00.000Z");
  });
});