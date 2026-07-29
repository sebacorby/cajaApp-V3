import { prisma } from "../../db/prisma.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import type {
  ChangeGoalStatusInput,
  CreateGoalContributionInput,
  CreateGoalInput,
  GoalCurrency,
  GoalStatus,
  UpdateGoalInput,
} from "./goals.schemas.js";


interface PersistedContribution {
  id: string;
  goalId: string;
  contributedOn: string;
  amountRaw: string;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
}


interface PersistedActivity {
  id: string;
  goalId: string;
  kind: string;
  detailJson: string | null;
  createdAt: Date;
}


interface PersistedGoal {
  id: string;
  name: string;
  targetAmountRaw: string;
  currency: string;
  targetDate: string | null;
  status: string;
  notes: string | null;
  completedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contributions: PersistedContribution[];
  activities: PersistedActivity[];
}


const MUTABLE_STATUSES = new Set<GoalStatus>(["active", "paused"]);


function normalizeCurrency(value: string): GoalCurrency {
  if (value === "ARS" || value === "USD") return value;
  throw new ValidationError(`Unsupported goal currency: ${value}`);
}


function normalizeGoalDecimal(value: string, currency: GoalCurrency): {
  integerDigits: string;
  fractionDigits: string;
} {
  const compact = value.trim().replace(/\s/g, "");
  const match = compact.match(/^\+?([0-9.,]+)$/);
  if (!match) throw new ValidationError(`Invalid ${currency} goal amount: ${value}`);


  let body = match[1];
  let decimalSeparator: "." | "," | null = null;


  if (body.includes(".") && body.includes(",")) {
    decimalSeparator = currency === "ARS" ? "," : ".";
  } else if (body.includes(",")) {
    const parts = body.split(",");
    if (parts.length > 2) {
      if (currency === "USD") body = parts.join("");
      else throw new ValidationError(`Invalid ${currency} goal amount: ${value}`);
    } else {
      const tail = parts[1] ?? "";
      decimalSeparator = tail.length <= 2 ? "," : null;
    }
  } else if (body.includes(".")) {
    const parts = body.split(".");
    if (parts.length > 2) {
      if (currency === "ARS") body = parts.join("");
      else throw new ValidationError(`Invalid ${currency} goal amount: ${value}`);
    } else {
      const tail = parts[1] ?? "";
      decimalSeparator = tail.length <= 2 ? "." : null;
    }
  }


  let integerPart = body;
  let fractionPart = "";
  if (decimalSeparator) {
    const index = body.lastIndexOf(decimalSeparator);
    integerPart = body.slice(0, index);
    fractionPart = body.slice(index + 1);
  }


  const groupingSeparator = decimalSeparator
    ? decimalSeparator === "," ? "." : ","
    : currency === "ARS" ? "." : ",";
  integerPart = integerPart.split(groupingSeparator).join("");


  if (!/^\d+$/.test(integerPart) || !/^\d{0,2}$/.test(fractionPart)) {
    throw new ValidationError(`Invalid ${currency} goal amount: ${value}`);
  }


  return {
    integerDigits: integerPart.replace(/^0+(?=\d)/, "") || "0",
    fractionDigits: fractionPart.padEnd(2, "0"),
  };
}


function parseGoalCents(value: string, currency: string): bigint {
  const normalizedCurrency = normalizeCurrency(currency);
  const normalized = normalizeGoalDecimal(value, normalizedCurrency);
  return BigInt(normalized.integerDigits) * 100n
    + BigInt(normalized.fractionDigits || "0");
}


export function parseGoalAmount(value: string, currency: string): bigint {
  const cents = parseGoalCents(value, currency);
  if (cents <= 0n) {
    throw new ValidationError("Goal amounts must be greater than zero");
  }
  return cents;
}


function parseNonNegativeGoalAmount(
  value: string,
  currency: GoalCurrency,
): bigint {
  const cents = parseGoalCents(value, currency);
  if (cents < 0n) {
    throw new ValidationError("Goal amounts cannot be negative");
  }
  return cents;
}


