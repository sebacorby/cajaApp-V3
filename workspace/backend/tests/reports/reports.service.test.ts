import { describe, expect, it } from "vitest";
import { buildReportsCsv, buildReportsOverview } from "../../src/modules/reports/reports.service.js";
import type { NormalizedMovement } from "../../src/modules/movements/movements.service.js";

function movement(overrides: Partial<NormalizedMovement> & Pick<NormalizedMovement, "id" | "occurredOn" | "type" | "currency" | "amount">): NormalizedMovement {
  return {
    effectiveMonthKey: overrides.occurredOn.slice(0, 7),
    sourceType: "manual_cash",
    sourceId: overrides.id,
    description: overrides.id,
    category: { id: "cat-general", name: "General" },
    status: "actual",
    notes: null,
    editable: false,
    categoryEditable: false,
    createdAt: null,
    updatedAt: null,
    trace: { sourceLabel: "Carga manual" },
    ...overrides,
  };
}

describe("buildReportsOverview", () => {
  it("calcula totales, promedios y comparación sin mezclar ARS y USD", () => {
    const report = buildReportsOverview([
      movement({ id: "previous-income", occurredOn: "2026-05-10", type: "income", currency: "ARS", amount: "100.000,00" }),
      movement({ id: "income-ars", occurredOn: "2026-06-05", type: "income", currency: "ARS", amount: "150.000,00" }),
      movement({ id: "expense-ars", occurredOn: "2026-06-10", type: "expense", currency: "ARS", amount: "30.000,00" }),
      movement({ id: "income-usd", occurredOn: "2026-06-12", type: "income", currency: "USD", amount: "200.00" }),
      movement({ id: "expense-usd", occurredOn: "2026-06-15", type: "expense", currency: "USD", amount: "50.00" }),
    ], { from: "2026-06-01", to: "2026-06-30" });

    expect(report.summary.actual.incomeArs).toBe("150.000,00");
    expect(report.summary.actual.expenseArs).toBe("30.000,00");
    expect(report.summary.actual.resultArs).toBe("120.000,00");
    expect(report.summary.actual.incomeUsd).toBe("200.00");
    expect(report.summary.actual.resultUsd).toBe("150.00");
    expect(report.comparison.incomeArs).toBe("50.00");
    expect(report.summary.monthlyAverageActual.resultArs).toBe("120.000,00");
  });

  it("agrupa categorías, fuentes, deuda de tarjeta e ingresos recurrentes", () => {
    const report = buildReportsOverview([
      movement({ id: "food", occurredOn: "2026-07-02", type: "expense", currency: "ARS", amount: "25.000,00", category: { id: "food", name: "Alimentos" } }),
      movement({ id: "card", occurredOn: "2026-07-10", type: "expense", currency: "ARS", amount: "10.000,00", sourceType: "card_installment", trace: { sourceLabel: "Visa Galicia" } }),
      movement({ id: "salary", occurredOn: "2026-07-01", type: "income", currency: "ARS", amount: "200.000,00", sourceType: "income_recurring", sourceId: "salary-1", trace: { sourceLabel: "Sueldo" } }),
      movement({ id: "salary-next", occurredOn: "2026-08-01", type: "income", currency: "ARS", amount: "220.000,00", sourceType: "income_recurring", sourceId: "salary-1", status: "projected", trace: { sourceLabel: "Sueldo" } }),
    ], { from: "2026-07-01", to: "2026-08-31" });

    expect(report.categories.find((item) => item.name === "Alimentos")?.amountArs).toBe("25.000,00");
    expect(report.sources.find((item) => item.sourceType === "card_installment")?.amountArs).toBe("10.000,00");
    expect(report.cardDebt[0].actual.expenseArs).toBe("10.000,00");
    expect(report.recurringIncome[0].months[0].actualArs).toBe("200.000,00");
    expect(report.recurringIncome[0].months[1].projectedArs).toBe("220.000,00");
  });

  it("exporta CSV con secciones y valores calculados", () => {
    const report = buildReportsOverview([
      movement({ id: "expense", occurredOn: "2026-07-02", type: "expense", currency: "ARS", amount: "12.345,67" }),
    ], { from: "2026-07-01", to: "2026-07-31" });
    const csv = buildReportsCsv(report);
    expect(csv).toContain("Evolucion mensual");
    expect(csv).toContain("Categorias");
    expect(csv).toContain("12.345,67");
  });
});
