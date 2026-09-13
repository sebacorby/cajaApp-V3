import { describe, expect, it } from "vitest";
import {
  calculateFinancialHealth,
  FINANCIAL_HEALTH_FORMULA_VERSION,
  type FinancialHealthSources,
} from "../../src/modules/financial-health/financial-health.service.js";


function sources(overrides: Partial<FinancialHealthSources> = {}): FinancialHealthSources {
  const base = {
    dashboard: {
      summary: {
        actual: {
          incomeArs: "100.000,00",
          expenseArs: "70.000,00",
          balanceArs: "30.000,00",
          incomeUsd: "0.00",
          expenseUsd: "0.00",
          balanceUsd: "0.00",
          savingsRateArs: "30.00",
          savingsRateUsd: null,
          records: 10,
        },
        pending: { incomeArs: "0,00", expenseArs: "0,00", balanceArs: "0,00", incomeUsd: "0.00", expenseUsd: "0.00", balanceUsd: "0.00", savingsRateArs: null, savingsRateUsd: null, records: 0 },
        projected: { incomeArs: "0,00", expenseArs: "10.000,00", balanceArs: "-10.000,00", incomeUsd: "0.00", expenseUsd: "0.00", balanceUsd: "0.00", savingsRateArs: null, savingsRateUsd: null, records: 1 },
        expected: {
          incomeArs: "100.000,00",
          expenseArs: "80.000,00",
          balanceArs: "20.000,00",
          incomeUsd: "0.00",
          expenseUsd: "0.00",
          balanceUsd: "0.00",
          savingsRateArs: "20.00",
          savingsRateUsd: null,
          records: 11,
        },
      },
      comparison: {
        incomeArs: "0.00",
        expenseArs: "5.00",
        balanceArs: "0.00",
        incomeUsd: null,
        expenseUsd: null,
        balanceUsd: null,
        previousActual: {},
      },
      monthlyEvolution: [
        { monthKey: "2026-05", incomeArs: "90.000,00", expenseArs: "65.000,00", incomeUsd: "0.00", expenseUsd: "0.00" },
        { monthKey: "2026-06", incomeArs: "95.000,00", expenseArs: "68.000,00", incomeUsd: "0.00", expenseUsd: "0.00" },
        { monthKey: "2026-07", incomeArs: "100.000,00", expenseArs: "70.000,00", incomeUsd: "0.00", expenseUsd: "0.00" },
      ],
      dataQuality: {
        unclassifiedRecords: 1,
        actualRecords: 10,
        pendingRecords: 0,
        projectedRecords: 1,
        lastUpdatedAt: "2026-07-12T15:30:00.000Z",
      },
    },
    budgets: {
      participantCount: 1,
      activeCount: 1,
      attentionCount: 0,
      exceededCount: 0,
      currencies: {
        ARS: {
          budgetCount: 1,
          effectiveLimit: "100.000,00",
          spent: "70.000,00",
          available: "30.000,00",
          exceeded: "0,00",
          usageBasisPoints: 7_000,
          usagePercent: "70.00",
        },
        USD: {
          budgetCount: 0,
          effectiveLimit: "0.00",
          spent: "0.00",
          available: "0.00",
          exceeded: "0.00",
          usageBasisPoints: 0,
          usagePercent: "0.00",
        },
      },
    },
    goals: {
      statusCounts: { active: 1, paused: 0, completed: 0, closed: 0 },
      nearestActiveTargetDate: "2026-12-31",
      currencies: {
        ARS: { targetAmount: "500.000,00", contributedAmount: "100.000,00", remainingAmount: "400.000,00", progressPercent: "20.00" },
        USD: { targetAmount: "0.00", contributedAmount: "0.00", remainingAmount: "0.00", progressPercent: "0.00" },
      },
    },
    future: {
      summary: {
        expectedIncome: { ars: "120.000,00", usd: "0.00" },
        expectedCommitments: { ars: "80.000,00", usd: "0.00" },
      },
      dataQuality: { status: "complete", warnings: [] },
    },
  } as unknown as FinancialHealthSources;


  return {
    ...base,
    ...overrides,
  };
}


describe("calculateFinancialHealth", () => {
  it("conserva huella y resultado con los mismos datos aunque cambie la hora de evaluación", () => {
    const input = sources();
    const first = calculateFinancialHealth(
      input,
      { from: "2026-07-01", to: "2026-07-31" },
      "2026-07-13T00:00:00.000Z",
    );
    const second = calculateFinancialHealth(
      input,
      { from: "2026-07-01", to: "2026-07-31" },
      "2026-07-13T01:00:00.000Z",
    );


    expect(first.sourceFingerprint).toBe(second.sourceFingerprint);
    expect(first.currencies).toEqual(second.currencies);
    expect(first.formula.version).toBe(FINANCIAL_HEALTH_FORMULA_VERSION);
    expect(first.currencies.ARS.status).toBe("calculated");
    expect(first.currencies.ARS.score).toBe(96);
    expect(first.currencies.USD.status).toBe("insufficient_data");
  });


  it("no calcula cuando falta evidencia mínima", () => {
    const input = sources();
    input.dashboard.dataQuality.actualRecords = 1;
    input.dashboard.dataQuality.projectedRecords = 0;


    const result = calculateFinancialHealth(
      input,
      { from: "2026-07-01", to: "2026-07-31" },
      "2026-07-13T00:00:00.000Z",
    );


    expect(result.currencies.ARS.status).toBe("insufficient_data");
    expect(result.currencies.ARS.score).toBeNull();
    expect(result.currencies.ARS.blockers).toContain(
      "Se requieren al menos 3 registros financieros en el período.",
    );
  });


  it("penaliza de forma reproducible saldo negativo, baja cobertura y presupuesto excedido", () => {
    const input = sources();
    input.dashboard.summary.actual = {
      ...input.dashboard.summary.actual,
      incomeArs: "100.000,00",
      expenseArs: "120.000,00",
      balanceArs: "-20.000,00",
      savingsRateArs: "-20.00",
    };
    input.dashboard.summary.expected = {
      ...input.dashboard.summary.expected,
      incomeArs: "100.000,00",
      expenseArs: "130.000,00",
      balanceArs: "-30.000,00",
    };
    input.dashboard.comparison.expenseArs = "50.00";
    input.future.summary.expectedIncome.ars = "50.000,00";
    input.future.summary.expectedCommitments.ars = "100.000,00";
    input.budgets.currencies.ARS.usageBasisPoints = 13_000;
    input.budgets.currencies.ARS.usagePercent = "130.00";


    const result = calculateFinancialHealth(
      input,
      { from: "2026-07-01", to: "2026-07-31" },
      "2026-07-13T00:00:00.000Z",
    );


    expect(result.currencies.ARS.status).toBe("calculated");
    expect(result.currencies.ARS.score).toBeLessThan(30);
    expect(result.currencies.ARS.factors.find((factor) => factor.id === "actual_balance")?.points).toBe(0);
    expect(result.currencies.ARS.factors.find((factor) => factor.id === "budget_control")?.points).toBe(0);
  });
});