export function formatGoalCents(cents: bigint, currency: GoalCurrency): string {
  const absolute = cents < 0n ? -cents : cents;
  const integerPart = (absolute / 100n).toString();
  const fractionPart = (absolute % 100n).toString().padStart(2, "0");
  const groupingSeparator = currency === "ARS" ? "." : ",";
  const decimalSeparator = currency === "ARS" ? "," : ".";
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupingSeparator);
  return `${cents < 0n ? "-" : ""}${grouped}${decimalSeparator}${fractionPart}`;
}


export function calculateGoalProgress(contributed: bigint, target: bigint) {
  if (target <= 0n) throw new ValidationError("Goal target must be greater than zero");
  const bounded = contributed < 0n ? 0n : contributed;
  const basisPoints = Number((bounded * 10_000n + target / 2n) / target);
  return {
    basisPoints,
    percent: `${Math.floor(basisPoints / 100)}.${String(basisPoints % 100).padStart(2, "0")}`,
  };
}


function normalizeStatus(value: string): GoalStatus {
  if (value === "active" || value === "paused" || value === "completed" || value === "closed") return value;
  throw new ValidationError(`Unsupported goal status: ${value}`);
}


function parseActivityDetail(detailJson: string | null): unknown {
  if (!detailJson) return null;
  try { return JSON.parse(detailJson); } catch { return null; }
}


function mapGoal(goal: PersistedGoal) {
  const currency = normalizeCurrency(goal.currency);
  const target = parseGoalAmount(goal.targetAmountRaw, currency);
  const contributed = goal.contributions.reduce(
    (sum, contribution) => sum + parseGoalAmount(contribution.amountRaw, currency),
    0n,
  );
  const remaining = target > contributed ? target - contributed : 0n;
  const progress = calculateGoalProgress(contributed, target);


  return {
    id: goal.id,
    name: goal.name,
    targetAmount: formatGoalCents(target, currency),
    contributedAmount: formatGoalCents(contributed, currency),
    remainingAmount: formatGoalCents(remaining, currency),
    progressBasisPoints: progress.basisPoints,
    progressPercent: progress.percent,
    currency,
    targetDate: goal.targetDate,
    status: normalizeStatus(goal.status),
    notes: goal.notes,
    completedAt: goal.completedAt?.toISOString() ?? null,
    closedAt: goal.closedAt?.toISOString() ?? null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
    contributions: goal.contributions.map((contribution) => ({
      id: contribution.id,
      goalId: contribution.goalId,
      contributedOn: contribution.contributedOn,
      amount: contribution.amountRaw,
      notes: contribution.notes,
      referenceType: contribution.referenceType,
      referenceId: contribution.referenceId,
      referenceLabel: contribution.referenceLabel,
      createdAt: contribution.createdAt.toISOString(),
      updatedAt: contribution.updatedAt.toISOString(),
    })),
    history: goal.activities.map((activity) => ({
      id: activity.id,
      kind: activity.kind,
      detail: parseActivityDetail(activity.detailJson),
      createdAt: activity.createdAt.toISOString(),
    })),
  };
}


export type GoalOverviewItem = {
  id: string;
  name: string;
  targetAmount: string;
  contributedAmount: string;
  remainingAmount: string;
  progressBasisPoints: number;
  progressPercent: string;
  currency: GoalCurrency;
  targetDate: string | null;
  status: GoalStatus;
};


export type GoalsOverviewQuery = {
  status?: GoalStatus;
  limit?: number;
};


type GoalOverviewAccumulator = {
  goalCount: number;
  target: bigint;
  contributed: bigint;
  remaining: bigint;
};


function emptyGoalAccumulator(): GoalOverviewAccumulator {
  return {
    goalCount: 0,
    target: 0n,
    contributed: 0n,
    remaining: 0n,
  };
}


