import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import {
  AiProviderError,
  AppError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors.js";
import { getTextExtractionProvider } from "../ai/text-extraction-provider.factory.js";
import {
  TextExtractionProviderError,
  type TextExtractionProvider,
} from "../ai/text-extraction-provider.js";
import { budgetsService } from "../budgets/budgets.service.js";
import { dashboardService } from "../dashboard/dashboard.service.js";
import {
  FINANCIAL_HEALTH_FORMULA_VERSION,
  financialHealthService,
} from "../financial-health/financial-health.service.js";
import { futureService } from "../future/future.service.js";
import { goalsService } from "../goals/goals.service.js";
import {
  formatMovementAmount,
  parseMovementAmount,
} from "../movements/movements.service.js";
import type {
  AiAdvisorContextQueryInput,
  AiAdvisorQuestionInput,
  AiAdvisorScenarioInput,
} from "./ai-advisor.schemas.js";




export const AI_ADVISOR_CONTEXT_VERSION = "advisor-context-v1.0.0";
export const AI_ADVISOR_PROMPT_VERSION = "advisor-prompt-v1.0.0";
export const AI_ADVISOR_RESPONSE_VERSION = "advisor-response-v1.0.0";




export type AiAdvisorCurrency = "ARS" | "USD";
export type AiAdvisorMode = "analysis" | "simulation";
export type AiAdvisorSourceKind =
  | "financial_health"
  | "dashboard"
  | "future"
  | "budget"
  | "goal"
  | "alert"
  | "data_quality"
  | "simulation";




export type AiAdvisorNavigationAction = {
  section:
    | "movimientos"
    | "ingresos"
    | "tarjetas"
    | "deuda"
    | "presupuestos"
    | "objetivos"
    | "reportes"
    | "salud";
  label: string;
  drilldown?: {
    from: string;
    to: string;
    label: string;
    type?: "income" | "expense";
    source?: string;
    category?: string;
    status?: "actual" | "pending" | "projected";
    includeProjected?: boolean;
  };
};




export type AiAdvisorSource = {
  id: string;
  kind: AiAdvisorSourceKind;
  label: string;
  description: string;
  period: { from: string; to: string };
  currency: AiAdvisorCurrency | null;
  value: string;
  rule: string | null;
  action: AiAdvisorNavigationAction;
};




export type AiAdvisorContext = {
  schemaVersion: typeof AI_ADVISOR_CONTEXT_VERSION;
  period: { from: string; to: string };
  financialHealthFormulaVersion: string;
  sourceFingerprint: string;
  sourceCount: number;
  summary: {
    currencies: Record<AiAdvisorCurrency, {
      financialHealthStatus: string;
      score: number | null;
      bandLabel: string;
      confidence: string;
      actualBalance: string;
      expectedBalance: string;
      futureExpectedResult: string;
      budgetUsagePercent: string;
      activeGoals: number;
    }>;
    alerts: number;
    criticalAlerts: number;
    unclassifiedRecords: number;
    latestDataAt: string | null;
  };
  sources: AiAdvisorSource[];
  suggestedQuestions: string[];
};




export type AiAdvisorSimulation = {
  label: string;
  currency: AiAdvisorCurrency;
  baselineExpectedBalance: string;
  incomeDelta: string;
  expenseDelta: string;
  commitmentDelta: string;
  simulatedExpectedBalance: string;
  assumptions: string[];
  disclaimer: string;
};




const modelClaimSchema = z.object({
  id: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(1_000),
  kind: z.enum(["fact", "inference", "simulation"]),
  sourceIds: z.array(z.string().trim().min(1)).min(1).max(6),
}).strict();




const modelRiskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  explanation: z.string().trim().min(1).max(800),
  severity: z.enum(["info", "attention"]),
  sourceIds: z.array(z.string().trim().min(1)).min(1).max(6),
}).strict();




const modelAlternativeSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(800),
  kind: z.literal("simulation"),
  assumptions: z.array(z.string().trim().min(1).max(240)).max(6),
  sourceIds: z.array(z.string().trim().min(1)).min(1).max(6),
}).strict();




export const aiAdvisorModelOutputSchema = z.object({
  schemaVersion: z.literal(AI_ADVISOR_RESPONSE_VERSION),
  title: z.string().trim().min(1).max(180),
  answer: z.string().trim().min(1).max(4_000),
  confidence: z.enum(["high", "medium", "low"]),
  claims: z.array(modelClaimSchema).min(1).max(10),
  risks: z.array(modelRiskSchema).max(6),
  alternatives: z.array(modelAlternativeSchema).max(5),
  limitations: z.array(z.string().trim().min(1).max(500)).max(8),
  followUpQuestions: z.array(z.string().trim().min(1).max(220)).max(5),
}).strict();




