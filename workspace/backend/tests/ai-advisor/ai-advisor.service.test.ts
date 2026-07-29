import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AI_ADVISOR_PROVIDER_REQUEST_VERSION,
  AI_ADVISOR_PROMPT_VERSION,
  AI_ADVISOR_RESPONSE_VERSION,
  AiAdvisorService,
  addSimulationSource,
  buildAiAdvisorContext,
  buildProviderPayload,
  calculateAdvisorSimulation,
  getValidationIssues,
  isRecoverableAdvisorError,
  normalizeAdvisorPeriod,
  validateAiAdvisorOutput,
  type AiAdvisorContext,
} from "../../src/modules/ai-advisor/ai-advisor.service.js";
import { AppError } from "../../src/shared/errors.js";
import type {
  TextExtractionProvider,
  TextExtractionResult,
} from "../../src/modules/ai/text-extraction-provider.js";



const advisorMocks = vi.hoisted(() => {
  const noopMutation = () => {
    throw new Error("No se debe invocar mutación de registros financieros en el Asesor IA.");
  };
  return {
    prismaAiCreate: vi.fn(),
    movementMutation: vi.fn(noopMutation),
    budgetMutation: vi.fn(noopMutation),
    goalMutation: vi.fn(noopMutation),
    dashboardGetOverview: vi.fn(),
    budgetsOverview: vi.fn(),
    goalsOverview: vi.fn(),
    futureGetOverview: vi.fn(),
    financialHealthEvaluate: vi.fn(),
  };
});



vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    aiAdvisorInteraction: { create: advisorMocks.prismaAiCreate },
    movement: {
      create: advisorMocks.movementMutation,
      update: advisorMocks.movementMutation,
      delete: advisorMocks.movementMutation,
    },
    budget: {
      create: advisorMocks.budgetMutation,
      update: advisorMocks.budgetMutation,
      delete: advisorMocks.budgetMutation,
    },
    goal: {
      create: advisorMocks.goalMutation,
      update: advisorMocks.goalMutation,
      delete: advisorMocks.goalMutation,
    },
  },
}));



vi.mock("../../src/modules/dashboard/dashboard.service.js", () => ({
  dashboardService: { getOverview: advisorMocks.dashboardGetOverview },
}));



vi.mock("../../src/modules/budgets/budgets.service.js", () => ({
  budgetsService: { overview: advisorMocks.budgetsOverview },
}));



vi.mock("../../src/modules/goals/goals.service.js", () => ({
  goalsService: { overview: advisorMocks.goalsOverview },
}));



vi.mock("../../src/modules/future/future.service.js", () => ({
  futureService: { getOverview: advisorMocks.futureGetOverview },
}));



