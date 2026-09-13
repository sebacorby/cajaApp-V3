import { createHash } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../shared/errors.js";
import { budgetsService } from "../budgets/budgets.service.js";
import { dashboardService } from "../dashboard/dashboard.service.js";
import { futureService } from "../future/future.service.js";
import { goalsService } from "../goals/goals.service.js";
import { parseMovementAmount } from "../movements/movements.service.js";
import type { FinancialHealthQueryInput } from "./financial-health.schemas.js";


export const FINANCIAL_HEALTH_FORMULA_VERSION = "fh-v1.0.0";


export type FinancialHealthCurrency = "ARS" | "USD";
export type FinancialHealthCalculationStatus = "calculated" | "insufficient_data";
export type FinancialHealthFactorStatus = "available" | "unavailable";
export type FinancialHealthImpact = "positive" | "neutral" | "negative";
export type FinancialHealthConfidenceLabel = "high" | "medium" | "low" | "insufficient";


export type FinancialHealthAction = {
  section: "movimientos" | "deuda" | "presupuestos" | "objetivos" | "reportes";
  label: string;
  drilldown?: {
    from: string;
    to: string;
    label: string;
    type?: "income" | "expense";
    category?: string;
    status?: "actual" | "pending" | "projected";
    includeProjected?: boolean;
  };
};


export type FinancialHealthFactor = {
  id:
    | "actual_balance"
    | "expected_balance"
    | "commitment_coverage"
    | "expense_trend"
    | "budget_control"
    | "data_quality";
  title: string;
  description: string;
  status: FinancialHealthFactorStatus;
  impact: FinancialHealthImpact;
  weight: number;
  points: number | null;
  rule: string;
  evidence: string[];
  action: FinancialHealthAction;
};


export type FinancialHealthCurrencyResult = {
  currency: FinancialHealthCurrency;
  status: FinancialHealthCalculationStatus;
  score: number | null;
  band: "favorable" | "stable" | "exposed" | "compromised" | "not_calculated";
  bandLabel: string;
  confidence: {
    label: FinancialHealthConfidenceLabel;
    labelText: string;
    basisPoints: number;
    availableWeight: number;
    recordEvidence: number;
    historyMonths: number;
    classifiedBasisPoints: number;
  };
  availableWeight: number;
  earnedPoints: number;
  factors: FinancialHealthFactor[];
  blockers: string[];
};


type DashboardSource = Awaited<ReturnType<typeof dashboardService.getOverview>>;
type BudgetSource = Awaited<ReturnType<typeof budgetsService.overview>>;
type GoalsSource = Awaited<ReturnType<typeof goalsService.overview>>;
type FutureSource = Awaited<ReturnType<typeof futureService.getOverview>>;


export type FinancialHealthSources = {
  dashboard: DashboardSource;
  budgets: BudgetSource;
  goals: GoalsSource;
  future: FutureSource;
};


export type FinancialHealthEvaluation = {
  formula: {
    version: string;
    title: string;
    description: string;
    scoreRange: { minimum: 0; maximum: 100 };
    weights: Array<{ factorId: FinancialHealthFactor["id"]; weight: number }>;
    minimumRequirements: string[];
  };
  period: FinancialHealthQueryInput;
  evaluatedAt: string;
  sourceFingerprint: string;
  currencies: Record<FinancialHealthCurrency, FinancialHealthCurrencyResult>;
  goalsContext: {
    note: string;
    activeGoals: number;
    nearestActiveTargetDate: string | null;
    currencies: {
      ARS: { targetAmount: string; contributedAmount: string; remainingAmount: string; progressPercent: string };
      USD: { targetAmount: string; contributedAmount: string; remainingAmount: string; progressPercent: string };
    };
  };
  comparison: FinancialHealthComparison | null;
  disclaimer: string;
};


export type FinancialHealthHistoryItem = {
  id: string;
  period: FinancialHealthQueryInput;
  formulaVersion: string;
  sourceFingerprint: string;
  savedAt: string;
  currencies: Record<FinancialHealthCurrency, {
    status: FinancialHealthCalculationStatus;
    score: number | null;
    bandLabel: string;
    confidenceLabel: string;
  }>;
};


