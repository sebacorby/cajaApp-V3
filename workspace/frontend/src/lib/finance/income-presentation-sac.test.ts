import { describe, expect, it } from "vitest";
import { buildIncomeDashboardPresentation } from "./income-presentation";
import type { IncomeOverview } from "./incomes-api";

describe("SAC income presentation", () => {
  it("shows SAC as a separate projected extra and includes it in the month total", () => {
    const overview = {
      range: { from: "2026-06", to: "2026-06" },
      currentMonthKey: "2026-05",
      summary: {
        totalArs: "0,00",
        totalUsd: "0.00",
        recurringArs: "0,00",
        recurringUsd: "0.00",
        oneOffArs: "0,00",
        oneOffUsd: "0.00",
        recurringSources: 0,
        oneOffCount: 0,
      },
      sources: [
        {
          id: "salary",
          name: "Sueldo",
          employer: "Empresa",
          kind: "salary",
          currency: "ARS",
          baseAmount: "4.000.000,00",
          startMonthKey: "2026-01",
          paymentDay: null,
          increaseEveryMonths: 3,
          increasePercent: "0",
          active: true,
          events: [],
        },
      ],
      months: [
        {
          monthKey: "2026-06",
          label: "junio de 2026",
          totalArs: "6.000.000,00",
          totalUsd: "0.00",
          recurringArs: "4.000.000,00",
          recurringUsd: "0.00",
          oneOffArs: "2.000.000,00",
          oneOffUsd: "0.00",
          recurring: [
            {
              sourceId: "salary",
              name: "Sueldo",
              employer: "Empresa",
              kind: "salary",
              currency: "ARS",
              amount: "4.000.000,00",
              status: "projected",
              origin: "base",
              eventId: null,
            },
          ],
          oneOffs: [
            {
              id: "sac-estimate:salary:2026-06",
              kind: "aguinaldo",
              label: "SAC estimado",
              currency: "ARS",
              amount: "2.000.000,00",
              status: "projected",
              notes: "Estimación financiera",
            },
          ],
        },
      ],
    } as IncomeOverview;

    const result = buildIncomeDashboardPresentation(overview);
    expect(result.months[0]).toMatchObject({
      totalArs: "6.000.000,00",
      estimatedArs: "6000000.00",
      sourceCount: 2,
    });
    expect(result.months[0].extras).toEqual([
      expect.objectContaining({
        label: "SAC estimado",
        amount: "2.000.000,00",
        status: "projected",
      }),
    ]);
  });
});
