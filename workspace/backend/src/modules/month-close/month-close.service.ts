import { createHash } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import {
  movementsService,
  parseMovementAmount,
  type NormalizedMovement,
} from "../movements/movements.service.js";

type Currency = "ARS" | "USD";
type LedgerStatus = "actual" | "pending" | "projected";

type CurrencyTotals = Record<Currency, string>;
type StatusTotals = Record<LedgerStatus | "all", CurrencyTotals>;

export interface MonthCloseSummary {
  monthKey: string;
  movements: number;
  income: StatusTotals;
  expense: StatusTotals;
  balance: StatusTotals;
  sources: Record<string, number>;
  openReconciliations: number;
}

export interface MonthCloseSnapshot {
  version: "month-close-v1";
  monthKey: string;
  range: { from: string; to: string };
  generatedAt: string;
  summary: MonthCloseSummary;
  movements: NormalizedMovement[];
  settings: unknown;
  goals: unknown[];
  budgets: unknown[];
  cardStatements: unknown[];
  salaryReceipts: unknown[];
}

export interface MonthCloseListQuery {
  monthKey?: string;
  status: "all" | "closed" | "reopened";
  limit: number;
  offset: number;
}

let monthCloseQueue: Promise<void> = Promise.resolve();

async function serialized<T>(work: () => Promise<T>): Promise<T> {
  const previous = monthCloseQueue.catch(() => undefined);
  let release!: () => void;
  monthCloseQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

export function monthRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function emptyStatusTotals(): StatusTotals {
  const zero = (): CurrencyTotals => ({ ARS: "0", USD: "0" });
  return {
    all: zero(),
    actual: zero(),
    pending: zero(),
    projected: zero(),
  };
}

function addCents(target: StatusTotals, status: LedgerStatus, currency: Currency, value: bigint): void {
  target[status][currency] = (BigInt(target[status][currency]) + value).toString();
  target.all[currency] = (BigInt(target.all[currency]) + value).toString();
}

function subtractTotals(left: StatusTotals, right: StatusTotals): StatusTotals {
  const result = emptyStatusTotals();
  for (const status of ["all", "actual", "pending", "projected"] as const) {
    for (const currency of ["ARS", "USD"] as const) {
      result[status][currency] = (
        BigInt(left[status][currency]) - BigInt(right[status][currency])
      ).toString();
    }
  }
  return result;
}

export function buildMonthCloseSummary(
  monthKey: string,
  movements: NormalizedMovement[],
  openReconciliations = 0,
): MonthCloseSummary {
  const income = emptyStatusTotals();
  const expense = emptyStatusTotals();
  const sources: Record<string, number> = {};

  for (const movement of movements) {
    if (movement.status === "voided") continue;
    const status: LedgerStatus =
      movement.status === "pending"
        ? "pending"
        : movement.status === "projected"
          ? "projected"
          : "actual";
    const cents = parseMovementAmount(movement.amount, movement.currency, false);
    addCents(movement.type === "income" ? income : expense, status, movement.currency, cents);
    sources[movement.sourceType] = (sources[movement.sourceType] ?? 0) + 1;
  }

  return {
    monthKey,
    movements: movements.filter((movement) => movement.status !== "voided").length,
    income,
    expense,
    balance: subtractTotals(income, expense),
    sources: Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b))),
    openReconciliations,
  };
}

function canonicalValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "generatedAt")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalValue(entry)]),
    );
  }
  return value;
}

export function buildMonthCloseFingerprint(snapshot: MonthCloseSnapshot): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalValue(snapshot)), "utf8")
    .digest("hex");
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function mapClose(record: any, latestActiveId: string | null, includeSnapshot: boolean) {
  return {
    id: record.id,
    monthKey: record.monthKey,
    version: record.version,
    status: record.status,
    active: record.activeKey === record.monthKey,
    summary: parseJson<MonthCloseSummary>(record.summaryJson),
    ...(includeSnapshot
      ? { snapshot: parseJson<MonthCloseSnapshot>(record.snapshotJson) }
      : {}),
    sourceFingerprint: record.sourceFingerprint,
    canReopen: record.status === "closed" && record.id === latestActiveId,
    closedAt: record.closedAt.toISOString(),
    reopenedAt: record.reopenedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    activities: Array.isArray(record.activities)
      ? record.activities.map((activity: any) => ({
          id: activity.id,
          kind: activity.kind,
          detail: activity.detailJson ? parseJson(activity.detailJson) : null,
          createdAt: activity.createdAt.toISOString(),
        }))
      : undefined,
  };
}

async function latestActiveCloseId(client: any = prisma): Promise<string | null> {
  const latest = await client.monthClose.findFirst({
    where: { status: "closed", activeKey: { not: null } },
    orderBy: [{ monthKey: "desc" }, { version: "desc" }],
    select: { id: true },
  });
  return latest?.id ?? null;
}