export type FinancialHealthComparison = {
  snapshotId: string;
  period: FinancialHealthQueryInput;
  savedAt: string;
  currencies: Record<FinancialHealthCurrency, {
    scoreDelta: number | null;
    previousScore: number | null;
    factorChanges: Array<{
      factorId: FinancialHealthFactor["id"];
      previousPoints: number | null;
      currentPoints: number | null;
      delta: number | null;
    }>;
  }>;
};


export type FinancialHealthResponse = {
  evaluation: FinancialHealthEvaluation;
  history: FinancialHealthHistoryItem[];
  snapshotId: string | null;
  snapshotCreated: boolean;
};


type StoredSnapshot = {
  id: string;
  periodFrom: string;
  periodTo: string;
  formulaVersion: string;
  sourceFingerprint: string;
  resultJson: string;
  createdAt: Date;
};


const FACTOR_WEIGHTS: Record<FinancialHealthFactor["id"], number> = {
  actual_balance: 20,
  expected_balance: 20,
  commitment_coverage: 20,
  expense_trend: 15,
  budget_control: 15,
  data_quality: 10,
};


function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}


function decimalPercentageToBasisPoints(value: string | null): number | null {
  if (value === null) return null;
  const match = value.trim().match(/^([+-]?)(\d+)(?:[.,](\d{1,2}))?$/);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number(match[2]);
  const fraction = Number((match[3] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fraction)) return null;
  return sign * (whole * 100 + fraction);
}


function ratioBasisPoints(numerator: bigint, denominator: bigint): number | null {
  if (denominator <= 0n) return null;
  const scaled = (numerator * 10_000n + denominator / 2n) / denominator;
  const bounded = scaled > 100_000n ? 100_000n : scaled < -100_000n ? -100_000n : scaled;
  return Number(bounded);
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
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}


function formatEvidenceAmount(value: string, currency: FinancialHealthCurrency): string {
  return `${currency} ${value}`;
}


function unavailableFactor(
  id: FinancialHealthFactor["id"],
  title: string,
  description: string,
  rule: string,
  evidence: string[],
  action: FinancialHealthAction,
): FinancialHealthFactor {
  return {
    id,
    title,
    description,
    status: "unavailable",
    impact: "neutral",
    weight: FACTOR_WEIGHTS[id],
    points: null,
    rule,
    evidence,
    action,
  };
}


function availableFactor(
  id: FinancialHealthFactor["id"],
  title: string,
  description: string,
  points: number,
  rule: string,
  evidence: string[],
  action: FinancialHealthAction,
): FinancialHealthFactor {
  const weight = FACTOR_WEIGHTS[id];
  const bounded = clamp(Math.round(points), 0, weight);
  const ratio = weight === 0 ? 0 : bounded / weight;
  return {
    id,
    title,
    description,
    status: "available",
    impact: ratio >= 0.75 ? "positive" : ratio >= 0.4 ? "neutral" : "negative",
    weight,
    points: bounded,
    rule,
    evidence,
    action,
  };
}


function scoreActualBalance(
  sources: FinancialHealthSources,
  query: FinancialHealthQueryInput,
  currency: FinancialHealthCurrency,
): FinancialHealthFactor {
  const actual = sources.dashboard.summary.actual;
  const incomeRaw = currency === "ARS" ? actual.incomeArs : actual.incomeUsd;
  const expenseRaw = currency === "ARS" ? actual.expenseArs : actual.expenseUsd;
  const balanceRaw = currency === "ARS" ? actual.balanceArs : actual.balanceUsd;
  const savingsRate = currency === "ARS" ? actual.savingsRateArs : actual.savingsRateUsd;
  const income = parseMovementAmount(incomeRaw, currency);
  const expense = parseMovementAmount(expenseRaw, currency);
  const balance = parseMovementAmount(balanceRaw, currency);
  const action: FinancialHealthAction = {
    section: "movimientos",
    label: "Ver movimientos realizados",
    drilldown: {
      from: query.from,
      to: query.to,
      label: `Salud financiera: balance realizado ${currency}`,
      status: "actual",
      includeProjected: false,
    },
  };


  if (income === 0n && expense === 0n) {
    return unavailableFactor(
      "actual_balance",
      "Balance realizado",
      "Mide el resultado ya ocurrido y la tasa de ahorro cuando existe ingreso.",
      "Sin movimientos monetarios de la moneda, el factor no participa.",
      [`No hay ingresos ni egresos realizados en ${currency}.`],
      action,
    );
  }


  const rate = decimalPercentageToBasisPoints(savingsRate);
  let points = 0;
  if (balance < 0n) points = 0;
  else if (rate === null) points = 10;
  else if (rate >= 2_000) points = 20;
  else if (rate >= 1_000) points = 16;
  else if (rate >= 0) points = 12;


  return availableFactor(
    "actual_balance",
    "Balance realizado",
    "Mide el resultado ya ocurrido y la tasa de ahorro cuando existe ingreso.",
    points,
    "20 puntos con tasa de ahorro >= 20%; 16 con >= 10%; 12 con saldo no negativo; 0 con saldo negativo.",
    [
      `Ingresos realizados: ${formatEvidenceAmount(incomeRaw, currency)}.`,
      `Egresos realizados: ${formatEvidenceAmount(expenseRaw, currency)}.`,
      `Balance realizado: ${formatEvidenceAmount(balanceRaw, currency)}.`,
      `Tasa de ahorro: ${savingsRate === null ? "sin base comparable" : `${savingsRate}%`}.`,
    ],
    action,
  );
}


