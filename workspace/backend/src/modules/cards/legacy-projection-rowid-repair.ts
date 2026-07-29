import { prisma } from "../../db/prisma.js";
import type {
  CardStatementPreview,
  CardStatementRow,
} from "./cards.types.js";

export interface LegacyProjectionRepairStats {
  groupsInspected: number;
  groupsRepaired: number;
  projectionsRepaired: number;
  groupsUnresolved: number;
}

export interface ProjectionLinkRepairStats extends LegacyProjectionRepairStats {
  groupKeysRepaired: number;
}

type ProjectionCandidate = {
  id: string;
  statementId: string;
  rowId: string;
  monthKey: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
  currencyOriginal: string | null;
};

type StatementRowCandidate = {
  id: string;
  statementId: string;
  displayOrder?: number;
  sectionKey?: string;
  groupKey?: string | null;
  installmentRaw: string | null;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
  currencyOriginal: string | null;
  originalText?: string;
};

function normalizedText(value: string | null | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}

/**
 * Converts common AR/US money formats to an exact decimal representation.
 * Examples: 3.356,37 -> 3356.37, 3,356.37 -> 3356.37, $ 3356,37 -> 3356.37.
 * Returns null for values that cannot be interpreted conservatively.
 */
export function normalizeMoney(value: string | null | undefined): string | null {
  const text = normalizedText(value);
  if (!text) return null;

  let raw = text.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "");
  const negative = raw.startsWith("-");
  raw = raw.replace(/-/g, "");
  if (!/\d/.test(raw)) return null;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let decimalIndex = -1;

  if (lastComma >= 0 && lastDot >= 0) {
    decimalIndex = Math.max(lastComma, lastDot);
  } else {
    const separatorIndex = Math.max(lastComma, lastDot);
    if (separatorIndex >= 0) {
      const fractionalLength = raw.length - separatorIndex - 1;
      if (fractionalLength === 1 || fractionalLength === 2) {
        decimalIndex = separatorIndex;
      }
    }
  }

  const integerSource = decimalIndex >= 0 ? raw.slice(0, decimalIndex) : raw;
  const fractionSource = decimalIndex >= 0 ? raw.slice(decimalIndex + 1) : "";
  const integerDigits = integerSource.replace(/[.,]/g, "");
  const fractionDigits = fractionSource.replace(/[.,]/g, "");

  if (!/^\d+$/.test(integerDigits || "0")) return null;
  if (fractionDigits && !/^\d+$/.test(fractionDigits)) return null;
  if (fractionDigits.length > 2) return null;

  const integerPart = (integerDigits || "0").replace(/^0+(?=\d)/, "");
  const fractionPart = fractionDigits.padEnd(2, "0");
  return `${negative ? "-" : ""}${integerPart}.${fractionPart}`;
}