function serializeGoalOverviewCurrency(
  accumulator: GoalOverviewAccumulator,
  currency: GoalCurrency,
) {
  const progress = accumulator.target > 0n
    ? calculateGoalProgress(accumulator.contributed, accumulator.target)
    : { basisPoints: 0, percent: "0.00" };


  return {
    goalCount: accumulator.goalCount,
    targetAmount: formatGoalCents(accumulator.target, currency),
    contributedAmount: formatGoalCents(accumulator.contributed, currency),
    remainingAmount: formatGoalCents(accumulator.remaining, currency),
    progressBasisPoints: progress.basisPoints,
    progressPercent: progress.percent,
  };
}


function compareFeaturedGoals(
  left: GoalOverviewItem,
  right: GoalOverviewItem,
): number {
  if (left.targetDate && right.targetDate) {
    const byDate = left.targetDate.localeCompare(right.targetDate);
    if (byDate !== 0) return byDate;
  } else if (left.targetDate) {
    return -1;
  } else if (right.targetDate) {
    return 1;
  }


  const byProgress = left.progressBasisPoints - right.progressBasisPoints;
  if (byProgress !== 0) return byProgress;


  const byName = left.name.localeCompare(right.name, "es");
  if (byName !== 0) return byName;
  return left.id.localeCompare(right.id);
}


export function buildGoalsOverview(
  goals: GoalOverviewItem[],
  allGoals: GoalOverviewItem[] = goals,
  query: GoalsOverviewQuery = {},
) {
  const limit = query.limit ?? 4;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new ValidationError("Goal overview limit must be an integer between 1 and 20");
  }


  const totals: Record<GoalCurrency, GoalOverviewAccumulator> = {
    ARS: emptyGoalAccumulator(),
    USD: emptyGoalAccumulator(),
  };


  for (const goal of goals) {
    const currency = normalizeCurrency(goal.currency);
    const accumulator = totals[currency];
    accumulator.goalCount += 1;
    accumulator.target += parseGoalAmount(goal.targetAmount, currency);
    accumulator.contributed += parseNonNegativeGoalAmount(
      goal.contributedAmount,
      currency,
    );
    accumulator.remaining += parseNonNegativeGoalAmount(
      goal.remainingAmount,
      currency,
    );
  }


  const statusCounts: Record<GoalStatus, number> = {
    active: 0,
    paused: 0,
    completed: 0,
    closed: 0,
  };
  for (const goal of allGoals) {
    statusCounts[normalizeStatus(goal.status)] += 1;
  }


  const activeWithDate = allGoals
    .filter((goal) => goal.status === "active" && goal.targetDate)
    .sort((left, right) => left.targetDate!.localeCompare(right.targetDate!));


  const featuredGoals = goals
    .filter((goal) => goal.status === "active")
    .sort(compareFeaturedGoals)
    .slice(0, limit)
    .map((goal) => ({
      id: goal.id,
      name: goal.name,
      currency: goal.currency,
      targetAmount: goal.targetAmount,
      contributedAmount: goal.contributedAmount,
      remainingAmount: goal.remainingAmount,
      progressBasisPoints: goal.progressBasisPoints,
      progressPercent: goal.progressPercent,
      targetDate: goal.targetDate,
      status: goal.status,
    }));


  return {
    filter: {
      status: query.status ?? null,
      limit,
    },
    participantCount: goals.length,
    statusCounts,
    nearestActiveTargetDate: activeWithDate[0]?.targetDate ?? null,
    currencies: {
      ARS: serializeGoalOverviewCurrency(totals.ARS, "ARS"),
      USD: serializeGoalOverviewCurrency(totals.USD, "USD"),
    },
    featuredGoals,
  };
}


const includeGoalDetails = {
  contributions: { orderBy: [{ contributedOn: "desc" as const }, { createdAt: "desc" as const }] },
  activities: { orderBy: { createdAt: "desc" as const } },
};


async function getPersistedGoal(goalId: string): Promise<PersistedGoal> {
  const goal = await prisma.savingsGoal.findUnique({
    where: { id: goalId },
    include: includeGoalDetails,
  });
  if (!goal) throw new NotFoundError("Goal");
  return goal as PersistedGoal;
}