function scoreExpectedBalance(
  sources: FinancialHealthSources,
  query: FinancialHealthQueryInput,
  currency: FinancialHealthCurrency,
): FinancialHealthFactor {
  const expected = sources.dashboard.summary.expected;
  const incomeRaw = currency === "ARS" ? expected.incomeArs : expected.incomeUsd;
  const expenseRaw = currency === "ARS" ? expected.expenseArs : expected.expenseUsd;
  const balanceRaw = currency === "ARS" ? expected.balanceArs : expected.balanceUsd;
  const income = parseMovementAmount(incomeRaw, currency);
  const expense = parseMovementAmount(expenseRaw, currency);
  const balance = parseMovementAmount(balanceRaw, currency);
  const action: FinancialHealthAction = {
    section: "movimientos",
    label: "Ver realizados y esperados",
    drilldown: {
      from: query.from,
      to: query.to,
      label: `Salud financiera: balance esperado ${currency}`,
      includeProjected: true,
    },
  };


  if (income === 0n && expense === 0n) {
    return unavailableFactor(
      "expected_balance",
      "Balance esperado",
      "Evalúa si ingresos realizados y esperados cubren egresos y compromisos del período.",
      "Sin importes esperados de la moneda, el factor no participa.",
      [`No hay ingresos ni egresos esperados en ${currency}.`],
      action,
    );
  }


  const ratio = ratioBasisPoints(balance, income);
  let points = 0;
  if (balance < 0n) points = 0;
  else if (ratio === null) points = 10;
  else if (ratio >= 1_500) points = 20;
  else if (ratio >= 500) points = 14;
  else points = 8;


  return availableFactor(
    "expected_balance",
    "Balance esperado",
    "Evalúa si ingresos realizados y esperados cubren egresos y compromisos del período.",
    points,
    "20 puntos con margen esperado >= 15% del ingreso; 14 con >= 5%; 8 con saldo no negativo; 0 con saldo negativo.",
    [
      `Ingresos esperados: ${formatEvidenceAmount(incomeRaw, currency)}.`,
      `Egresos esperados: ${formatEvidenceAmount(expenseRaw, currency)}.`,
      `Balance esperado: ${formatEvidenceAmount(balanceRaw, currency)}.`,
    ],
    action,
  );
}


