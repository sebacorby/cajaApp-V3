import { prisma } from "../../db/prisma.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import { formatMovementAmount, movementsService, parseMovementAmount } from "../movements/movements.service.js";
import type { BudgetCurrency, BudgetStatus, CreateBudgetInput, ListBudgetsQueryInput, UpdateBudgetInput } from "./budgets.schemas.js";


type PersistedBudget = {
  id: string;
  categoryId: string;
  category: { id: string; name: string; color: string; icon: string; active: boolean };
  currency: string;
  periodStart: string;
  periodEnd: string;
  limitAmountRaw: string;
  rolloverEnabled: boolean;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};


type BudgetCalculation = ReturnType<typeof createCalculation>;


export type BudgetOverviewItem = {
  currency: BudgetCurrency;
  effectiveLimit: string;
  spentAmount: string;
  status: BudgetStatus;
  usageBasisPoints: number;
};


type BudgetOverviewAccumulator = {
  budgetCount: number;
  effectiveLimit: bigint;
  spent: bigint;
};


function normalizeCurrency(value: string): BudgetCurrency {
  if (value === "ARS" || value === "USD") return value;
  throw new ValidationError(`Unsupported budget currency: ${value}`);
}
function normalizeStatus(value: string): BudgetStatus {
  if (value === "active" || value === "paused" || value === "closed") return value;
  throw new ValidationError(`Unsupported budget status: ${value}`);
}
function parsePositiveAmount(value: string, currency: BudgetCurrency): bigint {
  const cents = parseMovementAmount(value, currency, false);
  if (cents <= 0n) throw new ValidationError("Budget limit must be greater than zero");
  return cents;
}
function firstDay(month: string) { return `${month}-01`; }
function lastDay(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value, 0)).toISOString().slice(0, 10);
}
function nextMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}
function usageBasisPoints(spent: bigint, effectiveLimit: bigint) {
  if (effectiveLimit <= 0n) return 0;
  return Number((spent * 10_000n + effectiveLimit / 2n) / effectiveLimit);
}
function createCalculation(budget: PersistedBudget, spent: bigint, rollover: bigint) {
  const currency = normalizeCurrency(budget.currency);
  const baseLimit = parsePositiveAmount(budget.limitAmountRaw, currency);
  const effectiveLimit = baseLimit + rollover;
  const available = effectiveLimit - spent;
  const usage = usageBasisPoints(spent, effectiveLimit);
  const status = normalizeStatus(budget.status);
  const alert = status !== "active" ? null : usage >= 10_000 ? {
    rule: "budget_usage_gte_100_percent",
    severity: "critical" as const,
    message: `El presupuesto de ${budget.category.name} está excedido.`,
    thresholdPercent: 100,
  } : usage >= 8_000 ? {
    rule: "budget_usage_gte_80_percent",
    severity: "warning" as const,
    message: `El presupuesto de ${budget.category.name} alcanzó al menos el 80%.`,
    thresholdPercent: 80,
  } : null;
  return { currency, baseLimit, rollover, effectiveLimit, spent, available, usage, status, alert };
}


export function calculateBudgetUsage(spent: bigint, effectiveLimit: bigint) {
  const basisPoints = usageBasisPoints(spent, effectiveLimit);
  return { basisPoints, percent: `${Math.floor(basisPoints / 100)}.${String(basisPoints % 100).padStart(2, "0")}` };
}


function emptyBudgetOverviewAccumulator(): BudgetOverviewAccumulator {
  return { budgetCount: 0, effectiveLimit: 0n, spent: 0n };
}


function serializeBudgetOverviewCurrency(
  accumulator: BudgetOverviewAccumulator,
  currency: BudgetCurrency,
) {
  const available = accumulator.effectiveLimit > accumulator.spent
    ? accumulator.effectiveLimit - accumulator.spent
    : 0n;
  const exceeded = accumulator.spent > accumulator.effectiveLimit
    ? accumulator.spent - accumulator.effectiveLimit
    : 0n;
  const usage = calculateBudgetUsage(accumulator.spent, accumulator.effectiveLimit);


  return {
    budgetCount: accumulator.budgetCount,
    effectiveLimit: formatMovementAmount(accumulator.effectiveLimit, currency),
    spent: formatMovementAmount(accumulator.spent, currency),
    available: formatMovementAmount(available, currency),
    exceeded: formatMovementAmount(exceeded, currency),
    usageBasisPoints: usage.basisPoints,
    usagePercent: usage.percent,
  };
}