async function addActivity(
  transaction: typeof prisma,
  goalId: string,
  kind: string,
  detail: unknown,
) {
  await transaction.goalActivity.create({
    data: {
      goalId,
      kind,
      detailJson: detail === undefined ? null : JSON.stringify(detail),
    },
  });
}


export class GoalsService {
  async listGoals(status?: GoalStatus) {
    const goals = await prisma.savingsGoal.findMany({
      where: status ? { status } : undefined,
      include: includeGoalDetails,
      orderBy: [{ status: "asc" }, { targetDate: "asc" }, { createdAt: "desc" }],
    });
    return (goals as PersistedGoal[]).map(mapGoal);
  }


  async overview(query: GoalsOverviewQuery = {}) {
    const allGoals = await this.listGoals();
    const filteredGoals = query.status
      ? allGoals.filter((goal) => goal.status === query.status)
      : allGoals;
    return buildGoalsOverview(filteredGoals, allGoals, query);
  }


  async getGoal(goalId: string) {
    return mapGoal(await getPersistedGoal(goalId));
  }


  async createGoal(input: CreateGoalInput) {
    const targetCents = parseGoalAmount(input.targetAmount, input.currency);
    const canonicalTarget = formatGoalCents(targetCents, input.currency);
    const goal = await prisma.$transaction(async (transaction) => {
      const created = await transaction.savingsGoal.create({
        data: {
          name: input.name,
          targetAmountRaw: canonicalTarget,
          currency: input.currency,
          targetDate: input.targetDate ?? null,
          status: input.status,
          notes: input.notes || null,
        },
      });
      await addActivity(transaction as typeof prisma, created.id, "created", {
        name: input.name,
        targetAmount: canonicalTarget,
        currency: input.currency,
      });
      return created;
    });
    return this.getGoal(goal.id);
  }