vi.mock("../../src/modules/financial-health/financial-health.service.js", () => ({
  financialHealthService: { evaluate: advisorMocks.financialHealthEvaluate },
  FINANCIAL_HEALTH_FORMULA_VERSION: "fh-v1.0.0",
}));




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




  it("rechaza números que no aparecen en el contexto", () => {
    expect(() => validateAiAdvisorOutput({
      ...validOutput,
      claims: [{ ...validOutput.claims[0], text: "El puntaje ARS es 99/100." }],
    }, context(), "analysis", "ARS")).toThrow(/valores no presentes/i);
  });




  it("acepta días citados desde fechas ISO sin tratarlos como números negativos", () => {
    const datedContext = context();
    datedContext.period.to = "2026-07-14";
    datedContext.sources = datedContext.sources.map((item) => ({
      ...item,
      period: { ...item.period, to: "2026-07-14" },
    }));


    expect(() => validateAiAdvisorOutput({
      ...validOutput,
      answer: "Los datos citados están actualizados al día 14 del período.",
    }, datedContext, "analysis", "ARS")).not.toThrow();
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



function mockCollectedDashboard() {
  return {
    summary: {
      actual: {
        incomeArs: "100,00",
        incomeUsd: "0.00",
        expenseArs: "50,00",
        expenseUsd: "0.00",
        balanceArs: "50,00",
        balanceUsd: "0.00",
        savingsRateArs: "50.00",
        savingsRateUsd: null,
      },
      expected: {
        incomeArs: "100,00",
        incomeUsd: "0.00",
        expenseArs: "50,00",
        expenseUsd: "0.00",
        balanceArs: "50,00",
        balanceUsd: "0.00",
      },
    },
    monthlyEvolution: [],
    categories: [],
    alerts: [],
    dataQuality: {
      unclassifiedRecords: 0,
      actualRecords: 1,
      pendingRecords: 0,
      projectedRecords: 0,
      lastUpdatedAt: "2026-07-14T10:00:00.000Z",
    },
  };
}



function mockCollectedBudgets() {
  const ars = {
    budgetCount: 1,
    effectiveLimit: "100,00",
    spent: "50,00",
    usagePercent: "50.00",
  };
  const usd = { ...ars, budgetCount: 0, effectiveLimit: "0.00", spent: "0.00", usagePercent: "0.00" };
  return {
    currencies: { ARS: ars, USD: usd },
    attentionCount: 0,
    exceededCount: 0,
  };
}



function mockCollectedGoals() {
  const ars = {
    goalCount: 1,
    targetAmount: "200,00",
    contributedAmount: "100,00",
    remainingAmount: "100,00",
    progressPercent: "50.00",
  };
  const usd = { ...ars, goalCount: 0, targetAmount: "0.00", contributedAmount: "0.00", remainingAmount: "0.00", progressPercent: "0.00" };
  return { currencies: { ARS: ars, USD: usd } };
}



function mockCollectedFuture() {
  const ars = {
    expectedIncome: { ars: "100,00", usd: "0.00" },
    expectedCommitments: { ars: "30,00", usd: "0.00" },
    expectedResult: { ars: "70,00", usd: "0.00" },
  };
  return {
    summary: ars,
    range: { months: 3 },
    dataQuality: { status: "ok" },
  };
}



function mockCollectedFinancialHealth() {
  const currencyResult = {
    status: "calculated",
    score: 80,
    bandLabel: "Resultado favorable",
    confidence: { label: "high", labelText: "alta" },
    availableWeight: 100,
    blockers: [],
    factors: [],
  };
  const usdResult = { ...currencyResult, status: "insufficient_data", score: null, bandLabel: "No calculado", confidence: { label: "insufficient", labelText: "insuficiente" } };
  return {
    evaluation: {
      formula: { version: "fh-v1.0.0" },
      currencies: { ARS: currencyResult, USD: usdResult },
    },
  };
}



function setupCollectedMocks(): void {
  advisorMocks.dashboardGetOverview.mockResolvedValue(mockCollectedDashboard());
  advisorMocks.budgetsOverview.mockResolvedValue(mockCollectedBudgets());
  advisorMocks.goalsOverview.mockResolvedValue(mockCollectedGoals());
  advisorMocks.futureGetOverview.mockResolvedValue(mockCollectedFuture());
  advisorMocks.financialHealthEvaluate.mockResolvedValue(mockCollectedFinancialHealth());
  advisorMocks.prismaAiCreate.mockResolvedValue({});
}



function makeValidAnswerOutput() {
  return {
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
}



function makeProvider(result: Partial<TextExtractionResult>): TextExtractionProvider {
  return {
    extractJson: vi.fn().mockResolvedValue({
      provider: "ollama",
      model: "test-model",
      requestId: result.requestId ?? "req-test-1",
      rawJson: result.rawJson,
      durationMs: result.durationMs ?? 12,
      promptSha256: result.promptSha256 ?? "a".repeat(64),
      documentSha256: result.documentSha256 ?? "b".repeat(64),
    } satisfies TextExtractionResult),
  };
}



describe("Asesor IA v1.0.9 — contrato y recuperación", () => {
  beforeEach(() => {
    setupCollectedMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    setupCollectedMocks();
  });

  it("rechaza summary.currencies.ARS como fuente inexistente", () => {
    expect(() => validateAiAdvisorOutput({
      ...makeValidAnswerOutput(),
      claims: [{
        ...makeValidAnswerOutput().claims[0],
        sourceIds: ["summary.currencies.ARS"],
      }],
    }, context(), "analysis", "ARS")).toThrow(/fuente inexistente/i);
  });

  it("buildProviderPayload enumera todos y solo los IDs válidos", () => {
    const ctx = context();
    const payload = buildProviderPayload(ctx, {
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "analysis",
      question: "¿Cómo cerró el período?",
      currency: "ARS",
    }, { deterministicSimulation: null });
    expect(payload.allowedSourceIds).toEqual(ctx.sources.map((item) => item.id));
    expect(payload.citationCatalog).toHaveLength(ctx.sources.length);
    expect(new Set(payload.citationCatalog.map((item) => item.id))).toEqual(new Set(payload.allowedSourceIds));
    for (const entry of payload.citationCatalog) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("kind");
      expect(entry).toHaveProperty("label");
      expect(entry).toHaveProperty("description");
      expect(entry).toHaveProperty("currency");
      expect(entry).toHaveProperty("value");
      expect(entry).toHaveProperty("rule");
      expect(entry).toHaveProperty("period");
    }
  });

  it("buildProviderPayload no expone summary como fuente citable", () => {
    const ctx = context();
    const payload = buildProviderPayload(ctx, {
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "analysis",
      question: "¿Cómo cerró el período?",
      currency: "ARS",
    }, { deterministicSimulation: null });
    expect(payload).not.toHaveProperty("summary");
    expect(payload).not.toHaveProperty("structuredContext");
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/"summary"/);
    expect(serialized).not.toMatch(/summary\.currencies/);
  });

  it("isRecoverableAdvisorError clasifica los errores recuperables", () => {
    expect(isRecoverableAdvisorError("AI_ADVISOR_OUTPUT_SCHEMA_INVALID")).toBe(true);
    expect(isRecoverableAdvisorError("AI_ADVISOR_UNKNOWN_SOURCE")).toBe(true);
    expect(isRecoverableAdvisorError("AI_ADVISOR_UNGROUNDED_NUMBER")).toBe(true);
    expect(isRecoverableAdvisorError("AI_ADVISOR_UNSAFE_LANGUAGE")).toBe(false);
    expect(isRecoverableAdvisorError("AI_ADVISOR_UNREQUESTED_SIMULATION")).toBe(false);
    expect(isRecoverableAdvisorError(undefined)).toBe(false);
  });

  it("ask dispara exactamente un intento de reparación cuando la primera respuesta cita una fuente inexistente", async () => {
    const good = makeValidAnswerOutput();
    const bad = {
      ...good,
      claims: [{ ...good.claims[0], sourceIds: ["summary.currencies.ARS"] }],
    };
    const provider = {
      extractJson: vi.fn()
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-bad",
          rawJson: bad,
          durationMs: 10,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult)
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-good",
          rawJson: good,
          durationMs: 14,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult),
    } as unknown as TextExtractionProvider;
    const service = new AiAdvisorService(provider);
    const response = await service.ask({
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "analysis",
      currency: "ARS",
      question: "¿Cómo cerró el período?",
    });
    expect(provider.extractJson).toHaveBeenCalledTimes(2);
    expect(response.provider.attempts).toHaveLength(2);
    expect(response.provider.attempts[0]).toMatchObject({ attempt: 1, outcome: "rejected", rejection: { code: "AI_ADVISOR_UNKNOWN_SOURCE" } });
    expect(response.provider.attempts[1]).toMatchObject({ attempt: 2, outcome: "accepted" });
    expect(response.answer.citations.map((item) => item.id)).toContain("health.ARS.score");
    expect(response.provider.requestId).toBe("req-good");
    expect(advisorMocks.movementMutation).not.toHaveBeenCalled();
    expect(advisorMocks.budgetMutation).not.toHaveBeenCalled();
    expect(advisorMocks.goalMutation).not.toHaveBeenCalled();
  });

  it("ask finaliza en 422 sin tercer intento cuando la reparación también falla", async () => {
    const good = makeValidAnswerOutput();
    const bad = {
      ...good,
      claims: [{ ...good.claims[0], sourceIds: ["summary.currencies.ARS"] }],
    };
    const provider = {
      extractJson: vi.fn()
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-bad-1",
          rawJson: bad,
          durationMs: 10,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult)
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-bad-2",
          rawJson: bad,
          durationMs: 11,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult),
    } as unknown as TextExtractionProvider;
    const service = new AiAdvisorService(provider);
    let caught: unknown;
    try {
      await service.ask({
        from: "2026-07-01",
        to: "2026-07-31",
        mode: "analysis",
        currency: "ARS",
        question: "¿Cómo cerró el período?",
      });
      throw new Error("Debió lanzar AppError");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe("AI_ADVISOR_UNKNOWN_SOURCE");
    expect((caught as AppError).statusCode).toBe(422);
    expect(provider.extractJson).toHaveBeenCalledTimes(2);
    expect(advisorMocks.movementMutation).not.toHaveBeenCalled();
    expect(advisorMocks.budgetMutation).not.toHaveBeenCalled();
    expect(advisorMocks.goalMutation).not.toHaveBeenCalled();
  });

  it("ask no repara cuando el primer fallo no es recuperable", async () => {
    const good = makeValidAnswerOutput();
    const unsafe = {
      ...good,
      answer: "Debes invertir ahora.",
    };
    const provider = {
      extractJson: vi.fn().mockResolvedValue({
        provider: "ollama",
        model: "test-model",
        requestId: "req-unsafe",
        rawJson: unsafe,
        durationMs: 9,
        promptSha256: "a".repeat(64),
        documentSha256: "b".repeat(64),
      } satisfies TextExtractionResult),
    } as unknown as TextExtractionProvider;
    const service = new AiAdvisorService(provider);
    try {
      await service.ask({
        from: "2026-07-01",
        to: "2026-07-31",
        mode: "analysis",
        currency: "ARS",
        question: "¿Cómo cerró el período?",
      });
      throw new Error("Debió lanzar AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("AI_ADVISOR_UNSAFE_LANGUAGE");
    }
    expect(provider.extractJson).toHaveBeenCalledTimes(1);
  });

  it("ask persiste petición inicial y reparación sin secretos", async () => {
    const good = makeValidAnswerOutput();
    const bad = {
      ...good,
      claims: [{ ...good.claims[0], sourceIds: ["summary.currencies.ARS"] }],
    };
    const provider = {
      extractJson: vi.fn()
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-init",
          rawJson: bad,
          durationMs: 10,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult)
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-repair",
          rawJson: good,
          durationMs: 13,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult),
    } as unknown as TextExtractionProvider;
    const service = new AiAdvisorService(provider);
    await service.ask({
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "analysis",
      currency: "ARS",
      question: "¿Cómo cerró el período?",
    });
    expect(advisorMocks.prismaAiCreate).toHaveBeenCalledTimes(1);
    const persisted = advisorMocks.prismaAiCreate.mock.calls[0][0].data;
    expect(persisted.providerRequestId).toBe("req-repair");
    expect(persisted.durationMs).toBe(23);
    const requestPayload = JSON.parse(persisted.requestJson);
    expect(requestPayload.attempts).toEqual([
      { attempt: 1, requestId: "req-init", outcome: "rejected", rejection: { code: "AI_ADVISOR_UNKNOWN_SOURCE", message: expect.stringMatching(/summary\.currencies\.ARS/) } },
      { attempt: 2, requestId: "req-repair", outcome: "accepted", rejection: undefined },
    ]);
    expect(requestPayload.payloadSchemaVersion).toBe(AI_ADVISOR_PROVIDER_REQUEST_VERSION);
    const responseJson = JSON.parse(persisted.responseJson);
    expect(responseJson.provider.attempts).toHaveLength(2);
    const serialized = persisted.contextJson + persisted.responseJson + persisted.requestJson;
    expect(serialized).not.toMatch(/API_KEY|api[-_]?key|secret|password|token/i);
  });

  it("ask no modifica registros financieros (movements/budgets/goals)", async () => {
    const good = makeValidAnswerOutput();
    const bad = {
      ...good,
      claims: [{ ...good.claims[0], sourceIds: ["summary.currencies.ARS"] }],
    };
    const provider = {
      extractJson: vi.fn()
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-1",
          rawJson: bad,
          durationMs: 10,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult)
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-2",
          rawJson: good,
          durationMs: 12,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult),
    } as unknown as TextExtractionProvider;
    const service = new AiAdvisorService(provider);
    await service.ask({
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "analysis",
      currency: "ARS",
      question: "¿Cómo cerró el período?",
    });
    expect(advisorMocks.movementMutation).not.toHaveBeenCalled();
    expect(advisorMocks.budgetMutation).not.toHaveBeenCalled();
    expect(advisorMocks.goalMutation).not.toHaveBeenCalled();
  });

  it("getValidationIssues devuelve issues con paths para schema invalido", () => {
    const invalidSchema = {
      schemaVersion: "wrong-version",
      title: 123,
      answer: "test",
      confidence: "invalid",
      claims: [],
      risks: [],
      alternatives: [],
      limitations: [],
      followUpQuestions: [],
    };
    const issues = getValidationIssues(invalidSchema, context(), "analysis");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some(i => i.path !== undefined)).toBe(true);
  });

  it("getValidationIssues devuelve path para fuente inexistente", () => {
    const withBadSource = {
      ...makeValidAnswerOutput(),
      claims: [{ id: "c1", text: "El puntaje es 80.", kind: "fact", sourceIds: ["summary.currencies.ARS"] }],
    };
    const issues = getValidationIssues(withBadSource, context(), "analysis");
    expect(issues).toContainEqual(expect.objectContaining({
      code: "AI_ADVISOR_UNKNOWN_SOURCE",
      path: expect.stringContaining("sourceIds"),
      rejectedValues: ["summary.currencies.ARS"],
    }));
  });

  it("getValidationIssues devuelve rejectedValues para numero no respaldado", () => {
    const withUngroundedNumber = {
      ...makeValidAnswerOutput(),
      claims: [{ id: "c1", text: "El puntaje ARS es 99/100.", kind: "fact", sourceIds: ["health.ARS.score"] }],
    };
    const issues = getValidationIssues(withUngroundedNumber, context(), "analysis");
    expect(issues).toContainEqual(expect.objectContaining({
      code: "AI_ADVISOR_UNGROUNDED_NUMBER",
      rejectedValues: expect.arrayContaining(["99/100"]),
    }));
  });

  it("buildProviderPayload no incluye repairInstructions en primer intento", () => {
    const ctx = context();
    const payload = buildProviderPayload(ctx, {
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "analysis",
      question: "¿Cómo cerró el período?",
      currency: "ARS",
    }, { deterministicSimulation: null });
    expect(payload.repairInstructions).toBeUndefined();
  });

  it("ask pasa previousRejectedOutput en segundo intento con issues estructurados", async () => {
    const good = makeValidAnswerOutput();
    const bad = {
      ...good,
      claims: [{ ...good.claims[0], sourceIds: ["summary.currencies.ARS"] }],
    };
    let capturedPayload: Record<string, unknown> | null = null;
    const provider = {
      extractJson: vi.fn()
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-bad",
          rawJson: bad,
          durationMs: 10,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult)
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-good",
          rawJson: good,
          durationMs: 14,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult),
    } as unknown as TextExtractionProvider;
    const service = new AiAdvisorService(provider);
    await service.ask({
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "analysis",
      currency: "ARS",
      question: "¿Cómo cerró el período?",
    });
    expect(provider.extractJson).toHaveBeenCalledTimes(2);
  });

  it("summary.currencies.ARS sigue siendo fuente inexistente", () => {
    const withSummarySource = {
      ...makeValidAnswerOutput(),
      claims: [{ id: "c1", text: "El puntaje ARS es 80.", kind: "fact", sourceIds: ["summary.currencies.ARS"] }],
    };
    expect(() => validateAiAdvisorOutput(withSummarySource, context(), "analysis", "ARS")).toThrow(/fuente inexistente/i);
  });

  it("proveedor se invoca exactamente dos veces en recuperacion", async () => {
    const good = makeValidAnswerOutput();
    const bad = {
      ...good,
      claims: [{ ...good.claims[0], sourceIds: ["summary.currencies.ARS"] }],
    };
    const provider = {
      extractJson: vi.fn()
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-1",
          rawJson: bad,
          durationMs: 10,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult)
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-2",
          rawJson: good,
          durationMs: 12,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult),
    } as unknown as TextExtractionProvider;
    const service = new AiAdvisorService(provider);
    await service.ask({
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "analysis",
      currency: "ARS",
      question: "¿Cómo cerró el período?",
    });
    expect(provider.extractJson).toHaveBeenCalledTimes(2);
  });

  it("nunca existe tercer intento", async () => {
    const bad = {
      ...makeValidAnswerOutput(),
      claims: [{ ...makeValidAnswerOutput().claims[0], sourceIds: ["summary.currencies.ARS"] }],
    };
    const provider = {
      extractJson: vi.fn()
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-1",
          rawJson: bad,
          durationMs: 10,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult)
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-2",
          rawJson: bad,
          durationMs: 11,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult),
    } as unknown as TextExtractionProvider;
    const service = new AiAdvisorService(provider);
    await expect(service.ask({
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "analysis",
      currency: "ARS",
      question: "¿Cómo cerró el período?",
    })).rejects.toThrow();
    expect(provider.extractJson).toHaveBeenCalledTimes(2);
  });

  it("se persisten salida original y reparacion", async () => {
    const good = makeValidAnswerOutput();
    const bad = {
      ...good,
      claims: [{ ...good.claims[0], sourceIds: ["summary.currencies.ARS"] }],
    };
    const provider = {
      extractJson: vi.fn()
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-init",
          rawJson: bad,
          durationMs: 10,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult)
        .mockResolvedValueOnce({
          provider: "ollama",
          model: "test-model",
          requestId: "req-repair",
          rawJson: good,
          durationMs: 13,
          promptSha256: "a".repeat(64),
          documentSha256: "b".repeat(64),
        } satisfies TextExtractionResult),
    } as unknown as TextExtractionProvider;
    const service = new AiAdvisorService(provider);
    await service.ask({
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "analysis",
      currency: "ARS",
      question: "¿Cómo cerró el período?",
    });
    expect(advisorMocks.prismaAiCreate).toHaveBeenCalledTimes(1);
    const persisted = advisorMocks.prismaAiCreate.mock.calls[0][0].data;
    const requestPayload = JSON.parse(persisted.requestJson);
    expect(requestPayload.attempts).toHaveLength(2);
    expect(requestPayload.attempts[0].outcome).toBe("rejected");
    expect(requestPayload.attempts[1].outcome).toBe("accepted");
  });

  it("version del prompt corresponde al archivo final", () => {
    expect(AI_ADVISOR_PROMPT_VERSION).toBe("advisor-prompt-v1.2.0");
  });
});