function scoreCommitmentCoverage(
  sources: FinancialHealthSources,
  currency: FinancialHealthCurrency,
): FinancialHealthFactor {
  const expectedIncomeRaw = currency === "ARS"
    ? sources.future.summary.expectedIncome.ars
    : sources.future.summary.expectedIncome.usd;
  const expectedCommitmentsRaw = currency === "ARS"
    ? sources.future.summary.expectedCommitments.ars
    : sources.future.summary.expectedCommitments.usd;
  const income = parseMovementAmount(expectedIncomeRaw, currency);
  const commitments = parseMovementAmount(expectedCommitmentsRaw, currency);
  const action: FinancialHealthAction = {
    section: "deuda",
    label: "Ver deuda e ingresos futuros",
  };


  if (income === 0n && commitments === 0n) {
    return unavailableFactor(
      "commitment_coverage",
      "Cobertura de compromisos",
      "Compara los ingresos esperados con los compromisos de los próximos tres meses.",
      "Sin ingresos ni compromisos futuros de la moneda, el factor no participa.",
      [`No hay componentes futuros en ${currency} para el horizonte evaluado.`],
      action,
    );
  }


  const coverage = commitments === 0n ? 100_000 : ratioBasisPoints(income, commitments) ?? 0;
  let points = 0;
  if (coverage >= 12_000) points = 20;
  else if (coverage >= 10_000) points = 16;
  else if (coverage >= 8_000) points = 10;
  else if (coverage >= 5_000) points = 5;


  return availableFactor(
    "commitment_coverage",
    "Cobertura de compromisos",
    "Compara los ingresos esperados con los compromisos de los próximos tres meses.",
    points,
    "20 puntos con cobertura >= 120%; 16 con >= 100%; 10 con >= 80%; 5 con >= 50%; 0 por debajo de 50%.",
    [
      `Ingresos futuros esperados: ${formatEvidenceAmount(expectedIncomeRaw, currency)}.`,
      `Compromisos futuros esperados: ${formatEvidenceAmount(expectedCommitmentsRaw, currency)}.`,
      `Cobertura: ${commitments === 0n ? "sin compromisos detectados" : `${Math.floor(coverage / 100)},${String(Math.abs(coverage % 100)).padStart(2, "0")}%`}.`,
    ],
    action,
  );
}


function scoreExpenseTrend(
  sources: FinancialHealthSources,
  query: FinancialHealthQueryInput,
  currency: FinancialHealthCurrency,
): FinancialHealthFactor {
  const changeRaw = currency === "ARS"
    ? sources.dashboard.comparison.expenseArs
    : sources.dashboard.comparison.expenseUsd;
  const change = decimalPercentageToBasisPoints(changeRaw);
  const action: FinancialHealthAction = {
    section: "reportes",
    label: "Ver evolución en Reportes",
  };


  if (change === null) {
    return unavailableFactor(
      "expense_trend",
      "Tendencia del gasto",
      "Compara el gasto realizado con el período calendario anterior equivalente.",
      "Sin período anterior comparable, el factor no participa.",
      [`No existe base comparable de gasto ${currency} para ${query.from} a ${query.to}.`],
      action,
    );
  }


  let points = 0;
  if (change <= 0) points = 15;
  else if (change <= 1_000) points = 12;
  else if (change <= 2_000) points = 8;
  else if (change <= 4_000) points = 4;


  return availableFactor(
    "expense_trend",
    "Tendencia del gasto",
    "Compara el gasto realizado con el período calendario anterior equivalente.",
    points,
    "15 puntos si el gasto no aumenta; 12 hasta +10%; 8 hasta +20%; 4 hasta +40%; 0 por encima de +40%.",
    [`Variación del gasto ${currency}: ${changeRaw}% respecto del período anterior.`],
    action,
  );
}


function scoreBudgetControl(
  sources: FinancialHealthSources,
  currency: FinancialHealthCurrency,
): FinancialHealthFactor {
  const overview = sources.budgets.currencies[currency];
  const action: FinancialHealthAction = {
    section: "presupuestos",
    label: "Ver presupuestos",
  };


  if (overview.budgetCount === 0) {
    return unavailableFactor(
      "budget_control",
      "Control presupuestario",
      "Mide el consumo agregado de los presupuestos activos aplicables al período.",
      "Sin presupuestos activos de la moneda, el factor no participa.",
      [`No hay presupuestos ${currency} aplicables al período.`],
      action,
    );
  }


  const usage = overview.usageBasisPoints;
  let points = 0;
  if (usage < 8_000) points = 15;
  else if (usage <= 10_000) points = 10;
  else if (usage <= 12_000) points = 4;


  return availableFactor(
    "budget_control",
    "Control presupuestario",
    "Mide el consumo agregado de los presupuestos activos aplicables al período.",
    points,
    "15 puntos con uso < 80%; 10 hasta 100%; 4 hasta 120%; 0 por encima de 120%.",
    [
      `Presupuestos participantes: ${overview.budgetCount}.`,
      `Uso agregado: ${overview.usagePercent}%.`,
      `Límite efectivo: ${formatEvidenceAmount(overview.effectiveLimit, currency)}.`,
      `Gastado: ${formatEvidenceAmount(overview.spent, currency)}.`,
    ],
    action,
  );
}