  async updateGoal(goalId: string, input: UpdateGoalInput) {
    const existing = await getPersistedGoal(goalId);
    const status = normalizeStatus(existing.status);
    if (!MUTABLE_STATUSES.has(status)) {
      throw new ValidationError("Completed or closed goals cannot be edited");
    }


    const currency = input.currency ?? normalizeCurrency(existing.currency);
    if (input.currency && input.currency !== existing.currency && existing.contributions.length > 0) {
      throw new ValidationError("Remove contributions before changing the goal currency");
    }
    const targetAmountRaw = input.targetAmount
      ? formatGoalCents(parseGoalAmount(input.targetAmount, currency), currency)
      : undefined;


    const resultingTarget = targetAmountRaw
      ? parseGoalAmount(targetAmountRaw, currency)
      : parseGoalAmount(existing.targetAmountRaw, currency);
    const contributed = existing.contributions.reduce(
      (sum, item) => sum + parseGoalAmount(item.amountRaw, currency),
      0n,
    );
    const reachesTarget = contributed >= resultingTarget;


    await prisma.$transaction(async (transaction) => {
      await transaction.savingsGoal.update({
        where: { id: goalId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(targetAmountRaw !== undefined ? { targetAmountRaw } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
          ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
          ...(reachesTarget ? { status: "completed", completedAt: new Date() } : {}),
        },
      });
      await addActivity(transaction as typeof prisma, goalId, "updated", {
        ...input,
        automaticallyCompleted: reachesTarget,
      });
    });
    return this.getGoal(goalId);
  }


  async changeStatus(goalId: string, input: ChangeGoalStatusInput) {
    const existing = await getPersistedGoal(goalId);
    const current = normalizeStatus(existing.status);
    const next = input.status;
    if (current === next) return mapGoal(existing);
    if (current === "closed") throw new ValidationError("Closed goals cannot change status");
    if (current === "completed" && next !== "closed") {
      throw new ValidationError("Completed goals can only be closed");
    }
    if (next === "completed") {
      const currency = normalizeCurrency(existing.currency);
      const target = parseGoalAmount(existing.targetAmountRaw, currency);
      const contributed = existing.contributions.reduce(
        (sum, item) => sum + parseGoalAmount(item.amountRaw, currency),
        0n,
      );
      if (contributed < target) {
        throw new ValidationError("A goal cannot be completed before reaching its target");
      }
    }


    const now = new Date();
    await prisma.$transaction(async (transaction) => {
      await transaction.savingsGoal.update({
        where: { id: goalId },
        data: {
          status: next,
          completedAt: next === "completed" ? now : current === "completed" ? existing.completedAt : null,
          closedAt: next === "closed" ? now : null,
        },
      });
      await addActivity(transaction as typeof prisma, goalId, "status_changed", {
        from: current,
        to: next,
        note: input.note ?? null,
      });
    });
    return this.getGoal(goalId);
  }


  async addContribution(goalId: string, input: CreateGoalContributionInput) {
    const existing = await getPersistedGoal(goalId);
    const status = normalizeStatus(existing.status);
    if (!MUTABLE_STATUSES.has(status)) {
      throw new ValidationError("Contributions can only be added to active or paused goals");
    }
    const currency = normalizeCurrency(existing.currency);
    const contributionCents = parseGoalAmount(input.amount, currency);
    const canonicalAmount = formatGoalCents(contributionCents, currency);
    const target = parseGoalAmount(existing.targetAmountRaw, currency);
    const current = existing.contributions.reduce(
      (sum, item) => sum + parseGoalAmount(item.amountRaw, currency),
      0n,
    );
    const reachesTarget = current + contributionCents >= target;
    const now = new Date();


    await prisma.$transaction(async (transaction) => {
      const contribution = await transaction.goalContribution.create({
        data: {
          goalId,
          contributedOn: input.contributedOn,
          amountRaw: canonicalAmount,
          notes: input.notes || null,
          referenceType: input.referenceType || null,
          referenceId: input.referenceId || null,
          referenceLabel: input.referenceLabel || null,
        },
      });
      if (reachesTarget) {
        await transaction.savingsGoal.update({
          where: { id: goalId },
          data: { status: "completed", completedAt: now },
        });
      }
      await addActivity(transaction as typeof prisma, goalId, "contribution_added", {
        contributionId: contribution.id,
        amount: canonicalAmount,
        contributedOn: input.contributedOn,
        automaticallyCompleted: reachesTarget,
      });
    });
    return this.getGoal(goalId);
  }


  async deleteContribution(goalId: string, contributionId: string) {
    const existing = await getPersistedGoal(goalId);
    const contribution = existing.contributions.find((item) => item.id === contributionId);
    if (!contribution) throw new NotFoundError("Goal contribution");
    if (normalizeStatus(existing.status) === "closed") {
      throw new ValidationError("Contributions of a closed goal cannot be removed");
    }


    const currency = normalizeCurrency(existing.currency);
    const target = parseGoalAmount(existing.targetAmountRaw, currency);
    const remainingContributed = existing.contributions
      .filter((item) => item.id !== contributionId)
      .reduce((sum, item) => sum + parseGoalAmount(item.amountRaw, currency), 0n);
    const remainsCompleted = remainingContributed >= target;


    await prisma.$transaction(async (transaction) => {
      await transaction.goalContribution.delete({ where: { id: contributionId } });
      if (existing.status === "completed" && !remainsCompleted) {
        await transaction.savingsGoal.update({
          where: { id: goalId },
          data: { status: "active", completedAt: null },
        });
      }
      await addActivity(transaction as typeof prisma, goalId, "contribution_removed", {
        contributionId,
        amount: contribution.amountRaw,
        remainsCompleted,
      });
    });
    return this.getGoal(goalId);
  }


  async deleteGoal(goalId: string) {
    await getPersistedGoal(goalId);
    await prisma.savingsGoal.delete({ where: { id: goalId } });
    return { success: true };
  }
}


export const goalsService = new GoalsService();