export type AiAdvisorModelOutput = z.infer<typeof aiAdvisorModelOutputSchema>;




export type AiAdvisorCitation = AiAdvisorSource;




export type AiAdvisorAnswer = AiAdvisorModelOutput & {
  confidence: "high" | "medium" | "low";
  citations: AiAdvisorCitation[];
};




export type AiAdvisorInteractionResponse = {
  id: string;
  period: { from: string; to: string };
  mode: AiAdvisorMode;
  question: string;
  currency: AiAdvisorCurrency | null;
  scenario: AiAdvisorSimulation | null;
  context: {
    version: string;
    fingerprint: string;
    sourceCount: number;
    financialHealthFormulaVersion: string;
  };
  provider: {
    name: string;
    model: string;
    requestId: string;
    durationMs: number;
  };
  prompt: {
    version: string;
    sha256: string;
  };
  answer: AiAdvisorAnswer;
  createdAt: string;
  disclaimer: string;
};




export type AiAdvisorHistoryItem = {
  id: string;
  period: { from: string; to: string };
  mode: AiAdvisorMode;
  question: string;
  currency: AiAdvisorCurrency | null;
  title: string;
  confidence: string;
  provider: string;
  model: string;
  promptVersion: string;
  contextFingerprint: string;
  createdAt: string;
};




type DashboardSource = Awaited<ReturnType<typeof dashboardService.getOverview>>;
type BudgetSource = Awaited<ReturnType<typeof budgetsService.overview>>;
type GoalsSource = Awaited<ReturnType<typeof goalsService.overview>>;
type FutureSource = Awaited<ReturnType<typeof futureService.getOverview>>;
type FinancialHealthSource = Awaited<ReturnType<typeof financialHealthService.evaluate>>;




export type AiAdvisorCollectedSources = {
  dashboard: DashboardSource;
  budgets: BudgetSource;
  goals: GoalsSource;
  future: FutureSource;
  financialHealth: FinancialHealthSource;
};




type PersistedInteraction = {
  id: string;
  periodFrom: string;
  periodTo: string;
  mode: string;
  question: string;
  currency: string | null;
  contextFingerprint: string;
  financialHealthFormulaVersion: string;
  promptVersion: string;
  promptSha256: string;
  provider: string;
  model: string;
  providerRequestId: string;
  requestJson: string;
  contextJson: string;
  responseJson: string;
  durationMs: number;
  createdAt: Date;
};




const DISCLAIMER =
  "La respuesta explica datos de CajaApp y puede plantear simulaciones. No modifica registros, no ejecuta operaciones y no sustituye asesoramiento financiero, contable, impositivo o legal profesional.";




let cachedPrompt: { content: string; sha256: string } | null = null;




function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}




function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}




function fingerprint(value: unknown): string {
  return sha256(JSON.stringify(canonicalize(value)));
}




function configuredModel(): string {
  return env.AI_PROVIDER === "ollama" ? env.OLLAMA_MODEL : env.AI_MODEL ?? "unknown";
}




async function loadPrompt(): Promise<{ content: string; sha256: string }> {
  if (cachedPrompt) return cachedPrompt;
  const promptPath = path.resolve(
    process.cwd(),
    env.AI_ADVISOR_PROMPTS_DIR,
    "01-explain-financial-context.md",
  );
  const content = await readFile(promptPath, "utf8");
  cachedPrompt = { content, sha256: sha256(content) };
  return cachedPrompt;
}




function financialValue(value: string, currency: AiAdvisorCurrency): string {
  return `${currency} ${value}`;
}




function savingsRateValue(value: string | null): string {
  return value === null ? "sin base comparable" : `${value}%`;
}




function source(
  input: Omit<AiAdvisorSource, "period"> & { period: { from: string; to: string } },
): AiAdvisorSource {
  return input;
}




function movementAction(
  query: AiAdvisorContextQueryInput,
  label: string,
  options: Omit<NonNullable<AiAdvisorNavigationAction["drilldown"]>, "from" | "to" | "label"> = {},
): AiAdvisorNavigationAction {
  return {
    section: "movimientos",
    label,
    drilldown: {
      from: query.from,
      to: query.to,
      label,
      ...options,
    },
  };
}




function confidenceRank(value: string): number {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}