function scoreDataQuality(
  sources: FinancialHealthSources,
  query: FinancialHealthQueryInput,
): FinancialHealthFactor {
  const quality = sources.dashboard.dataQuality;
  const total = quality.actualRecords + quality.pendingRecords + quality.projectedRecords;
  const action: FinancialHealthAction = {
    section: "movimientos",
    label: "Revisar calidad del dato",
    drilldown: quality.unclassifiedRecords > 0 ? {
      from: query.from,
      to: query.to,
      label: "Salud financiera: movimientos sin clasificar",
      category: "Sin clasificar",
      includeProjected: true,
    } : {
      from: query.from,
      to: query.to,
      label: "Salud financiera: datos del período",
      includeProjected: true,
    },
  };


  if (total === 0) {
    return unavailableFactor(
      "data_quality",
      "Calidad del dato",
      "Evalúa clasificación y advertencias del horizonte futuro.",
      "Sin registros, el factor no participa.",
      ["No hay registros financieros en el período."],
      action,
    );
  }


  const classified = Math.max(0, total - quality.unclassifiedRecords);
  const classifiedBasisPoints = Math.round((classified * 10_000) / total);
  let points = Math.round((classifiedBasisPoints * 10) / 10_000);
  if (sources.future.dataQuality.status === "partial") points -= 2;
  points = clamp(points, 0, 10);


  return availableFactor(
    "data_quality",
    "Calidad del dato",
    "Evalúa clasificación y advertencias del horizonte futuro.",
    points,
    "Hasta 10 puntos según la proporción clasificada; se descuentan 2 si la deuda futura declara calidad parcial.",
    [
      `Registros evaluados: ${total}.`,
      `Movimientos sin clasificar: ${quality.unclassifiedRecords}.`,
      `Registros clasificados: ${classifiedBasisPoints / 100}%.`,
      `Calidad de deuda futura: ${sources.future.dataQuality.status}.`,
      ...sources.future.dataQuality.warnings.map((warning) => `Advertencia: ${warning}`),
    ],
    action,
  );
}


function historyMonthsForCurrency(
  sources: FinancialHealthSources,
  currency: FinancialHealthCurrency,
): number {
  return sources.dashboard.monthlyEvolution.filter((month) => {
    const income = parseMovementAmount(currency === "ARS" ? month.incomeArs : month.incomeUsd, currency);
    const expense = parseMovementAmount(currency === "ARS" ? month.expenseArs : month.expenseUsd, currency);
    return income !== 0n || expense !== 0n;
  }).length;
}


function bandFor(score: number | null): Pick<FinancialHealthCurrencyResult, "band" | "bandLabel"> {
  if (score === null) return { band: "not_calculated", bandLabel: "No calculado" };
  if (score >= 80) return { band: "favorable", bandLabel: "Resultado favorable" };
  if (score >= 60) return { band: "stable", bandLabel: "Resultado estable con atención" };
  if (score >= 40) return { band: "exposed", bandLabel: "Resultado expuesto" };
  return { band: "compromised", bandLabel: "Resultado comprometido" };
}


function confidenceLabel(basisPoints: number, calculated: boolean): {
  label: FinancialHealthConfidenceLabel;
  labelText: string;
} {
  if (!calculated) return { label: "insufficient", labelText: "Evidencia insuficiente" };
  if (basisPoints >= 8_000) return { label: "high", labelText: "Confianza alta" };
  if (basisPoints >= 6_000) return { label: "medium", labelText: "Confianza media" };
  return { label: "low", labelText: "Confianza baja" };
}


