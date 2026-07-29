import { describe, expect, it } from "vitest";
import {
  buildDashboardAlerts,
  type DashboardAlertFacts,
} from "../../src/modules/dashboard/dashboard.service.js";
import type { NormalizedMovement } from "../../src/modules/movements/movements.service.js";

function movement(overrides: Partial<NormalizedMovement> & Pick<NormalizedMovement, "id" | "occurredOn" | "type" | "currency" | "amount" | "status">): NormalizedMovement {
  return {
    effectiveMonthKey: overrides.occurredOn.slice(0, 7),
    sourceType: "manual_cash",
    sourceId: overrides.id,
    description: overrides.id,
    category: { id: "cat", name: "Supermercado" },
    notes: null,
    editable: true,
    categoryEditable: true,
    createdAt: null,
    updatedAt: null,
    trace: { sourceLabel: "Prueba" },
    ...overrides,
  };
}

const query = { from: "2026-07-01", to: "2026-07-31" };
const baseFacts: DashboardAlertFacts = {
  today: "2026-07-12",
  cardDueDates: [],
  rejectedCsvImports: 0,
  rejectedCsvRows: 0,
  exchangeRateConfigured: true,
};

describe("buildDashboardAlerts", () => {
  it("detecta saldo negativo, sin clasificar y aumento de gasto >= 20%", () => {
    const alerts = buildDashboardAlerts([
      movement({ id: "prev", occurredOn: "2026-06-10", type: "expense", currency: "ARS", amount: "100.000,00", status: "actual" }),
      movement({ id: "current", occurredOn: "2026-07-10", type: "expense", currency: "ARS", amount: "130.000,00", status: "actual", category: { id: null, name: "Sin clasificar" } }),
    ], query, baseFacts);

    expect(alerts.map((alert) => alert.id)).toEqual(expect.arrayContaining([
      "negative-operating-balance",
      "unclassified-movements",
      "significant-expense-increase",
    ]));
    expect(alerts[0].severity).toBe("critical");
    expect(alerts.find((alert) => alert.id === "significant-expense-increase")?.evidence).toContain("Variación ARS: +30.00%");
  });

  it("incorpora hechos operativos y mantiene destinos auditables", () => {
    const alerts = buildDashboardAlerts([
      movement({ id: "usd", occurredOn: "2026-07-05", type: "expense", currency: "USD", amount: "10.00", status: "actual" }),
      movement({ id: "salary", occurredOn: "2026-07-20", type: "income", currency: "ARS", amount: "50.000,00", status: "projected", sourceType: "income_recurring" }),
    ], query, {
      today: "2026-07-12",
      cardDueDates: [{ statementId: "statement-1", label: "Galicia · Visa", dueDate: "2026-07-17" }],
      rejectedCsvImports: 1,
      rejectedCsvRows: 3,
      exchangeRateConfigured: false,
    });

    expect(alerts.map((alert) => alert.id)).toEqual(expect.arrayContaining([
      "expected-income-not-actual",
      "card-due-soon",
      "csv-rejected-rows",
      "missing-usd-exchange-rate",
    ]));
    expect(alerts.find((alert) => alert.id === "card-due-soon")?.action.section).toBe("tarjetas");
    expect(alerts.find((alert) => alert.id === "expected-income-not-actual")?.action.drilldown?.includeProjected).toBe(true);
  });

  it("no crea alertas cuando ninguna regla se cumple", () => {
    const alerts = buildDashboardAlerts([
      movement({ id: "income", occurredOn: "2026-07-01", type: "income", currency: "ARS", amount: "100.000,00", status: "actual" }),
      movement({ id: "expense", occurredOn: "2026-07-02", type: "expense", currency: "ARS", amount: "20.000,00", status: "actual" }),
    ], query, baseFacts);
    expect(alerts).toEqual([]);
  });
});