describe("AI Advisor fingerprint consistency", () => {
  function makeMinimalCollected() {
    return {
      dashboard: mockCollectedDashboard(),
      budgets: mockCollectedBudgets(),
      goals: mockCollectedGoals(),
      future: mockCollectedFuture(),
      financialHealth: mockCollectedFinancialHealth(),
    };
  }

  it("normalizeAdvisorPeriod extrae solo from y to", () => {
    const input = { from: "2026-07-01", to: "2026-07-31" };
    const period = normalizeAdvisorPeriod(input);
    expect(period).toEqual({ from: "2026-07-01", to: "2026-07-31" });
  });

  it("buildAiAdvisorContext produce fingerprint sin campos extra del input", () => {
    const collected = makeMinimalCollected();
    const cleanInput = { from: "2026-07-01", to: "2026-07-31" };
    const dirtyInput = { from: "2026-07-01", to: "2026-07-31", mode: "analysis", currency: "ARS", question: "¿Hola?", scenario: undefined };
    const cleanContext = buildAiAdvisorContext(collected, cleanInput);
    const dirtyContext = buildAiAdvisorContext(collected, dirtyInput);
    expect(cleanContext.sourceFingerprint).toBe(dirtyContext.sourceFingerprint);
  });

  it("fingerprints de context y ask son iguales con mismos datos", () => {
    const collected = makeMinimalCollected();
    const periodInput = { from: "2026-07-01", to: "2026-07-31" };
    const ctx = buildAiAdvisorContext(collected, periodInput);
    const askInput = { from: "2026-07-01", to: "2026-07-31", mode: "analysis", currency: "ARS", question: "¿Cómo cerró?" };
    const askContext = buildAiAdvisorContext(collected, askInput);
    expect(ctx.sourceFingerprint).toBe(askContext.sourceFingerprint);
  });

  it("simulacion produce fingerprint diferente pero deterministico", () => {
    const collected = makeMinimalCollected();
    const periodInput = { from: "2026-07-01", to: "2026-07-31" };
    const baseContext = buildAiAdvisorContext(collected, periodInput);
    const simulation = calculateAdvisorSimulation({
      label: "Reducir egresos",
      currency: "ARS",
      incomeDelta: "0",
      expenseDelta: "-5.000,00",
      commitmentDelta: "0",
      assumptions: ["Supuesto test"],
    }, collected.dashboard);
    const simContext = addSimulationSource(baseContext, simulation);
    expect(simContext.sourceFingerprint).not.toBe(baseContext.sourceFingerprint);
    const simContext2 = addSimulationSource(baseContext, simulation);
    expect(simContext2.sourceFingerprint).toBe(simContext.sourceFingerprint);
  });

  it("el periodo del context solo contiene from y to", () => {
    const collected = makeMinimalCollected();
    const input = { from: "2026-07-01", to: "2026-07-31", mode: "analysis" as const, currency: "ARS" as const, question: "test" };
    const ctx = buildAiAdvisorContext(collected, input);
    expect(Object.keys(ctx.period)).toEqual(["from", "to"]);
    for (const source of ctx.sources) {
      expect(Object.keys(source.period)).toEqual(["from", "to"]);
    }
  });

  it("mode, currency, question no afectan el fingerprint", () => {
    const collected = makeMinimalCollected();
    const base = { from: "2026-07-01", to: "2026-07-31" };
    const ctxBase = buildAiAdvisorContext(collected, base);
    const ctxMode = buildAiAdvisorContext(collected, { ...base, mode: "simulation" as const });
    const ctxCurrency = buildAiAdvisorContext(collected, { ...base, currency: "USD" as const });
    const ctxQuestion = buildAiAdvisorContext(collected, { ...base, question: "¿Qué pasa?" });
    expect(ctxBase.sourceFingerprint).toBe(ctxMode.sourceFingerprint);
    expect(ctxBase.sourceFingerprint).toBe(ctxCurrency.sourceFingerprint);
    expect(ctxBase.sourceFingerprint).toBe(ctxQuestion.sourceFingerprint);
  });
});