function calculateCurrency(
  sources: FinancialHealthSources,
  query: FinancialHealthQueryInput,
  currency: FinancialHealthCurrency,
): FinancialHealthCurrencyResult {
  const factors = [
    scoreActualBalance(sources, query, currency),
    scoreExpectedBalance(sources, query, currency),
    scoreCommitmentCoverage(sources, currency),
    scoreExpenseTrend(sources, query, currency),
    scoreBudgetControl(sources, currency),
    scoreDataQuality(sources, query),
  ];
  const available = factors.filter((factor) => factor.status === "available");
  const availableWeight = available.reduce((sum, factor) => sum + factor.weight, 0);
  const earnedPoints = available.reduce((sum, factor) => sum + (factor.points ?? 0), 0);
  const quality = sources.dashboard.dataQuality;
  const totalRecords = quality.actualRecords + quality.pendingRecords + quality.projectedRecords;
  const historyMonths = historyMonthsForCurrency(sources, currency);
  const classified = Math.max(0, totalRecords - quality.unclassifiedRecords);
  const classifiedBasisPoints = totalRecords > 0
    ? Math.round((classified * 10_000) / totalRecords)
    : 0;
  const actual = sources.dashboard.summary.actual;
  const expected = sources.dashboard.summary.expected;
  const hasCurrencyEvidence = [
    currency === "ARS" ? actual.incomeArs : actual.incomeUsd,
    currency === "ARS" ? actual.expenseArs : actual.expenseUsd,
    currency === "ARS" ? expected.incomeArs : expected.incomeUsd,
    currency === "ARS" ? expected.expenseArs : expected.expenseUsd,
  ].some((value) => parseMovementAmount(value, currency) !== 0n);


  const blockers: string[] = [];
  if (!hasCurrencyEvidence) blockers.push(`No hay importes ${currency} en el período evaluado.`);
  if (totalRecords < 3) blockers.push("Se requieren al menos 3 registros financieros en el período.");
  if (availableWeight < 50) blockers.push("La fórmula requiere al menos 50 puntos de factores disponibles.");


  const calculated = blockers.length === 0;
  const score = calculated && availableWeight > 0
    ? clamp(Math.round((earnedPoints * 100) / availableWeight), 0, 100)
    : null;


  const coverageEvidence = availableWeight * 100;
  const recordEvidence = totalRecords >= 20 ? 10_000
    : totalRecords >= 10 ? 9_000
      : totalRecords >= 5 ? 7_000
        : totalRecords >= 3 ? 5_000
          : 0;
  const historyEvidence = historyMonths >= 6 ? 10_000
    : historyMonths >= 3 ? 8_000
      : historyMonths === 2 ? 6_000
        : historyMonths === 1 ? 4_000
          : 0;
  let confidenceBasisPoints = Math.round(
    (coverageEvidence + recordEvidence + historyEvidence + classifiedBasisPoints) / 4,
  );
  if (sources.future.dataQuality.status === "partial") {
    confidenceBasisPoints = Math.min(confidenceBasisPoints, 7_500);
  }
  if (!calculated) confidenceBasisPoints = Math.min(confidenceBasisPoints, 4_999);
  const confidence = confidenceLabel(confidenceBasisPoints, calculated);
  const band = bandFor(score);


  return {
    currency,
    status: calculated ? "calculated" : "insufficient_data",
    score,
    ...band,
    confidence: {
      ...confidence,
      basisPoints: confidenceBasisPoints,
      availableWeight,
      recordEvidence: totalRecords,
      historyMonths,
      classifiedBasisPoints,
    },
    availableWeight,
    earnedPoints,
    factors,
    blockers,
  };
}


function storedEvaluation(snapshot: StoredSnapshot): FinancialHealthEvaluation | null {
  try {
    return JSON.parse(snapshot.resultJson) as FinancialHealthEvaluation;
  } catch {
    return null;
  }
}


function toHistoryItem(snapshot: StoredSnapshot): FinancialHealthHistoryItem | null {
  const evaluation = storedEvaluation(snapshot);
  if (!evaluation) return null;
  return {
    id: snapshot.id,
    period: { from: snapshot.periodFrom, to: snapshot.periodTo },
    formulaVersion: snapshot.formulaVersion,
    sourceFingerprint: snapshot.sourceFingerprint,
    savedAt: snapshot.createdAt.toISOString(),
    currencies: {
      ARS: {
        status: evaluation.currencies.ARS.status,
        score: evaluation.currencies.ARS.score,
        bandLabel: evaluation.currencies.ARS.bandLabel,
        confidenceLabel: evaluation.currencies.ARS.confidence.labelText,
      },
      USD: {
        status: evaluation.currencies.USD.status,
        score: evaluation.currencies.USD.score,
        bandLabel: evaluation.currencies.USD.bandLabel,
        confidenceLabel: evaluation.currencies.USD.confidence.labelText,
      },
    },
  };
}