export function buildBudgetOverview(
  budgets: BudgetOverviewItem[],
  query: ListBudgetsQueryInput = {},
) {
  const totals: Record<BudgetCurrency, BudgetOverviewAccumulator> = {
    ARS: emptyBudgetOverviewAccumulator(),
    USD: emptyBudgetOverviewAccumulator(),
  };


  let activeCount = 0;
  let attentionCount = 0;
  let exceededCount = 0;


  for (const budget of budgets) {
    const currency = normalizeCurrency(budget.currency);
    const accumulator = totals[currency];
    accumulator.budgetCount += 1;
    accumulator.effectiveLimit += parseMovementAmount(
      budget.effectiveLimit,
      currency,
      false,
    );
    accumulator.spent += parseMovementAmount(
      budget.spentAmount,
      currency,
      false,
    );


    if (budget.status === "active") {
      activeCount += 1;
      if (budget.usageBasisPoints >= 10_000) exceededCount += 1;
      else if (budget.usageBasisPoints >= 8_000) attentionCount += 1;
    }
  }


  return {
    filter: {
      from: query.from ?? null,
      to: query.to ?? null,
      status: query.status ?? null,
    },
    participantCount: budgets.length,
    activeCount,
    attentionCount,
    exceededCount,
    currencies: {
      ARS: serializeBudgetOverviewCurrency(totals.ARS, "ARS"),
      USD: serializeBudgetOverviewCurrency(totals.USD, "USD"),
    },
  };
}