function confidenceFromContext(
  context: AiAdvisorContext,
  currency?: AiAdvisorCurrency,
): "high" | "medium" | "low" {
  const selected = currency
    ? [context.summary.currencies[currency].confidence]
    : Object.values(context.summary.currencies).map((item) => item.confidence);
  const best = selected.reduce((current, item) =>
    confidenceRank(item) > confidenceRank(current) ? item : current, "insufficient");
  if (best === "high") return "high";
  if (best === "medium") return "medium";
  return "low";
}




function clampConfidence(
  requested: "high" | "medium" | "low",
  maximum: "high" | "medium" | "low",
): "high" | "medium" | "low" {
  return confidenceRank(requested) <= confidenceRank(maximum) ? requested : maximum;
}




export function calculateAdvisorSimulation(
  scenario: AiAdvisorScenarioInput,
  dashboard: DashboardSource,
): AiAdvisorSimulation {
  const currency = scenario.currency;
  const baselineRaw = currency === "ARS"
    ? dashboard.summary.expected.balanceArs
    : dashboard.summary.expected.balanceUsd;
  const baseline = parseMovementAmount(baselineRaw, currency);
  const incomeDelta = parseMovementAmount(scenario.incomeDelta, currency);
  const expenseDelta = parseMovementAmount(scenario.expenseDelta, currency);
  const commitmentDelta = parseMovementAmount(scenario.commitmentDelta, currency);
  const simulated = baseline + incomeDelta - expenseDelta - commitmentDelta;




  return {
    label: scenario.label,
    currency,
    baselineExpectedBalance: formatMovementAmount(baseline, currency),
    incomeDelta: formatMovementAmount(incomeDelta, currency),
    expenseDelta: formatMovementAmount(expenseDelta, currency),
    commitmentDelta: formatMovementAmount(commitmentDelta, currency),
    simulatedExpectedBalance: formatMovementAmount(simulated, currency),
    assumptions: scenario.assumptions,
    disclaimer: "Simulación aislada: no altera movimientos, presupuestos, objetivos ni proyecciones guardadas.",
  };
}