function compareWithSnapshot(
  current: FinancialHealthEvaluation,
  snapshot: StoredSnapshot | undefined,
): FinancialHealthComparison | null {
  if (!snapshot) return null;
  const previous = storedEvaluation(snapshot);
  if (!previous || previous.formula.version !== current.formula.version) return null;


  const compareCurrency = (currency: FinancialHealthCurrency) => {
    const currentResult = current.currencies[currency];
    const previousResult = previous.currencies[currency];
    const previousById = new Map(previousResult.factors.map((factor) => [factor.id, factor]));
    return {
      scoreDelta: currentResult.score !== null && previousResult.score !== null
        ? currentResult.score - previousResult.score
        : null,
      previousScore: previousResult.score,
      factorChanges: currentResult.factors.map((factor) => {
        const prior = previousById.get(factor.id);
        return {
          factorId: factor.id,
          previousPoints: prior?.points ?? null,
          currentPoints: factor.points,
          delta: prior?.points !== null && prior?.points !== undefined && factor.points !== null
            ? factor.points - prior.points
            : null,
        };
      }),
    };
  };


  return {
    snapshotId: snapshot.id,
    period: { from: snapshot.periodFrom, to: snapshot.periodTo },
    savedAt: snapshot.createdAt.toISOString(),
    currencies: {
      ARS: compareCurrency("ARS"),
      USD: compareCurrency("USD"),
    },
  };
}


export function calculateFinancialHealth(
  sources: FinancialHealthSources,
  query: FinancialHealthQueryInput,
  evaluatedAt = new Date().toISOString(),
): FinancialHealthEvaluation {
  const sourceFingerprint = fingerprint({
    formulaVersion: FINANCIAL_HEALTH_FORMULA_VERSION,
    query,
    dashboard: {
      summary: sources.dashboard.summary,
      comparison: sources.dashboard.comparison,
      monthlyEvolution: sources.dashboard.monthlyEvolution,
      dataQuality: sources.dashboard.dataQuality,
    },
    budgets: {
      participantCount: sources.budgets.participantCount,
      activeCount: sources.budgets.activeCount,
      attentionCount: sources.budgets.attentionCount,
      exceededCount: sources.budgets.exceededCount,
      currencies: sources.budgets.currencies,
    },
    goals: {
      statusCounts: sources.goals.statusCounts,
      nearestActiveTargetDate: sources.goals.nearestActiveTargetDate,
      currencies: sources.goals.currencies,
    },
    future: {
      summary: {
        expectedIncome: sources.future.summary.expectedIncome,
        expectedCommitments: sources.future.summary.expectedCommitments,
      },
      dataQuality: sources.future.dataQuality,
    },
  });


  return {
    formula: {
      version: FINANCIAL_HEALTH_FORMULA_VERSION,
      title: "Salud financiera determinística",
      description: "Puntaje reproducible basado únicamente en datos estructurados y reglas visibles. ARS y USD se evalúan por separado.",
      scoreRange: { minimum: 0, maximum: 100 },
      weights: Object.entries(FACTOR_WEIGHTS).map(([factorId, weight]) => ({
        factorId: factorId as FinancialHealthFactor["id"],
        weight,
      })),
      minimumRequirements: [
        "Al menos 3 registros financieros en el período.",
        "Evidencia monetaria para la moneda evaluada.",
        "Al menos 50 puntos de factores disponibles.",
      ],
    },
    period: query,
    evaluatedAt,
    sourceFingerprint,
    currencies: {
      ARS: calculateCurrency(sources, query, "ARS"),
      USD: calculateCurrency(sources, query, "USD"),
    },
    goalsContext: {
      note: "Los objetivos aportan contexto de planificación, pero no suman ni restan puntos para evitar premiar aportes que no representan reservas de saldo.",
      activeGoals: sources.goals.statusCounts.active,
      nearestActiveTargetDate: sources.goals.nearestActiveTargetDate,
      currencies: {
        ARS: {
          targetAmount: sources.goals.currencies.ARS.targetAmount,
          contributedAmount: sources.goals.currencies.ARS.contributedAmount,
          remainingAmount: sources.goals.currencies.ARS.remainingAmount,
          progressPercent: sources.goals.currencies.ARS.progressPercent,
        },
        USD: {
          targetAmount: sources.goals.currencies.USD.targetAmount,
          contributedAmount: sources.goals.currencies.USD.contributedAmount,
          remainingAmount: sources.goals.currencies.USD.remainingAmount,
          progressPercent: sources.goals.currencies.USD.progressPercent,
        },
      },
    },
    comparison: null,
    disclaimer: "Este resultado describe reglas sobre los datos cargados en CajaApp. No constituye asesoramiento financiero ni predice resultados futuros.",
  };
}


