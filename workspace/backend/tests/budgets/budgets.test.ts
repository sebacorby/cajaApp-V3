import { describe, expect, it } from "vitest";
import { createBudgetSchema } from "../../src/modules/budgets/budgets.schemas.js";
import {
  buildBudgetOverview,
  calculateBudgetUsage,
  type BudgetOverviewItem,
} from "../../src/modules/budgets/budgets.service.js";


describe("budgets deterministic contract", () => {
  it("calculates warning and exceeded thresholds in basis points", () => {
    expect(calculateBudgetUsage(8000n, 10000n)).toEqual({
      basisPoints: 8000,
      percent: "80.00",
    });
    expect(calculateBudgetUsage(10000n, 10000n)).toEqual({
      basisPoints: 10000,
      percent: "100.00",
    });
  });


  it("rejects reversed periods", () => {
    expect(() => createBudgetSchema.parse({
      categoryId: "8b6dbe3c-c388-45a1-a4e0-7e78c973603a",
      currency: "ARS",
      periodStart: "2026-08",
      periodEnd: "2026-07",
      limitAmount: "1000",
    })).toThrow();
  });


  it("keeps rollover explicit and disabled by default", () => {
    const parsed = createBudgetSchema.parse({
      categoryId: "8b6dbe3c-c388-45a1-a4e0-7e78c973603a",
      currency: "ARS",
      periodStart: "2026-07",
      periodEnd: "2026-07",
      limitAmount: "1000",
    });
    expect(parsed.rolloverEnabled).toBe(false);
  });


  it("agrega presupuestos sin mezclar monedas y conserva alertas activas", () => {
    const budgets: BudgetOverviewItem[] = [
      {
        currency: "ARS",
        effectiveLimit: "1.000,00",
        spentAmount: "800,00",
        status: "active",
        usageBasisPoints: 8_000,
      },
      {
        currency: "ARS",
        effectiveLimit: "500,00",
        spentAmount: "700,00",
        status: "active",
        usageBasisPoints: 14_000,
      },
      {
        currency: "USD",
        effectiveLimit: "100.00",
        spentAmount: "20.00",
        status: "paused",
        usageBasisPoints: 2_000,
      },
    ];


    const overview = buildBudgetOverview(budgets, {
      from: "2026-07",
      to: "2026-07",
    });


    expect(overview.participantCount).toBe(3);
    expect(overview.activeCount).toBe(2);
    expect(overview.attentionCount).toBe(1);
    expect(overview.exceededCount).toBe(1);
    expect(overview.currencies.ARS).toMatchObject({
      budgetCount: 2,
      effectiveLimit: "1.500,00",
      spent: "1.500,00",
      available: "0,00",
      exceeded: "0,00",
      usagePercent: "100.00",
    });
    expect(overview.currencies.USD).toMatchObject({
      budgetCount: 1,
      effectiveLimit: "100.00",
      spent: "20.00",
      available: "80.00",
      exceeded: "0.00",
      usagePercent: "20.00",
    });
  });


  it("expone un resumen vacío sin división por cero", () => {
    const overview = buildBudgetOverview([], {
      from: "2026-07",
      to: "2026-07",
      status: "active",
    });


    expect(overview.participantCount).toBe(0);
    expect(overview.currencies.ARS.usageBasisPoints).toBe(0);
    expect(overview.currencies.ARS.usagePercent).toBe("0.00");
    expect(overview.currencies.USD.usageBasisPoints).toBe(0);
    expect(overview.currencies.USD.usagePercent).toBe("0.00");
  });
});