export function buildAiAdvisorContext(
  collected: AiAdvisorCollectedSources,
  query: AiAdvisorContextQueryInput,
): AiAdvisorContext {
  const { dashboard, budgets, goals, future, financialHealth } = collected;
  const health = financialHealth.evaluation;
  const sources: AiAdvisorSource[] = [];




  for (const currency of ["ARS", "USD"] as const) {
    const result = health.currencies[currency];
    const actual = dashboard.summary.actual;
    const expected = dashboard.summary.expected;
    const budget = budgets.currencies[currency];
    const goal = goals.currencies[currency];




    sources.push(source({
      id: `health.${currency}.score`,
      kind: "financial_health",
      label: `Resultado de salud financiera ${currency}`,
      description: `Puntaje determinístico, banda y confianza para ${currency}.`,
      period: query,
      currency,
      value: result.score === null
        ? `No calculado. ${result.blockers.join(" ") || "Evidencia insuficiente."}`
        : `${result.score}/100 · ${result.bandLabel} · ${result.confidence.labelText}`,
      rule: `Fórmula ${health.formula.version}; ${result.availableWeight}/100 puntos con evidencia.`,
      action: { section: "salud", label: "Abrir salud financiera" },
    }));




    for (const factor of result.factors) {
      sources.push(source({
        id: `health.${currency}.${factor.id}`,
        kind: "financial_health",
        label: `${factor.title} ${currency}`,
        description: factor.description,
        period: query,
        currency,
        value: `${factor.points ?? "sin evidencia"}/${factor.weight}. ${factor.evidence.join(" ")}`,
        rule: factor.rule,
        action: factor.action,
      }));
    }




    sources.push(source({
      id: `dashboard.${currency}.actual`,
      kind: "dashboard",
      label: `Balance realizado ${currency}`,
      description: "Ingresos, egresos y balance ya realizados.",
      period: query,
      currency,
      value: currency === "ARS"
        ? `Ingresos ${financialValue(actual.incomeArs, currency)}; egresos ${financialValue(actual.expenseArs, currency)}; balance ${financialValue(actual.balanceArs, currency)}; ahorro ${savingsRateValue(actual.savingsRateArs)}.`
        : `Ingresos ${financialValue(actual.incomeUsd, currency)}; egresos ${financialValue(actual.expenseUsd, currency)}; balance ${financialValue(actual.balanceUsd, currency)}; ahorro ${savingsRateValue(actual.savingsRateUsd)}.`,
      rule: "Sólo movimientos con estado actual.",
      action: movementAction(query, `Ver movimientos realizados ${currency}`, { status: "actual" }),
    }));




    sources.push(source({
      id: `dashboard.${currency}.expected`,
      kind: "dashboard",
      label: `Balance esperado ${currency}`,
      description: "Ingresos, egresos y balance incluyendo pendientes y proyectados.",
      period: query,
      currency,
      value: currency === "ARS"
        ? `Ingresos ${financialValue(expected.incomeArs, currency)}; egresos ${financialValue(expected.expenseArs, currency)}; balance ${financialValue(expected.balanceArs, currency)}.`
        : `Ingresos ${financialValue(expected.incomeUsd, currency)}; egresos ${financialValue(expected.expenseUsd, currency)}; balance ${financialValue(expected.balanceUsd, currency)}.`,
      rule: "Suma autoritativa del ledger actual, pendiente y proyectado.",
      action: movementAction(query, `Ver balance esperado ${currency}`, { includeProjected: true }),
    }));




    sources.push(source({
      id: `future.${currency}.horizon`,
      kind: "future",
      label: `Compromisos futuros ${currency}`,
      description: "Resultado esperado del horizonte de tres meses de deuda futura.",
      period: query,
      currency,
      value: currency === "ARS"
        ? `Ingresos esperados ${financialValue(future.summary.expectedIncome.ars, currency)}; compromisos esperados ${financialValue(future.summary.expectedCommitments.ars, currency)}; resultado ${financialValue(future.summary.expectedResult.ars, currency)}.`
        : `Ingresos esperados ${financialValue(future.summary.expectedIncome.usd, currency)}; compromisos esperados ${financialValue(future.summary.expectedCommitments.usd, currency)}; resultado ${financialValue(future.summary.expectedResult.usd, currency)}.`,
      rule: `Horizonte ${future.range.months} meses; calidad ${future.dataQuality.status}.`,
      action: { section: "deuda", label: "Abrir deuda futura" },
    }));




    sources.push(source({
      id: `budget.${currency}.overview`,
      kind: "budget",
      label: `Presupuestos ${currency}`,
      description: "Límites activos y consumo real del período.",
      period: query,
      currency,
      value: `${budget.budgetCount} presupuestos; límite ${financialValue(budget.effectiveLimit, currency)}; gastado ${financialValue(budget.spent, currency)}; uso ${budget.usagePercent}%; atención global ${budgets.attentionCount}; excedidos ${budgets.exceededCount}.`,
      rule: "Consumo real y rollover calculados por budgetsService.",
      action: { section: "presupuestos", label: "Abrir presupuestos" },
    }));




    sources.push(source({
      id: `goal.${currency}.overview`,
      kind: "goal",
      label: `Objetivos ${currency}`,
      description: "Metas activas y aportes registrados como planificación.",
      period: query,
      currency,
      value: `${goal.goalCount} objetivos; meta ${financialValue(goal.targetAmount, currency)}; aportado ${financialValue(goal.contributedAmount, currency)}; restante ${financialValue(goal.remainingAmount, currency)}; progreso ${goal.progressPercent}%.`,
      rule: "Los aportes de objetivos no reservan saldo ni modifican el puntaje.",
      action: { section: "objetivos", label: "Abrir objetivos" },
    }));




    const evolution = dashboard.monthlyEvolution.map((month) => ({
      monthKey: month.monthKey,
      income: currency === "ARS" ? month.incomeArs : month.incomeUsd,
      expense: currency === "ARS" ? month.expenseArs : month.expenseUsd,
      balance: currency === "ARS" ? month.balanceArs : month.balanceUsd,
    }));
    sources.push(source({
      id: `dashboard.${currency}.evolution`,
      kind: "dashboard",
      label: `Evolución mensual ${currency}`,
      description: "Serie mensual real utilizada para explicar tendencias.",
      period: query,
      currency,
      value: JSON.stringify(evolution),
      rule: "Serie entregada por dashboard.monthlyEvolution; no interpolada.",
      action: { section: "reportes", label: "Abrir reportes" },
    }));
  }




  for (const alert of dashboard.alerts) {
    sources.push(source({
      id: `alert.${alert.id}`,
      kind: "alert",
      label: alert.title,
      description: alert.message,
      period: query,
      currency: null,
      value: `${alert.severity}. ${alert.evidence.join(" ")}`,
      rule: alert.rule,
      action: alert.action,
    }));
  }




  sources.push(source({
    id: "data-quality.period",
    kind: "data_quality",
    label: "Calidad del dato del período",
    description: "Cobertura y actualización del ledger utilizado.",
    period: query,
    currency: null,
    value: `${dashboard.dataQuality.unclassifiedRecords} sin clasificar; ${dashboard.dataQuality.actualRecords} realizados; ${dashboard.dataQuality.pendingRecords} pendientes; ${dashboard.dataQuality.projectedRecords} proyectados; última actualización ${dashboard.dataQuality.lastUpdatedAt ?? "no disponible"}.`,
    rule: "Conteos y timestamp calculados por el backend sobre el período consultado.",
    action: movementAction(query, "Revisar calidad del dato", { category: "Sin clasificar", includeProjected: true }),
  }));




  const categorySummary = dashboard.categories.slice(0, 8).map((category) => ({
    name: category.name,
    amountArs: category.amountArs,
    amountUsd: category.amountUsd,
    shareArs: category.shareArs,
    shareUsd: category.shareUsd,
  }));
  sources.push(source({
    id: "dashboard.categories",
    kind: "dashboard",
    label: "Distribución por categorías",
    description: "Principales categorías de egresos realizados.",
    period: query,
    currency: null,
    value: JSON.stringify(categorySummary),
    rule: "Porcentajes y montos provienen de dashboard.categories.",
    action: movementAction(query, "Ver egresos por categoría", { type: "expense", status: "actual" }),
  }));




  const fingerprintPayload = {
    schemaVersion: AI_ADVISOR_CONTEXT_VERSION,
    period: query,
    formulaVersion: health.formula.version,
    sources: sources.map(({ action: _action, ...item }) => item),
  };




  return {
    schemaVersion: AI_ADVISOR_CONTEXT_VERSION,
    period: query,
    financialHealthFormulaVersion: health.formula.version,
    sourceFingerprint: fingerprint(fingerprintPayload),
    sourceCount: sources.length,
    summary: {
      currencies: {
        ARS: {
          financialHealthStatus: health.currencies.ARS.status,
          score: health.currencies.ARS.score,
          bandLabel: health.currencies.ARS.bandLabel,
          confidence: health.currencies.ARS.confidence.label,
          actualBalance: dashboard.summary.actual.balanceArs,
          expectedBalance: dashboard.summary.expected.balanceArs,
          futureExpectedResult: future.summary.expectedResult.ars,
          budgetUsagePercent: budgets.currencies.ARS.usagePercent,
          activeGoals: goals.currencies.ARS.goalCount,
        },
        USD: {
          financialHealthStatus: health.currencies.USD.status,
          score: health.currencies.USD.score,
          bandLabel: health.currencies.USD.bandLabel,
          confidence: health.currencies.USD.confidence.label,
          actualBalance: dashboard.summary.actual.balanceUsd,
          expectedBalance: dashboard.summary.expected.balanceUsd,
          futureExpectedResult: future.summary.expectedResult.usd,
          budgetUsagePercent: budgets.currencies.USD.usagePercent,
          activeGoals: goals.currencies.USD.goalCount,
        },
      },
      alerts: dashboard.alerts.length,
      criticalAlerts: dashboard.alerts.filter((alert) => alert.severity === "critical").length,
      unclassifiedRecords: dashboard.dataQuality.unclassifiedRecords,
      latestDataAt: dashboard.dataQuality.lastUpdatedAt,
    },
    sources,
    suggestedQuestions: [
      "¿Qué factores explican el resultado financiero del período?",
      "¿Qué riesgos ya detectados por CajaApp conviene revisar primero?",
      "¿Cómo evolucionaron los egresos frente al período anterior?",
      "¿Qué compromisos futuros tienen mayor impacto en el balance esperado?",
      "¿Qué datos faltantes reducen la confianza del análisis?",
    ],
  };
}