export class FinancialHealthService {
  private async collectSources(query: FinancialHealthQueryInput): Promise<FinancialHealthSources> {
    const futureFrom = query.to.slice(0, 7);
    const [dashboard, budgets, goals, future] = await Promise.all([
      dashboardService.getOverview(query),
      budgetsService.overview({
        from: query.from.slice(0, 7),
        to: query.to.slice(0, 7),
        status: "active",
      }),
      goalsService.overview({ status: "active", limit: 4 }),
      futureService.getOverview({ from: futureFrom, months: 3 }),
    ]);
    return { dashboard, budgets, goals, future };
  }


  private async snapshots(limit = 12): Promise<StoredSnapshot[]> {
    return prisma.financialHealthSnapshot.findMany({
      where: { formulaVersion: FINANCIAL_HEALTH_FORMULA_VERSION },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    }) as Promise<StoredSnapshot[]>;
  }


  async history(limit = 12): Promise<FinancialHealthHistoryItem[]> {
    const snapshots = await this.snapshots(limit);
    return snapshots
      .map(toHistoryItem)
      .filter((item): item is FinancialHealthHistoryItem => item !== null);
  }


  async evaluate(query: FinancialHealthQueryInput, historyLimit = 12): Promise<FinancialHealthResponse> {
    const sources = await this.collectSources(query);
    const evaluation = calculateFinancialHealth(sources, query);
    const snapshots = await this.snapshots(Math.max(historyLimit, 20));
    const previous = snapshots.find((snapshot) => snapshot.sourceFingerprint !== evaluation.sourceFingerprint);
    evaluation.comparison = compareWithSnapshot(evaluation, previous);
    return {
      evaluation,
      history: snapshots.slice(0, historyLimit)
        .map(toHistoryItem)
        .filter((item): item is FinancialHealthHistoryItem => item !== null),
      snapshotId: null,
      snapshotCreated: false,
    };
  }


  async saveSnapshot(query: FinancialHealthQueryInput, historyLimit = 12): Promise<FinancialHealthResponse> {
    const response = await this.evaluate(query, historyLimit);
    const evaluation = response.evaluation;
    const existing = await prisma.financialHealthSnapshot.findUnique({
      where: {
        periodFrom_periodTo_formulaVersion_sourceFingerprint: {
          periodFrom: query.from,
          periodTo: query.to,
          formulaVersion: FINANCIAL_HEALTH_FORMULA_VERSION,
          sourceFingerprint: evaluation.sourceFingerprint,
        },
      },
    });
    const snapshot = existing ?? await prisma.financialHealthSnapshot.create({
      data: {
        periodFrom: query.from,
        periodTo: query.to,
        formulaVersion: FINANCIAL_HEALTH_FORMULA_VERSION,
        sourceFingerprint: evaluation.sourceFingerprint,
        resultJson: JSON.stringify(evaluation),
      },
    });
    return {
      ...response,
      snapshotId: snapshot.id,
      snapshotCreated: !existing,
      history: await this.history(historyLimit),
    };
  }


  async deleteSnapshot(snapshotId: string): Promise<{ success: true }> {
    const existing = await prisma.financialHealthSnapshot.findUnique({ where: { id: snapshotId } });
    if (!existing) throw new NotFoundError("Financial health snapshot");
    await prisma.financialHealthSnapshot.delete({ where: { id: snapshotId } });
    return { success: true };
  }
}


export const financialHealthService = new FinancialHealthService();