function mapBudget(budget: PersistedBudget, calculation: BudgetCalculation) {
  const progress = calculateBudgetUsage(calculation.spent, calculation.effectiveLimit);
  return {
    id: budget.id,
    category: budget.category,
    currency: calculation.currency,
    periodStart: budget.periodStart,
    periodEnd: budget.periodEnd,
    limitAmount: formatMovementAmount(calculation.baseLimit, calculation.currency),
    rolloverEnabled: budget.rolloverEnabled,
    rolloverAmount: formatMovementAmount(calculation.rollover, calculation.currency),
    effectiveLimit: formatMovementAmount(calculation.effectiveLimit, calculation.currency),
    spentAmount: formatMovementAmount(calculation.spent, calculation.currency),
    availableAmount: formatMovementAmount(calculation.available, calculation.currency),
    usageBasisPoints: progress.basisPoints,
    usagePercent: progress.percent,
    status: calculation.status,
    notes: budget.notes,
    alert: calculation.alert ? {
      ...calculation.alert,
      evidence: {
        spentAmount: formatMovementAmount(calculation.spent, calculation.currency),
        effectiveLimit: formatMovementAmount(calculation.effectiveLimit, calculation.currency),
        usagePercent: progress.percent,
        currency: calculation.currency,
      },
    } : null,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}


async function requireCategory(categoryId: string) {
  const category = await prisma.movementCategory.findUnique({ where: { id: categoryId } });
  if (!category || !category.active) throw new ValidationError("Budget category must exist and be active");
  return category;
}


async function requireBudget(id: string): Promise<PersistedBudget> {
  const budget = await prisma.categoryBudget.findUnique({ where: { id }, include: { category: true } });
  if (!budget) throw new NotFoundError("Budget");
  return budget as PersistedBudget;
}


async function ensureNoOverlap(input: { id?: string; categoryId: string; currency: string; periodStart: string; periodEnd: string }) {
  const candidates = await prisma.categoryBudget.findMany({
    where: { categoryId: input.categoryId, currency: input.currency, ...(input.id ? { id: { not: input.id } } : {}) },
    select: { periodStart: true, periodEnd: true },
  });
  if (candidates.some((item) => overlaps(input.periodStart, input.periodEnd, item.periodStart, item.periodEnd))) {
    throw new ValidationError("A budget already covers part of this category, currency and period");
  }
}


async function spentForBudget(budget: PersistedBudget): Promise<bigint> {
  const currency = normalizeCurrency(budget.currency);
  const movements = await movementsService.getAllMovements({
    from: firstDay(budget.periodStart),
    to: lastDay(budget.periodEnd),
    type: "expense",
    category: budget.categoryId,
    status: "actual",
    currency,
    includeProjected: false,
  });
  return movements.reduce((sum, movement) => sum + parseMovementAmount(movement.amount, currency, false), 0n);
}


async function calculateAll(budgets: PersistedBudget[]) {
  const result = new Map<string, BudgetCalculation>();
  const ordered = [...budgets].sort((a, b) => a.periodStart.localeCompare(b.periodStart) || a.createdAt.getTime() - b.createdAt.getTime());
  for (const budget of ordered) {
    const spent = await spentForBudget(budget);
    let rollover = 0n;
    if (budget.rolloverEnabled) {
      const previous = ordered
        .filter((candidate) => candidate.id !== budget.id && candidate.categoryId === budget.categoryId && candidate.currency === budget.currency && nextMonth(candidate.periodEnd) === budget.periodStart)
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
      const previousCalculation = previous ? result.get(previous.id) : undefined;
      if (previousCalculation?.available && previousCalculation.available > 0n) rollover = previousCalculation.available;
    }
    result.set(budget.id, createCalculation(budget, spent, rollover));
  }
  return result;
}


export class BudgetsService {
  async list(query: ListBudgetsQueryInput = {}) {
    // Rollover depends on the complete contiguous history. Fetch all budgets for
    // calculation first and apply presentation filters only after the chain is resolved.
    const allBudgets = await prisma.categoryBudget.findMany({
      include: { category: true },
      orderBy: [{ periodStart: "asc" }, { createdAt: "asc" }],
    }) as PersistedBudget[];
    const calculations = await calculateAll(allBudgets);
    return allBudgets
      .filter((budget) => !query.status || budget.status === query.status)
      .filter((budget) => !query.to || budget.periodStart <= query.to)
      .filter((budget) => !query.from || budget.periodEnd >= query.from)
      .sort((left, right) =>
        right.periodStart.localeCompare(left.periodStart)
        || left.category.name.localeCompare(right.category.name, "es"),
      )
      .map((budget) => mapBudget(budget, calculations.get(budget.id)!));
  }


  async overview(query: ListBudgetsQueryInput = {}) {
    return buildBudgetOverview(await this.list(query), query);
  }


  async create(input: CreateBudgetInput) {
    await requireCategory(input.categoryId);
    const limit = parsePositiveAmount(input.limitAmount, input.currency);
    await ensureNoOverlap(input);
    const created = await prisma.categoryBudget.create({
      data: {
        categoryId: input.categoryId,
        currency: input.currency,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        limitAmountRaw: formatMovementAmount(limit, input.currency),
        rolloverEnabled: input.rolloverEnabled,
        status: input.status,
        notes: input.notes || null,
      },
      include: { category: true },
    }) as PersistedBudget;
    return (await this.list()).find((item) => item.id === created.id)!;
  }


  async update(id: string, input: UpdateBudgetInput) {
    const existing = await requireBudget(id);
    if (normalizeStatus(existing.status) === "closed") throw new ValidationError("Closed budgets cannot be edited");
    const categoryId = input.categoryId ?? existing.categoryId;
    const currency = input.currency ?? normalizeCurrency(existing.currency);
    const periodStart = input.periodStart ?? existing.periodStart;
    const periodEnd = input.periodEnd ?? existing.periodEnd;
    if (periodEnd < periodStart) throw new ValidationError("Period end must be equal to or after its start");
    await requireCategory(categoryId);
    await ensureNoOverlap({ id, categoryId, currency, periodStart, periodEnd });
    const limitAmountRaw = input.limitAmount ? formatMovementAmount(parsePositiveAmount(input.limitAmount, currency), currency) : undefined;
    await prisma.categoryBudget.update({
      where: { id },
      data: {
        categoryId,
        currency,
        periodStart,
        periodEnd,
        ...(limitAmountRaw ? { limitAmountRaw } : {}),
        ...(input.rolloverEnabled !== undefined ? { rolloverEnabled: input.rolloverEnabled } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      },
    });
    return (await this.list()).find((item) => item.id === id)!;
  }


  async changeStatus(id: string, status: BudgetStatus) {
    const existing = await requireBudget(id);
    if (existing.status === "closed") throw new ValidationError("Closed budgets cannot change status");
    await prisma.categoryBudget.update({ where: { id }, data: { status } });
    return (await this.list()).find((item) => item.id === id)!;
  }


  async delete(id: string) {
    await requireBudget(id);
    await prisma.categoryBudget.delete({ where: { id } });
    return { success: true };
  }
}


export const budgetsService = new BudgetsService();