function allModelText(output: AiAdvisorModelOutput): string {
  return [
    output.title,
    output.answer,
    ...output.claims.map((item) => item.text),
    ...output.risks.flatMap((item) => [item.title, item.explanation]),
    ...output.alternatives.flatMap((item) => [item.title, item.description, ...item.assumptions]),
    ...output.limitations,
    ...output.followUpQuestions,
  ].join("\n");
}




function numericTokens(value: string): string[] {
  // A hyphen inside an ISO date is a separator, not a negative sign.
  // Starting the match after the separator keeps 2026-07-14 as 2026, 07 and 14.
  return value.match(/(?<!\d)-?\d+(?:[.,]\d+)*(?:%|\/100)?/g) ?? [];
}




function normalizeNumberToken(value: string): string {
  const compact = value.toLowerCase().replace(/\s/g, "");
  if (/^-?\d+$/.test(compact)) {
    return String(Number(compact));
  }
  return compact.replace(/[.,]/g, "");
}




function assertTextNumbersGrounded(
  text: string,
  sourceIds: string[],
  sourceById: Map<string, AiAdvisorSource>,
  label: string,
): void {
  const citedSources = sourceIds.map((sourceId) => sourceById.get(sourceId)!);
  const corpus = citedSources
    .map((item) => `${item.value} ${item.rule ?? ""} ${item.period.from} ${item.period.to}`)
    .join("\n");
  const corpusTokens = new Set(numericTokens(corpus).map(normalizeNumberToken));
  const invented = numericTokens(text)
    .filter((token) => !corpusTokens.has(normalizeNumberToken(token)));
  if (invented.length > 0) {
    throw new AppError(
      "AI_ADVISOR_UNGROUNDED_NUMBER",
      `${label} contiene valores no presentes en sus fuentes citadas: ${[...new Set(invented)].slice(0, 5).join(", ")}`,
      422,
    );
  }
}




