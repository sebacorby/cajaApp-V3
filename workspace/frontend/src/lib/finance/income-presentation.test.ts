import { describe, expect, it } from "vitest";
import { buildIncomeDashboardPresentation } from "./income-presentation";
import type { IncomeOverview } from "./incomes-api";

const overview: IncomeOverview = {
  range: { from: "2026-02", to: "2026-09" },
  currentMonthKey: "2026-07",
  summary: {
    totalArs: "0.00",
    totalUsd: "0.00",
    recurringArs: "0.00",
    recurringUsd: "0.00",
    oneOffArs: "0.00",
    oneOffUsd: "0.00",
    recurringSources: 2,
    oneOffCount: 0,
  },
  sources: [
    {
      id: "fluxit",
      name: "Sueldo FLUXIT",
      employer: "FLUXIT",
      kind: "salary",
      currency: "ARS",
      baseAmount: "0.00",
      startMonthKey: "2026-02",
      paymentDay: null,
      increaseEveryMonths: 3,
      increasePercent: "0",
      active: true,
      events: [
        {
          id: "f-real",
          sourceId: "fluxit",
          monthKey: "2026-02",
          kind: "monthly_override",
          currency: "ARS",
          amount: "4472530.00",
          label: "Valor real del mes",
          status: "actual",
          notes: null,
        },
      ],
    },
    {
      id: "ntt",
      name: "Sueldo NTT DATA",
      employer: "NTT DATA",
      kind: "salary",
      currency: "ARS",
      baseAmount: "0.00",
      startMonthKey: "2026-06",
      paymentDay: null,
      increaseEveryMonths: 3,
      increasePercent: "0",
      active: true,
      events: [
        {
          id: "n-real",
          sourceId: "ntt",
          monthKey: "2026-06",
          kind: "monthly_override",
          currency: "ARS",
          amount: "5866997.00",
          label: "Valor real del mes",
          status: "actual",
          notes: null,
        },
      ],
    },
  ],
  months: [
    {
      monthKey: "2026-06",
      label: "Junio de 2026",
      totalArs: "5866997.00",
      totalUsd: "0.00",
      recurringArs: "5866997.00",
      recurringUsd: "0.00",
      oneOffArs: "0.00",
      oneOffUsd: "0.00",
      recurring: [
        {
          sourceId: "ntt",
          name: "Sueldo NTT DATA",
          employer: "NTT DATA",
          kind: "salary",
          currency: "ARS",
          amount: "5866997.00",
          status: "actual",
          origin: "monthly_override",
          eventId: "n-real",
        },
      ],
      oneOffs: [],
    },
    {
      monthKey: "2026-07",
      label: "Julio de 2026",
      totalArs: "0.00",
      totalUsd: "0.00",
      recurringArs: "0.00",
      recurringUsd: "0.00",
      oneOffArs: "0.00",
      oneOffUsd: "0.00",
      recurring: [],
      oneOffs: [],
    },
  ],
};

describe("income presentation", () => {
  it("prioritizes last real net pay and removes empty months", () => {
    const result = buildIncomeDashboardPresentation(overview);
    expect(result.activeSources).toBe(2);
    expect(result.sources[0].lastRealAmount).toBe("5866997.00");
    expect(result.sources[1].lastRealAmount).toBe("4472530.00");
    expect(result.months.map((month) => month.monthKey)).toEqual(["2026-06"]);
  });
});