async function buildSnapshot(monthKey: string): Promise<MonthCloseSnapshot> {
  const range = monthRange(monthKey);
  const [movements, settings, goals, budgets, cardStatements, salaryReceipts, openReconciliations] =
    await Promise.all([
      movementsService.getAllMovements({
        from: range.from,
        to: range.to,
        includeProjected: true,
      }),
      prisma.localAppSettings.findUnique({ where: { id: "local" } }),
      prisma.savingsGoal.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          contributions: { orderBy: [{ contributedOn: "asc" }, { createdAt: "asc" }, { id: "asc" }] },
          activities: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
        },
      }),
      prisma.categoryBudget.findMany({
        where: { periodStart: { lte: range.to }, periodEnd: { gte: range.from } },
        orderBy: [{ periodStart: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        include: { category: true },
      }),
      prisma.cardStatement.findMany({
        where: {
          status: "accepted",
          isActiveForPeriod: true,
          archivedAt: null,
          OR: [
            { periodKey: monthKey },
            { currentDueDate: { gte: range.from, lte: range.to } },
          ],
        },
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        include: {
          groups: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
          rows: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
          projections: { orderBy: [{ monthKey: "asc" }, { createdAt: "asc" }, { id: "asc" }] },
          manualPurchases: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
        },
      }),
      prisma.salaryReceipt.findMany({
        where: {
          status: "accepted",
          isActiveForPeriod: true,
          reversedAt: null,
          periodMonthKey: monthKey,
        },
        orderBy: [{ acceptedAt: "asc" }, { id: "asc" }],
        include: { items: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }, source: true },
      }),
      prisma.reconciliationCase.count({ where: { isCurrent: true, status: "open" } }),
    ]);

  const orderedMovements = [...movements].sort((left, right) =>
    [left.occurredOn, left.sourceType, left.sourceId, left.id]
      .join("|")
      .localeCompare([right.occurredOn, right.sourceType, right.sourceId, right.id].join("|")),
  );

  return {
    version: "month-close-v1",
    monthKey,
    range,
    generatedAt: new Date().toISOString(),
    summary: buildMonthCloseSummary(monthKey, orderedMovements, openReconciliations),
    movements: orderedMovements,
    settings,
    goals,
    budgets,
    cardStatements,
    salaryReceipts,
  };
}

export class MonthCloseService {
  async list(query: MonthCloseListQuery) {
    const where: Record<string, unknown> = {};
    if (query.monthKey) where.monthKey = query.monthKey;
    if (query.status !== "all") where.status = query.status;

    const [records, total, latestId] = await Promise.all([
      prisma.monthClose.findMany({
        where,
        orderBy: [{ monthKey: "desc" }, { version: "desc" }],
        skip: query.offset,
        take: query.limit,
        select: {
          id: true,
          monthKey: true,
          version: true,
          activeKey: true,
          status: true,
          summaryJson: true,
          sourceFingerprint: true,
          closedAt: true,
          reopenedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.monthClose.count({ where }),
      latestActiveCloseId(),
    ]);

    return {
      items: records.map((record: any) => mapClose(record, latestId, false)),
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total,
        hasMore: query.offset + records.length < total,
      },
    };
  }

  async detail(closeId: string) {
    const [record, latestId] = await Promise.all([
      prisma.monthClose.findUnique({
        where: { id: closeId },
        include: { activities: { orderBy: { createdAt: "asc" } } },
      }),
      latestActiveCloseId(),
    ]);
    if (!record) throw new NotFoundError("Month close");
    return mapClose(record, latestId, true);
  }

  async create(monthKey: string) {
    return serialized(async () => {
      const snapshot = await buildSnapshot(monthKey);
      if (snapshot.summary.openReconciliations > 0) {
        throw new ValidationError(
          `No se puede cerrar ${monthKey}: existen ${snapshot.summary.openReconciliations} conciliaciones actuales abiertas.`,
        );
      }
      const fingerprint = buildMonthCloseFingerprint(snapshot);

      const created = await prisma.$transaction(async (tx) => {
        const [openReconciliations, active, later, latestVersion] = await Promise.all([
          tx.reconciliationCase.count({ where: { isCurrent: true, status: "open" } }),
          tx.monthClose.findUnique({ where: { activeKey: monthKey }, select: { id: true } }),
          tx.monthClose.findFirst({
            where: { status: "closed", activeKey: { not: null }, monthKey: { gt: monthKey } },
            orderBy: { monthKey: "asc" },
            select: { monthKey: true },
          }),
          tx.monthClose.findFirst({
            where: { monthKey },
            orderBy: { version: "desc" },
            select: { version: true },
          }),
        ]);
        if (openReconciliations > 0) {
          throw new ValidationError("El cierre fue cancelado porque Conciliación volvió a detectar casos abiertos.");
        }
        if (active) throw new ValidationError(`El mes ${monthKey} ya tiene un cierre activo.`);
        if (later) {
          throw new ValidationError(
            `No se puede cerrar ${monthKey} mientras ${later.monthKey} continúe cerrado. Reabra primero los meses posteriores.`,
          );
        }

        const version = (latestVersion?.version ?? 0) + 1;
        return tx.monthClose.create({
          data: {
            monthKey,
            version,
            activeKey: monthKey,
            status: "closed",
            summaryJson: JSON.stringify(snapshot.summary),
            snapshotJson: JSON.stringify(snapshot),
            sourceFingerprint: fingerprint,
            activities: {
              create: {
                kind: "closed",
                detailJson: JSON.stringify({ version, fingerprint }),
              },
            },
          },
        });
      });

      return this.detail(created.id);
    });
  }

  async reopen(closeId: string) {
    return serialized(async () => {
      const reopened = await prisma.$transaction(async (tx) => {
        const record = await tx.monthClose.findUnique({ where: { id: closeId } });
        if (!record) throw new NotFoundError("Month close");
        const latestId = await latestActiveCloseId(tx);
        if (record.status !== "closed" || record.activeKey !== record.monthKey) {
          throw new ValidationError("El cierre indicado ya no está activo.");
        }
        if (latestId !== record.id) {
          throw new ValidationError("Sólo se puede reabrir el cierre activo más reciente.");
        }
        const reopenedAt = new Date();
        return tx.monthClose.update({
          where: { id: record.id },
          data: {
            activeKey: null,
            status: "reopened",
            reopenedAt,
            activities: {
              create: {
                kind: "reopened",
                detailJson: JSON.stringify({ reopenedAt: reopenedAt.toISOString() }),
              },
            },
          },
        });
      });
      return this.detail(reopened.id);
    });
  }
}

export const monthCloseService = new MonthCloseService();
