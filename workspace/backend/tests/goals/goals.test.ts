import { describe, expect, it } from "vitest";
import { createGoalContributionSchema, createGoalSchema } from "../../src/modules/goals/goals.schemas.js";
import {
  buildGoalsOverview,
  calculateGoalProgress,
  formatGoalCents,
  parseGoalAmount,
  type GoalOverviewItem,
} from "../../src/modules/goals/goals.service.js";


describe("goals monetary contract", () => {
  it("parses ARS and USD without mixing currencies", () => {
    expect(parseGoalAmount("1.234,56", "ARS")).toBe(123456n);
    expect(parseGoalAmount("1,234.56", "USD")).toBe(123456n);
    expect(() => parseGoalAmount("0", "ARS")).toThrow();
  });


  it("formats and calculates progress deterministically", () => {
    expect(formatGoalCents(123456n, "ARS")).toBe("1.234,56");
    expect(formatGoalCents(123456n, "USD")).toBe("1,234.56");
    expect(calculateGoalProgress(2500n, 10000n)).toEqual({ basisPoints: 2500, percent: "25.00" });
  });


  it("validates goal and contribution traceability", () => {
    expect(createGoalSchema.parse({ name: "Fondo de emergencia", targetAmount: "500000", currency: "ARS" }).status).toBe("active");
    expect(() => createGoalSchema.parse({ name: "Fecha imposible", targetAmount: "1000", currency: "ARS", targetDate: "2026-02-31" })).toThrow();
    expect(() => createGoalContributionSchema.parse({ contributedOn: "2026-07-12", amount: "1000", referenceType: "manual" })).toThrow();
    expect(createGoalContributionSchema.parse({ contributedOn: "2026-07-12", amount: "1000", referenceType: "manual", referenceId: "mov-1" }).referenceId).toBe("mov-1");
  });


  it("agrega objetivos por moneda y conserva reglas explícitas de estado", () => {
    const goals: GoalOverviewItem[] = [
      {
        id: "ars-active-later",
        name: "Viaje",
        targetAmount: "1.000.000,00",
        contributedAmount: "250.000,00",
        remainingAmount: "750.000,00",
        progressBasisPoints: 2_500,
        progressPercent: "25.00",
        currency: "ARS",
        targetDate: "2027-12-31",
        status: "active",
      },
      {
        id: "ars-active-near",
        name: "Fondo de emergencia",
        targetAmount: "500.000,00",
        contributedAmount: "100.000,00",
        remainingAmount: "400.000,00",
        progressBasisPoints: 2_000,
        progressPercent: "20.00",
        currency: "ARS",
        targetDate: "2027-01-31",
        status: "active",
      },
      {
        id: "usd-completed",
        name: "Notebook",
        targetAmount: "2,000.00",
        contributedAmount: "2,000.00",
        remainingAmount: "0.00",
        progressBasisPoints: 10_000,
        progressPercent: "100.00",
        currency: "USD",
        targetDate: "2026-12-31",
        status: "completed",
      },
      {
        id: "usd-closed",
        name: "Meta cerrada",
        targetAmount: "1,000.00",
        contributedAmount: "400.00",
        remainingAmount: "600.00",
        progressBasisPoints: 4_000,
        progressPercent: "40.00",
        currency: "USD",
        targetDate: null,
        status: "closed",
      },
    ];


    const overview = buildGoalsOverview(goals, goals, { limit: 4 });


    expect(overview.participantCount).toBe(4);
    expect(overview.statusCounts).toEqual({
      active: 2,
      paused: 0,
      completed: 1,
      closed: 1,
    });
    expect(overview.nearestActiveTargetDate).toBe("2027-01-31");
    expect(overview.currencies.ARS).toMatchObject({
      goalCount: 2,
      targetAmount: "1.500.000,00",
      contributedAmount: "350.000,00",
      remainingAmount: "1.150.000,00",
      progressPercent: "23.33",
    });
    expect(overview.currencies.USD).toMatchObject({
      goalCount: 2,
      targetAmount: "3,000.00",
      contributedAmount: "2,400.00",
      remainingAmount: "600.00",
      progressPercent: "80.00",
    });
    expect(overview.featuredGoals.map((goal) => goal.id)).toEqual([
      "ars-active-near",
      "ars-active-later",
    ]);
  });


  it("permite un resumen vacío sin inventar progreso", () => {
    const overview = buildGoalsOverview([], [], {
      status: "active",
      limit: 4,
    });


    expect(overview.participantCount).toBe(0);
    expect(overview.nearestActiveTargetDate).toBeNull();
    expect(overview.featuredGoals).toEqual([]);
    expect(overview.currencies.ARS.progressPercent).toBe("0.00");
    expect(overview.currencies.USD.progressPercent).toBe("0.00");
  });


});