function assertGroundedNumbers(
  output: AiAdvisorModelOutput,
  sourceById: Map<string, AiAdvisorSource>,
): void {
  for (const claim of output.claims) {
    assertTextNumbersGrounded(claim.text, claim.sourceIds, sourceById, `La afirmación ${claim.id}`);
  }
  for (const risk of output.risks) {
    assertTextNumbersGrounded(
      `${risk.title} ${risk.explanation}`,
      risk.sourceIds,
      sourceById,
      `El punto de atención ${risk.title}`,
    );
  }
  for (const alternative of output.alternatives) {
    assertTextNumbersGrounded(
      `${alternative.title} ${alternative.description} ${alternative.assumptions.join(" ")}`,
      alternative.sourceIds,
      sourceById,
      `La alternativa ${alternative.title}`,
    );
  }




  const referencedIds = [...new Set([
    ...output.claims.flatMap((item) => item.sourceIds),
    ...output.risks.flatMap((item) => item.sourceIds),
    ...output.alternatives.flatMap((item) => item.sourceIds),
  ])];
  assertTextNumbersGrounded(
    [output.title, output.answer, ...output.limitations, ...output.followUpQuestions].join("\n"),
    referencedIds,
    sourceById,
    "La síntesis general",
  );
}




function assertSafeLanguage(output: AiAdvisorModelOutput): void {
  const text = allModelText(output);
  const prohibited = /\b(garantizad[oa]s?|sin riesgo|debes|deberías|tenés que|tienes que|comprá|compra acciones|vende|vendé|invertí|invierte|pedí un préstamo|saca un préstamo|certeza absoluta|guaranteed|risk[- ]free)\b/i;
  if (prohibited.test(text)) {
    throw new AppError(
      "AI_ADVISOR_UNSAFE_LANGUAGE",
      "La respuesta de IA usa lenguaje prescriptivo o de certeza no permitido.",
      422,
    );
  }
}




