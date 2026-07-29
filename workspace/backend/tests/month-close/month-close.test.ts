import { describe, expect, it } from "vitest";
import {
  buildMonthCloseFingerprint,
  buildMonthCloseSummary,
  monthRange,
  type MonthCloseSnapshot,
} from "../../src/modules/month-close/month-close.service.js";

const movement = (overrides: Record<string, unknown> = {}) => ({
  id: "manual:1",
  occurredOn: "2026-06-10",
  effectiveMonthKey: "2026-06",
  type: "expense",
  sourceType: "manual_cash",
  sourceId: "1",
  description: "Compra",
  category: { id: null, name: "Sin clasificar" },
  currency: "ARS",
  amount: "1.234,56",
  status: "actual",
  notes: null,
  editable: true,
  categoryEditable: true,
  createdAt: null,
  updatedAt: null,
  trace: { sourceLabel: "Carga manual" },
  ...overrides,
}) as any;

describe("month close helpers", () => {
  it("calculates calendar month boundaries", () => {
    expect(monthRange("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });

  it("keeps ARS/USD and actual/pending/projected totals separated as integer cents", () => {
    const summary = buildMonthCloseSummary("2026-06", [
      movement(),
      movement({ id: "2", type: "income", currency: "USD", amount: "20.50", status: "pending" }),
      movement({ id: "3", type: "income", amount: "200,00", status: "projected" }),
    ]);
    expect(summary.expense.actual.ARS).toBe("123456");
    expect(summary.income.pending.USD).toBe("2050");
    expect(summary.income.projected.ARS).toBe("20000");
    expect(summary.balance.all.ARS).toBe("-103456");
  });

  it("produces a stable fingerprint that ignores generatedAt", () => {
    const base: MonthCloseSnapshot = {
      version: "month-close-v1",
      monthKey: "2026-06",
      range: monthRange("2026-06"),
      generatedAt: "2026-07-17T00:00:00.000Z",
      summary: buildMonthCloseSummary("2026-06", []),
      movements: [],
      settings: { theme: "dark", displayName: "Javi" },
      goals: [],
      budgets: [],
      cardStatements: [],
      salaryReceipts: [],
    };
    expect(buildMonthCloseFingerprint(base)).toBe(
      buildMonthCloseFingerprint({ ...base, generatedAt: "2030-01-01T00:00:00.000Z" }),
    );
    expect(buildMonthCloseFingerprint(base)).toMatch(/^[a-f0-9]{64}$/);
  });
});
