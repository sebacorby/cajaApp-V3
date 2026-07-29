import { describe, expect, it } from "vitest";
import {
  AI_ADVISOR_RESPONSE_VERSION,
  calculateAdvisorSimulation,
  validateAiAdvisorOutput,
  type AiAdvisorContext,
} from "../../src/modules/ai-advisor/ai-advisor.service.js";


function context(): AiAdvisorContext {
  return {
    schemaVersion: "advisor-context-v1.0.0",
    period: { from: "2026-07-01", to: "2026-07-31" },
    financialHealthFormulaVersion: "fh-v1.0.0",
    sourceFingerprint: "fingerprint",
    sourceCount: 2,
    summary: {
      currencies: {
        ARS: { financialHealthStatus: "calculated", score: 80, bandLabel: "Resultado favorable", confidence: "high", actualBalance: "20.000,00", expectedBalance: "15.000,00", futureExpectedResult: "10.000,00", budgetUsagePercent: "70.00", activeGoals: 1 },
        USD: { financialHealthStatus: "insufficient_data", score: null, bandLabel: "No calculado", confidence: "insufficient", actualBalance: "0.00", expectedBalance: "0.00", futureExpectedResult: "0.00", budgetUsagePercent: "0.00", activeGoals: 0 },
      },
      alerts: 1,
      criticalAlerts: 0,
      unclassifiedRecords: 0,
      latestDataAt: "2026-07-14T10:00:00.000Z",
    },
    sources: [
      { id: "health.ARS.score", kind: "financial_health", label: "Salud ARS", description: "", period: { from: "2026-07-01", to: "2026-07-31" }, currency: "ARS", value: "80/100 · Resultado favorable", rule: "fh-v1.0.0", action: { section: "salud", label: "Abrir" } },
      { id: "dashboard.ARS.expected", kind: "dashboard", label: "Balance esperado", description: "", period: { from: "2026-07-01", to: "2026-07-31" }, currency: "ARS", value: "Balance ARS 15.000,00", rule: "backend", action: { section: "movimientos", label: "Abrir" } },
    ],
    suggestedQuestions: [],
  };
}


const validOutput = {
  schemaVersion: AI_ADVISOR_RESPONSE_VERSION,
  title: "Lectura del período",
  answer: "El resultado disponible es favorable.",
  confidence: "high",
  claims: [{ id: "c1", text: "El puntaje ARS es 80/100.", kind: "fact", sourceIds: ["health.ARS.score"] }],
  risks: [],
  alternatives: [],
  limitations: [],
  followUpQuestions: [],
};


describe("AI advisor guardrails", () => {
  it("calcula una simulación aislada sin modificar el balance fuente", () => {
    const result = calculateAdvisorSimulation({
      label: "Reducir egresos",
      currency: "ARS",
      incomeDelta: "0",
      expenseDelta: "-5.000,00",
      commitmentDelta: "0",
      assumptions: ["El resto se mantiene constante"],
    }, {
      summary: { expected: { balanceArs: "15.000,00", balanceUsd: "0.00" } },
    } as never);
    expect(result.baselineExpectedBalance).toBe("15.000,00");
    expect(result.simulatedExpectedBalance).toBe("20.000,00");
  });


  it("acepta afirmaciones con fuente existente y limita confianza al contexto", () => {
    const answer = validateAiAdvisorOutput(validOutput, context(), "analysis", "ARS");
    expect(answer.confidence).toBe("high");
    expect(answer.citations.map((item) => item.id)).toEqual(["health.ARS.score"]);
  });


  it("rechaza fuentes inventadas", () => {
    expect(() => validateAiAdvisorOutput({
      ...validOutput,
      claims: [{ ...validOutput.claims[0], sourceIds: ["unknown.source"] }],
    }, context(), "analysis", "ARS")).toThrow(/fuente inexistente/i);
  });


  it("acepta días citados desde períodos ISO sin tratarlos como números financieros inventados", () => {
    const datedContext = context();
    datedContext.period = { from: "2026-06-14", to: "2026-08-14" };
    datedContext.sources = datedContext.sources.map((item) => ({
      ...item,
      period: { from: "2026-06-14", to: "2026-08-14" },
    }));

    expect(() => validateAiAdvisorOutput({
      ...validOutput,
      answer: "El período analizado incluye el día 14.",
    }, datedContext, "analysis", "ARS")).not.toThrow();
  });


  it("rechaza números que no aparecen en el contexto", () => {
    expect(() => validateAiAdvisorOutput({
      ...validOutput,
      claims: [{ ...validOutput.claims[0], text: "El puntaje ARS es 99/100." }],
    }, context(), "analysis", "ARS")).toThrow(/valores no presentes/i);
  });


  it("rechaza una simulación no solicitada", () => {
    expect(() => validateAiAdvisorOutput({
      ...validOutput,
      claims: [{ ...validOutput.claims[0], kind: "simulation" }],
    }, context(), "analysis", "ARS")).toThrow(/simulación que no fue solicitada/i);
  });


  it("rechaza lenguaje prescriptivo", () => {
    expect(() => validateAiAdvisorOutput({
      ...validOutput,
      answer: "Debes invertir ahora.",
    }, context(), "analysis", "ARS")).toThrow(/lenguaje prescriptivo/i);
  });
});