export function validateAiAdvisorOutput(
  raw: unknown,
  context: AiAdvisorContext,
  mode: AiAdvisorMode,
  currency?: AiAdvisorCurrency,
): AiAdvisorAnswer {
  const parsed = aiAdvisorModelOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(
      "AI_ADVISOR_OUTPUT_SCHEMA_INVALID",
      `La respuesta de IA no cumple el contrato: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
      422,
    );
  }




  const output = parsed.data;
  const sourceById = new Map(context.sources.map((item) => [item.id, item]));
  const referenced = new Set<string>();
  const groups = [
    ...output.claims.map((item) => ({ kind: item.kind, sourceIds: item.sourceIds })),
    ...output.risks.map((item) => ({ kind: "risk", sourceIds: item.sourceIds })),
    ...output.alternatives.map((item) => ({ kind: item.kind, sourceIds: item.sourceIds })),
  ];




  for (const group of groups) {
    if (group.kind === "simulation" && mode !== "simulation") {
      throw new AppError(
        "AI_ADVISOR_UNREQUESTED_SIMULATION",
        "La IA devolvió una simulación que no fue solicitada.",
        422,
      );
    }
    for (const sourceId of group.sourceIds) {
      if (!sourceById.has(sourceId)) {
        throw new AppError(
          "AI_ADVISOR_UNKNOWN_SOURCE",
          `La IA citó una fuente inexistente: ${sourceId}`,
          422,
        );
      }
      referenced.add(sourceId);
    }
  }




  assertSafeLanguage(output);
  assertGroundedNumbers(output, sourceById);




  return {
    ...output,
    confidence: clampConfidence(output.confidence, confidenceFromContext(context, currency)),
    citations: [...referenced].map((id) => sourceById.get(id)!),
  };
}




function addSimulationSource(
  context: AiAdvisorContext,
  simulation: AiAdvisorSimulation,
): AiAdvisorContext {
  const simulationSource: AiAdvisorSource = {
    id: `simulation.${simulation.currency}.expected-balance`,
    kind: "simulation",
    label: simulation.label,
    description: "Escenario matemático aislado solicitado por el usuario.",
    period: context.period,
    currency: simulation.currency,
    value: `Base ${simulation.baselineExpectedBalance}; delta ingresos ${simulation.incomeDelta}; delta egresos ${simulation.expenseDelta}; delta compromisos ${simulation.commitmentDelta}; resultado simulado ${simulation.simulatedExpectedBalance}; supuestos ${simulation.assumptions.join(" | ") || "sin supuestos adicionales"}.`,
    rule: "resultado = balance esperado + delta de ingresos - delta de egresos - delta de compromisos",
    action: { section: "movimientos", label: "Revisar datos base del escenario" },
  };
  const sources = [...context.sources, simulationSource];
  return {
    ...context,
    sources,
    sourceCount: sources.length,
    sourceFingerprint: fingerprint({
      schemaVersion: context.schemaVersion,
      period: context.period,
      formulaVersion: context.financialHealthFormulaVersion,
      sources: sources.map(({ action: _action, ...item }) => item),
    }),
  };
}




function interactionFromStored(stored: PersistedInteraction): AiAdvisorInteractionResponse {
  return JSON.parse(stored.responseJson) as AiAdvisorInteractionResponse;
}




function historyFromStored(stored: PersistedInteraction): AiAdvisorHistoryItem | null {
  try {
    const response = interactionFromStored(stored);
    return {
      id: stored.id,
      period: { from: stored.periodFrom, to: stored.periodTo },
      mode: stored.mode as AiAdvisorMode,
      question: stored.question,
      currency: stored.currency as AiAdvisorCurrency | null,
      title: response.answer.title,
      confidence: response.answer.confidence,
      provider: stored.provider,
      model: stored.model,
      promptVersion: stored.promptVersion,
      contextFingerprint: stored.contextFingerprint,
      createdAt: stored.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}




export class AiAdvisorService {
  constructor(private readonly provider?: TextExtractionProvider) {}




  private async collect(query: AiAdvisorContextQueryInput): Promise<AiAdvisorCollectedSources> {
    const [dashboard, budgets, goals, future, financialHealth] = await Promise.all([
      dashboardService.getOverview(query),
      budgetsService.overview({
        from: query.from.slice(0, 7),
        to: query.to.slice(0, 7),
        status: "active",
      }),
      goalsService.overview({ status: "active", limit: 4 }),
      futureService.getOverview({ from: query.to.slice(0, 7), months: 3 }),
      financialHealthService.evaluate(query, 6),
    ]);
    return { dashboard, budgets, goals, future, financialHealth };
  }




  async context(query: AiAdvisorContextQueryInput) {
    const collected = await this.collect(query);
    const context = buildAiAdvisorContext(collected, query);
    return {
      context,
      provider: {
        name: env.AI_PROVIDER,
        model: configuredModel(),
        configured: !env.AI_MOCK_MODE,
      },
      promptVersion: AI_ADVISOR_PROMPT_VERSION,
      limits: {
        maxQuestionCharacters: env.AI_ADVISOR_MAX_QUESTION_CHARACTERS,
        maxContextCharacters: env.AI_ADVISOR_MAX_CONTEXT_CHARACTERS,
      },
      disclaimer: DISCLAIMER,
    };
  }




  async ask(input: AiAdvisorQuestionInput): Promise<AiAdvisorInteractionResponse> {
    if (env.AI_MOCK_MODE && !this.provider) {
      throw new AppError(
        "AI_ADVISOR_PROVIDER_DISABLED",
        "El asesor IA está deshabilitado mientras AI_MOCK_MODE=true.",
        503,
      );
    }
    if (input.question.length > env.AI_ADVISOR_MAX_QUESTION_CHARACTERS) {
      throw new ValidationError(
        `La pregunta no puede superar ${env.AI_ADVISOR_MAX_QUESTION_CHARACTERS} caracteres.`,
      );
    }




    const collected = await this.collect(input);
    let context = buildAiAdvisorContext(collected, input);
    const simulation = input.scenario
      ? calculateAdvisorSimulation(input.scenario, collected.dashboard)
      : null;
    if (simulation) context = addSimulationSource(context, simulation);




    const prompt = await loadPrompt();
    const requestPayload = {
      schemaVersion: "advisor-request-v1.0.0",
      untrustedUserQuestion: input.question,
      mode: input.mode,
      requestedCurrency: input.currency ?? input.scenario?.currency ?? null,
      deterministicSimulation: simulation,
      structuredContext: context,
      outputContract: {
        schemaVersion: AI_ADVISOR_RESPONSE_VERSION,
        citationsRequired: true,
        originalDocumentsIncluded: false,
      },
    };
    const rawDocument = JSON.stringify(requestPayload, null, 2);
    if (rawDocument.length > env.AI_ADVISOR_MAX_CONTEXT_CHARACTERS) {
      throw new AppError(
        "AI_ADVISOR_CONTEXT_TOO_LARGE",
        "El contexto estructurado supera el límite seguro configurado.",
        413,
      );
    }




    const provider = this.provider ?? getTextExtractionProvider();
    try {
      await provider.preflight?.();
      const result = await provider.extractJson({
        systemPrompt: prompt.content,
        rawDocument,
      });
      const answer = validateAiAdvisorOutput(
        result.rawJson,
        context,
        input.mode,
        input.currency ?? input.scenario?.currency,
      );
      const now = new Date();
      const responseBase: Omit<AiAdvisorInteractionResponse, "id"> = {
        period: { from: input.from, to: input.to },
        mode: input.mode,
        question: input.question,
        currency: input.currency ?? input.scenario?.currency ?? null,
        scenario: simulation,
        context: {
          version: context.schemaVersion,
          fingerprint: context.sourceFingerprint,
          sourceCount: context.sourceCount,
          financialHealthFormulaVersion: context.financialHealthFormulaVersion,
        },
        provider: {
          name: result.provider,
          model: result.model,
          requestId: result.requestId,
          durationMs: result.durationMs,
        },
        prompt: {
          version: AI_ADVISOR_PROMPT_VERSION,
          sha256: prompt.sha256,
        },
        answer,
        createdAt: now.toISOString(),
        disclaimer: DISCLAIMER,
      };




      const interactionId = randomUUID();
      const response: AiAdvisorInteractionResponse = { id: interactionId, ...responseBase };
      await prisma.aiAdvisorInteraction.create({
        data: {
          id: interactionId,
          periodFrom: input.from,
          periodTo: input.to,
          mode: input.mode,
          question: input.question,
          currency: responseBase.currency,
          contextFingerprint: context.sourceFingerprint,
          financialHealthFormulaVersion: FINANCIAL_HEALTH_FORMULA_VERSION,
          promptVersion: AI_ADVISOR_PROMPT_VERSION,
          promptSha256: prompt.sha256,
          provider: result.provider,
          model: result.model,
          providerRequestId: result.requestId,
          requestJson: JSON.stringify({
            mode: input.mode,
            currency: responseBase.currency,
            scenario: simulation,
          }),
          contextJson: JSON.stringify(context),
          responseJson: JSON.stringify(response),
          durationMs: result.durationMs,
          createdAt: now,
        },
      });
      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof TextExtractionProviderError) {
        throw new AiProviderError(`${error.code}: ${error.message}`);
      }
      throw error;
    }
  }




  async history(limit = 20): Promise<AiAdvisorHistoryItem[]> {
    const items = await prisma.aiAdvisorInteraction.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    }) as PersistedInteraction[];
    return items.map(historyFromStored).filter((item): item is AiAdvisorHistoryItem => item !== null);
  }




  async detail(interactionId: string): Promise<AiAdvisorInteractionResponse> {
    const stored = await prisma.aiAdvisorInteraction.findUnique({ where: { id: interactionId } }) as PersistedInteraction | null;
    if (!stored) throw new NotFoundError("AI advisor interaction");
    return interactionFromStored(stored);
  }




  async delete(interactionId: string): Promise<{ success: true }> {
    const stored = await prisma.aiAdvisorInteraction.findUnique({ where: { id: interactionId } });
    if (!stored) throw new NotFoundError("AI advisor interaction");
    await prisma.aiAdvisorInteraction.delete({ where: { id: interactionId } });
    return { success: true };
  }
}




export const aiAdvisorService = new AiAdvisorService();