function uniqueNonNull(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map(normalizedText)
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function uniqueMoney(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map(normalizeMoney)
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function uniqueNumbers(values: Array<number | null>): number[] {
  return Array.from(
    new Set(values.filter((value): value is number => value !== null)),
  );
}

export function parseInstallmentRaw(
  value: string | null,
): { current: number; total: number } | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (
    !Number.isInteger(current) ||
    !Number.isInteger(total) ||
    current < 1 ||
    total < 1 ||
    current > total
  ) {
    return null;
  }
  return { current, total };
}

function monthKeyWithOffset(monthKey: string, offset: number): string | null {
  const match = monthKey.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match || !Number.isInteger(offset)) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const absoluteMonth = year * 12 + monthIndex + offset;
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonth = (absoluteMonth % 12 + 12) % 12;
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`;
}

function sameCurrency(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  return normalizedText(left)?.toUpperCase() === normalizedText(right)?.toUpperCase();
}

function sameAmount(
  projection: ProjectionCandidate,
  row: StatementRowCandidate,
): boolean {
  const projectionArs = normalizeMoney(projection.amountPesosRaw);
  const projectionUsd = normalizeMoney(projection.amountDollarsRaw);
  if (projectionArs === null && projectionUsd === null) return false;
  if (projectionArs !== null && normalizeMoney(row.amountPesosRaw) !== projectionArs) {
    return false;
  }
  if (projectionUsd !== null && normalizeMoney(row.amountDollarsRaw) !== projectionUsd) {
    return false;
  }
  return true;
}

/**
 * Validates the source row of one persisted projection using only invariant data:
 * amount, currency, installment sequence and the month that the installment must
 * occupy relative to the statement period. This intentionally does not trust rowId.
 */
export function matchesProjectionOccurrence(
  projection: ProjectionCandidate,
  row: StatementRowCandidate,
  statementPeriodKey: string,
): boolean {
  if (projection.statementId !== row.statementId) return false;
  const sourceInstallment = parseInstallmentRaw(row.installmentRaw);
  if (!sourceInstallment) return false;
  if (
    projection.installmentCurrent === null ||
    projection.installmentTotal === null ||
    projection.installmentTotal !== sourceInstallment.total ||
    projection.installmentCurrent <= sourceInstallment.current
  ) {
    return false;
  }
  if (!sameCurrency(projection.currencyOriginal, row.currencyOriginal)) return false;
  if (!sameAmount(projection, row)) return false;

  const expectedMonth = monthKeyWithOffset(
    statementPeriodKey,
    projection.installmentCurrent - sourceInstallment.current,
  );
  return expectedMonth !== null && expectedMonth === projection.monthKey;
}

export function matchesLegacyProjectionGroup(
  projections: ProjectionCandidate[],
  row: StatementRowCandidate,
): boolean {
  if (projections.length === 0) return false;
  if (projections.some((projection) => projection.statementId !== row.statementId)) {
    return false;
  }

  const totals = uniqueNumbers(
    projections.map((projection) => projection.installmentTotal),
  );
  const currents = uniqueNumbers(
    projections.map((projection) => projection.installmentCurrent),
  );
  if (totals.length !== 1 || currents.length === 0) return false;

  const sourceInstallment = parseInstallmentRaw(row.installmentRaw);
  if (!sourceInstallment) return false;

  const firstFutureInstallment = Math.min(...currents);
  if (
    sourceInstallment.total !== totals[0] ||
    sourceInstallment.current !== firstFutureInstallment - 1
  ) {
    return false;
  }

  const currencies = uniqueNonNull(
    projections.map((projection) => projection.currencyOriginal),
  ).map((value) => value.toUpperCase());
  if (currencies.length !== 1) return false;
  if (normalizedText(row.currencyOriginal)?.toUpperCase() !== currencies[0]) {
    return false;
  }

  const arsAmounts = uniqueMoney(
    projections.map((projection) => projection.amountPesosRaw),
  );
  const usdAmounts = uniqueMoney(
    projections.map((projection) => projection.amountDollarsRaw),
  );
  if (arsAmounts.length > 1 || usdAmounts.length > 1) return false;
  if (arsAmounts.length === 0 && usdAmounts.length === 0) return false;
  if (
    arsAmounts.length === 1 &&
    normalizeMoney(row.amountPesosRaw) !== arsAmounts[0]
  ) {
    return false;
  }
  if (
    usdAmounts.length === 1 &&
    normalizeMoney(row.amountDollarsRaw) !== usdAmounts[0]
  ) {
    return false;
  }

  return true;
}

function previewRowsFromJson(value: string | null): CardStatementRow[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return [];
    const record = parsed as Record<string, unknown>;
    const preview =
      record.preview && typeof record.preview === "object"
        ? (record.preview as Record<string, unknown>)
        : record;
    return Array.isArray(preview.rows)
      ? (preview.rows as CardStatementRow[])
      : [];
  } catch {
    return [];
  }
}

function previewRowMatchesPersisted(
  previewRow: CardStatementRow,
  persistedRow: {
    displayOrder: number;
    sectionKey: string;
    installmentRaw: string | null;
    amountPesosRaw: string | null;
    amountDollarsRaw: string | null;
    currencyOriginal: string | null;
    originalText: string;
  },
): boolean {
  return (
    previewRow.displayOrder === persistedRow.displayOrder &&
    normalizedText(previewRow.sectionId) === normalizedText(persistedRow.sectionKey) &&
    normalizedText(previewRow.installmentRaw) === normalizedText(persistedRow.installmentRaw) &&
    normalizeMoney(previewRow.amountPesos) === normalizeMoney(persistedRow.amountPesosRaw) &&
    normalizeMoney(previewRow.amountDollars) === normalizeMoney(persistedRow.amountDollarsRaw) &&
    sameCurrency(previewRow.currencyOriginal, persistedRow.currencyOriginal) &&
    normalizedText(previewRow.originalText) === normalizedText(persistedRow.originalText)
  );
}

async function repairPersistedGroupKeys(
  statementId?: string,
  suppliedPreview?: CardStatementPreview,
): Promise<number> {
  const statements = await prisma.cardStatement.findMany({
    where: statementId ? { id: statementId } : undefined,
    select: {
      id: true,
      draft: { select: { previewJson: true } },
      groups: { select: { groupKey: true } },
      rows: {
        select: {
          id: true,
          displayOrder: true,
          sectionKey: true,
          groupKey: true,
          installmentRaw: true,
          amountPesosRaw: true,
          amountDollarsRaw: true,
          currencyOriginal: true,
          originalText: true,
        },
      },
    },
  });

  const updates: Array<ReturnType<typeof prisma.cardStatementRow.update>> = [];

  for (const statement of statements) {
    const previewRows =
      suppliedPreview && statement.id === statementId
        ? suppliedPreview.rows
        : previewRowsFromJson(statement.draft?.previewJson ?? null);
    if (previewRows.length === 0) continue;

    const validGroupKeys = new Set(statement.groups.map((group) => group.groupKey));

    for (const persistedRow of statement.rows) {
      const candidates = previewRows.filter((previewRow) =>
        previewRowMatchesPersisted(previewRow, persistedRow),
      );
      if (candidates.length !== 1) continue;

      const targetGroupKey = normalizedText(candidates[0].groupId);
      if (targetGroupKey !== null && !validGroupKeys.has(targetGroupKey)) continue;
      if (normalizedText(persistedRow.groupKey) === targetGroupKey) continue;

      updates.push(
        prisma.cardStatementRow.update({
          where: { id: persistedRow.id },
          data: { groupKey: targetGroupKey },
        }),
      );
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
  return updates.length;
}

async function repairProjectionRowIds(
  statementId?: string,
): Promise<LegacyProjectionRepairStats> {
  const [projections, rows, statements] = await Promise.all([
    prisma.cardInstallmentProjection.findMany({
      where: statementId
        ? { isManual: false, statementId }
        : { isManual: false },
      select: {
        id: true,
        statementId: true,
        rowId: true,
        monthKey: true,
        installmentCurrent: true,
        installmentTotal: true,
        amountPesosRaw: true,
        amountDollarsRaw: true,
        currencyOriginal: true,
      },
      orderBy: [{ statementId: "asc" }, { monthKey: "asc" }, { id: "asc" }],
    }),
    prisma.cardStatementRow.findMany({
      where: statementId ? { statementId } : undefined,
      select: {
        id: true,
        statementId: true,
        installmentRaw: true,
        amountPesosRaw: true,
        amountDollarsRaw: true,
        currencyOriginal: true,
      },
      orderBy: [{ statementId: "asc" }, { id: "asc" }],
    }),
    prisma.cardStatement.findMany({
      where: statementId ? { id: statementId } : undefined,
      select: { id: true, periodKey: true },
    }),
  ]);

  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const rowsByStatement = new Map<string, StatementRowCandidate[]>();
  for (const row of rows) {
    const bucket = rowsByStatement.get(row.statementId) ?? [];
    bucket.push(row);
    rowsByStatement.set(row.statementId, bucket);
  }
  const periodByStatement = new Map(
    statements.map((statement) => [statement.id, statement.periodKey]),
  );

  const inspectedGroups = new Set<string>();
  const repairedGroups = new Set<string>();
  const unresolvedGroups = new Set<string>();
  const updates: Array<ReturnType<typeof prisma.cardInstallmentProjection.update>> = [];

  for (const projection of projections) {
    const periodKey = periodByStatement.get(projection.statementId);
    const groupKey = `${projection.statementId}\u0000${projection.rowId}`;
    const currentRow = rowsById.get(projection.rowId);

    if (
      periodKey &&
      currentRow &&
      matchesProjectionOccurrence(projection, currentRow, periodKey)
    ) {
      continue;
    }

    inspectedGroups.add(groupKey);
    if (!periodKey) {
      unresolvedGroups.add(groupKey);
      continue;
    }

    const candidates = (rowsByStatement.get(projection.statementId) ?? []).filter(
      (row) => matchesProjectionOccurrence(projection, row, periodKey),
    );

    if (candidates.length !== 1) {
      unresolvedGroups.add(groupKey);
      continue;
    }

    const targetRowId = candidates[0].id;
    if (targetRowId === projection.rowId) continue;

    updates.push(
      prisma.cardInstallmentProjection.update({
        where: { id: projection.id },
        data: { rowId: targetRowId },
      }),
    );
    repairedGroups.add(groupKey);
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  return {
    groupsInspected: inspectedGroups.size,
    groupsRepaired: Array.from(repairedGroups).filter(
      (key) => !unresolvedGroups.has(key),
    ).length,
    projectionsRepaired: updates.length,
    groupsUnresolved: unresolvedGroups.size,
  };
}

/**
 * Repairs the two broken joins that can exist on accepted statements:
 * 1) CardStatementRow.groupKey must point to CardStatementGroup.groupKey.
 * 2) CardInstallmentProjection.rowId must point to the exact source row.
 *
 * The operation is conservative and idempotent: a link is changed only when
 * one and only one source row satisfies all invariant anchors.
 */
export async function repairStatementProjectionLinks(
  statementId?: string,
  suppliedPreview?: CardStatementPreview,
): Promise<ProjectionLinkRepairStats> {
  const groupKeysRepaired = await repairPersistedGroupKeys(
    statementId,
    suppliedPreview,
  );
  const rowIdStats = await repairProjectionRowIds(statementId);
  return { ...rowIdStats, groupKeysRepaired };
}

/** Backward-compatible entry point kept for the existing repair script. */
export async function repairLegacyProjectionRowIds(): Promise<LegacyProjectionRepairStats> {
  const result = await repairStatementProjectionLinks();
  return {
    groupsInspected: result.groupsInspected,
    groupsRepaired: result.groupsRepaired,
    projectionsRepaired: result.projectionsRepaired,
    groupsUnresolved: result.groupsUnresolved,
  };
}
