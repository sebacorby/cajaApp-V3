import { prisma } from "../../db/prisma.js";
import { logger } from "../../shared/logger.js";
import { AppError } from "../../shared/errors.js";
import type { PrismaClient } from "@prisma/client";
import {
  addCents,
  aggregateOccurrences,
  amountCentsForOccurrence,
  centsToDecimalString,
  emptyMoneyBucket,
  serializeMoneyBucket,
} from "./rules/amount.js";
import { excludesCurrentPeriod, parseInstallment } from "./rules/exclusion.js";
import { deduplicateOccurrences } from "./rules/identity.js";
import { partitionByValidity } from "./rules/diagnostics.js";
import { isSupportedCurrency } from "./rules/currency.js";
import {
  filterToMonthRange,
  monthKeyWithOffset,
  monthLabel,
  persistedMonthKeys,
  requireMonthKey,
  validateHorizon,
} from "./rules/month-sequence.js";
import { sortCards, sortOccurrences } from "./rules/ordering.js";
import { toPendingTraceability, toTraceability } from "./rules/traceability.js";
import { stableResponseObject } from "./serializers/response.js";
import type {
  FutureCardGroup,
  FutureDebtLogger,
  FutureDebtQuery,
  FutureDebtReader,
  FutureDebtResponse,
  FutureMonth,
  FutureOccurrence,
  RawCardStatement,
  RawCardStatementGroup,
  RawCardStatementRow,
  RawManualPurchase,
  RawProjection,
} from "./future.types.js";

const defaultReader = prisma as unknown as FutureDebtReader;

type CardAccumulator = {
  cardId: string;
  cardLast4: string;
  holderName: string;
  cardLabel: string;
  occurrences: FutureOccurrence[];
};

type MonthAccumulator = {
  monthKey: string;
  occurrences: FutureOccurrence[];
  cards: Map<string, CardAccumulator>;
};

function text(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized || fallback;
}

function cardLabel(
  statement: RawCardStatement | undefined,
  last4: string | null,
): string {
  const issuer = text(statement?.brand, text(statement?.bankName, "Tarjeta"));
  return last4?.trim()
    ? `${issuer} •••• ${last4.trim()}`
    : `${issuer} sin referencia`;
}

function cardIdFor(
  statementId: string,
  group: RawCardStatementGroup | undefined,
  last4: string | null,
  holderName: string | null,
): string | null {
  if (!last4?.trim()) return null;
  return (
    group?.id || `${last4.trim()}|${holderName?.trim() ?? ""}|${statementId}`
  );
}

function resolveInstallment(
  projection: RawProjection,
  row: RawCardStatementRow | undefined,
): { current: number | null; total: number | null } {
  if (
    projection.installmentCurrent !== null &&
    projection.installmentTotal !== null
  ) {
    return {
      current: projection.installmentCurrent,
      total: projection.installmentTotal,
    };
  }

  for (const candidate of [projection.label, row?.installmentRaw]) {
    if (!candidate?.trim()) continue;
    try {
      const parsed = parseInstallment(candidate);
      return { current: parsed.current, total: parsed.total };
    } catch {
      // Keep the null values so the diagnostics partition can report the row.
    }
  }

  return {
    current: projection.installmentCurrent,
    total: projection.installmentTotal,
  };
}

function normalizeProjection(
  projection: RawProjection,
  statements: Map<string, RawCardStatement>,
  rows: Map<string, RawCardStatementRow>,
  groups: Map<string, RawCardStatementGroup>,
  manualPurchases: Map<string, RawManualPurchase>,
): FutureOccurrence {
  const statement = statements.get(projection.statementId);
  const row = projection.isManual ? undefined : rows.get(projection.rowId);
  const manual = projection.isManual
    ? manualPurchases.get(projection.rowId)
    : undefined;
  const group = row?.groupKey
    ? groups.get(`${projection.statementId}:${row.groupKey}`)
    : undefined;

  const last4 = manual?.cardLast4 ?? group?.cardLast4 ?? null;
  const holderName =
    manual?.holderName ?? group?.holderName ?? statement?.holderName ?? null;
  const cardId = cardIdFor(projection.statementId, group, last4, holderName);
  const sourceType = projection.isManual
    ? "manual_card_purchase"
    : ("card_statement" as const);
  const sourceId = projection.isManual
    ? (manual?.id ?? projection.rowId)
    : (row?.id ?? projection.rowId);
  const description = projection.isManual
    ? text(manual?.description, `Compra manual ${projection.label}`)
    : text(
        row?.description,
        text(
          row?.originalText,
          text(row?.referenceRaw, `Cuota ${projection.label}`),
        ),
      );
  const installment = resolveInstallment(projection, row);
  const sourceLabel = cardLabel(statement, last4);
  const currencyOriginal =
    projection.currencyOriginal ??
    (projection.isManual ? manual?.currency : row?.currencyOriginal) ??
    null;
  const amountPesosRaw =
    projection.amountPesosRaw ?? row?.amountPesosRaw ?? null;
  const amountDollarsRaw =
    projection.amountDollarsRaw ?? row?.amountDollarsRaw ?? null;

  return {
    id: projection.id,
    sourceType,
    sourceId,
    statementId: projection.statementId,
    statementPeriodKey: statement?.periodKey ?? null,
    isManual: projection.isManual,
    monthKey: projection.monthKey,
    label: projection.label,
    installmentCurrent: installment.current,
    installmentTotal: installment.total,
    amountPesosRaw,
    amountDollarsRaw,
    currencyOriginal,
    description,
    dateIso: manual?.purchaseDate ?? row?.dateIso ?? null,
    referenceRaw: row?.referenceRaw ?? null,
    cardId,
    cardLast4: last4,
    holderName,
    cardLabel: cardId ? sourceLabel : null,
    originReference: projection.isManual
      ? (manual?.id ?? projection.rowId)
      : (statement?.id ?? projection.statementId),
    sourceLabel,
    status: "confirmed",
    rowType: "future_installment",
  };
}

function addOccurrenceToBucket(
  bucket: { ars: bigint; usd: bigint },
  occurrence: FutureOccurrence,
): void {
  const amount = amountCentsForOccurrence(occurrence);
  addCents(bucket, amount.currency, amount.cents);
}

function warningForDiagnostic(diagnostic: string): string {
  return diagnostic;
}

function buildWarnings(input: {
  duplicateOccurrences: number;
  pendingDiagnostics: readonly string[];
}): string[] {
  const warnings: string[] = [];
  if (input.duplicateOccurrences > 0) {
    warnings.push(`duplicate_occurrences:${input.duplicateOccurrences}`);
  }
  for (const diagnostic of Array.from(
    new Set(input.pendingDiagnostics),
  ).sort()) {
    warnings.push(warningForDiagnostic(diagnostic));
  }
  return warnings;
}

export class FutureDebtService {
  constructor(
    private readonly reader: FutureDebtReader = defaultReader,
    private readonly log: FutureDebtLogger = logger,
    private readonly db: PrismaClient = prisma as unknown as PrismaClient,
  ) {}

  async getFutureDebt(query: FutureDebtQuery): Promise<FutureDebtResponse> {
    const from = requireMonthKey(query.from, "from");
    const months = validateHorizon(query.months);
    const includeCurrentPeriod = query.includeCurrentPeriod === true;
    const rangeTo = monthKeyWithOffset(from, months - 1);

    const [
      rawProjections,
      rawStatements,
      activeStatement,
      rawRows,
      rawGroups,
      rawManualPurchases,
    ] = await Promise.all([
      this.reader.cardInstallmentProjection.findMany({
        orderBy: [{ monthKey: "asc" }, { id: "asc" }],
      }),
      this.reader.cardStatement.findMany({
        select: {
          id: true,
          status: true,
          periodKey: true,
          isActiveForPeriod: true,
          bankName: true,
          brand: true,
          holderName: true,
        },
        orderBy: [{ id: "asc" }],
      }),
      this.reader.cardStatement.findFirst({
        where: { status: "accepted", isActiveForPeriod: true },
        orderBy: [{ periodKey: "desc" }, { createdAt: "desc" }],
        select: { periodKey: true },
      }),
      this.reader.cardStatementRow.findMany({
        select: {
          id: true,
          statementId: true,
          groupKey: true,
          rowType: true,
          referenceRaw: true,
          dateIso: true,
          installmentRaw: true,
          originalText: true,
          currencyOriginal: true,
          amountPesosRaw: true,
          amountDollarsRaw: true,
        },
        orderBy: [{ id: "asc" }],
      }),
      this.reader.cardStatementGroup.findMany({
        select: {
          id: true,
          statementId: true,
          groupKey: true,
          label: true,
          cardLast4: true,
          holderName: true,
        },
        orderBy: [{ id: "asc" }],
      }),
      this.reader.manualCardPurchase.findMany({
        select: {
          id: true,
          statementId: true,
          cardLast4: true,
          holderName: true,
          purchaseDate: true,
          description: true,
          currency: true,
          amountRaw: true,
          installments: true,
          notes: true,
        },
        orderBy: [{ id: "asc" }],
      }),
    ]);

    const statements = new Map(
      rawStatements.map((statement) => [statement.id, statement]),
    );
    const rows = new Map(rawRows.map((row) => [row.id, row]));
    const groups = new Map(
      rawGroups.map((group) => [
        `${group.statementId}:${group.groupKey}`,
        group,
      ]),
    );
    const manualPurchases = new Map(
      rawManualPurchases.map((purchase) => [purchase.id, purchase]),
    );
    const currentPeriodKey = activeStatement?.periodKey ?? null;

    const normalized = rawProjections
      .filter((projection) => typeof projection.monthKey === "string")
      .map((projection) =>
        normalizeProjection(
          projection,
          statements,
          rows,
          groups,
          manualPurchases,
        ),
      );

    const persisted = persistedMonthKeys(normalized);
    const visible = filterToMonthRange(normalized, from, months).filter(
      (occurrence) =>
        !excludesCurrentPeriod(
          occurrence,
          currentPeriodKey,
          includeCurrentPeriod,
        ),
    );
    const deduplicated = deduplicateOccurrences(visible);
    const partition = partitionByValidity(deduplicated.occurrences);
    const pendingRows = partition.pending.sort((left, right) =>
      left.monthKey < right.monthKey
        ? -1
        : left.monthKey > right.monthKey
          ? 1
          : left.diagnostic < right.diagnostic
            ? -1
            : left.diagnostic > right.diagnostic
              ? 1
              : left.id.localeCompare(right.id),
    );

    const monthMap = new Map<string, MonthAccumulator>();
    for (const occurrence of partition.included) {
      let month = monthMap.get(occurrence.monthKey);
      if (!month) {
        month = {
          monthKey: occurrence.monthKey,
          occurrences: [],
          cards: new Map(),
        };
        monthMap.set(occurrence.monthKey, month);
      }
      month.occurrences.push(occurrence);

      const cardId = occurrence.cardId ?? "";
      if (!cardId) continue;
      let card = month.cards.get(cardId);
      if (!card) {
        const cardLast4 = occurrence.cardLast4?.trim() ?? "";
        card = {
          cardId,
          cardLast4,
          holderName: text(occurrence.holderName, "Sin titular"),
          cardLabel: occurrence.cardLabel ?? occurrence.sourceLabel,
          occurrences: [],
        };
        month.cards.set(cardId, card);
      }
      card.occurrences.push(occurrence);
    }

    const responseMonths: FutureMonth[] = Array.from(monthMap.values())
      .sort((left, right) =>
        left.monthKey < right.monthKey
          ? -1
          : left.monthKey > right.monthKey
            ? 1
            : 0,
      )
      .map((month) => {
        const cards = sortCards(
          Array.from(month.cards.values()).map(
            (card) =>
              ({
                cardId: card.cardId,
                cardLast4: card.cardLast4,
                holderName: card.holderName,
                cardLabel: card.cardLabel,
                rows: sortOccurrences(card.occurrences).map(toTraceability),
                totals: serializeMoneyBucket(
                  aggregateOccurrences(card.occurrences),
                ),
              }) as FutureCardGroup,
          ),
        );
        const monthBucket = aggregateOccurrences(month.occurrences);
        const monthPendingDiagnostics = pendingRows
          .filter((row) => row.monthKey === month.monthKey)
          .map((row) => row.diagnostic);
        const warnings = Array.from(new Set(monthPendingDiagnostics)).sort();
        return {
          monthKey: month.monthKey,
          label: monthLabel(month.monthKey),
          totals: serializeMoneyBucket(monthBucket),
          cards,
          dataQuality: {
            status: warnings.length > 0 ? "partial" : "complete",
            warnings,
          },
        };
      });

    const summary = serializeMoneyBucket(
      aggregateOccurrences(partition.included),
    );
    const pendingDiagnosticNames = pendingRows.map((row) => row.diagnostic);
    const warnings = buildWarnings({
      duplicateOccurrences: deduplicated.duplicateOccurrences,
      pendingDiagnostics: pendingDiagnosticNames,
    });

    const response: FutureDebtResponse = {
      range: {
        from,
        to: rangeTo,
        months,
        includeCurrentPeriod,
        currentPeriodKey,
      },
      summary,
      horizon: {
        persisted: persisted.length > 0,
        persistedMonths: persisted,
      },
      months: responseMonths,
      pendientes: {
        rows: pendingRows.map(toPendingTraceability),
        diagnostics: Array.from(new Set(pendingDiagnosticNames)).sort(),
      },
      diagnostics: {
        duplicateOccurrences: deduplicated.duplicateOccurrences,
        invalidInstallmentRows: partition.diagnostics.invalidInstallmentRows,
        missingCurrencyRows: partition.diagnostics.missingCurrencyRows,
        missingCardRows: partition.diagnostics.missingCardRows,
        warnings,
      },
    };

    this.log.warn?.(
      {
        duplicateOccurrences: response.diagnostics.duplicateOccurrences,
        invalidInstallmentRows: response.diagnostics.invalidInstallmentRows,
        missingCurrencyRows: response.diagnostics.missingCurrencyRows,
        missingCardRows: response.diagnostics.missingCardRows,
      },
      "Future-debt read diagnostics",
    );
    this.log.info?.(
      { from, to: rangeTo, months, visibleRows: partition.included.length },
      "Future-debt read completed",
    );

    return stableResponseObject(response);
  }

  async deleteProjectionRow(id: string): Promise<void> {
    // Load the projection by id; throw NotFoundError if not found
    const projection = await this.db.cardInstallmentProjection.findUnique({
      where: { id },
    });
    if (!projection) {
      throw new AppError("NOT_FOUND", `Projection ${id} not found`, 404);
    }

    // Prisma transaction: for isManual, delete ManualCardPurchase first, then delete projection
    await this.db.$transaction(async (tx) => {
      if (projection.isManual) {
        // Delete the associated ManualCardPurchase using rowId (which holds the manual purchase id for manual rows)
        await tx.manualCardPurchase.deleteMany({
          where: { id: projection.rowId },
        });
      }
      await tx.cardInstallmentProjection.delete({
        where: { id: projection.id },
      });
    });
  }
}

export const futureDebtService = new FutureDebtService();

/**
 * Internal compatibility projection for analytics modules that still consume
 * the historical future-overview shape. The HTTP surface never exposes this
 * shape; it is derived from the same read-only card-debt response.
 */
function zeroMoney(): { ars: string; usd: string } {
  return { ars: "0.00", usd: "0.00" };
}

function negateMoney(value: { ars: string; usd: string }): {
  ars: string;
  usd: string;
} {
  const negate = (amount: string) =>
    amount.startsWith("-") ? amount.slice(1) : `-${amount}`;
  return { ars: negate(value.ars), usd: negate(value.usd) };
}

export const futureService = {
  async getOverview(query: { from: string; months: number }) {
    const response = await futureDebtService.getFutureDebt({
      from: query.from,
      months: query.months,
      includeCurrentPeriod: false,
    });
    const expectedIncome = zeroMoney();
    const expectedCommitments = response.summary;
    const expectedResult = negateMoney(expectedCommitments);
    const dataQuality = {
      status:
        response.pendientes.rows.length > 0
          ? ("partial" as const)
          : ("complete" as const),
      estimatedDueDateItems: 0,
      unclassifiedItems: 0,
      warnings: response.diagnostics.warnings,
      note: "La deuda futura se construyó con ocurrencias persistidas.",
    };

    return {
      range: {
        from: response.range.from,
        to: response.range.to,
        months: response.range.months,
      },
      summary: {
        confirmedIncome: zeroMoney(),
        projectedIncome: zeroMoney(),
        confirmedCardDebt: response.summary,
        projectedCardDebt: zeroMoney(),
        confirmedOtherCommitments: zeroMoney(),
        projectedOtherCommitments: zeroMoney(),
        confirmedCommitments: response.summary,
        projectedCommitments: zeroMoney(),
        expectedIncome,
        expectedCommitments,
        expectedResult,
      },
      months: response.months.map((month) => ({
        monthKey: month.monthKey,
        label: month.label,
        totals: {
          confirmedIncome: zeroMoney(),
          projectedIncome: zeroMoney(),
          confirmedCardDebt: month.totals,
          projectedCardDebt: zeroMoney(),
          confirmedOtherCommitments: zeroMoney(),
          projectedOtherCommitments: zeroMoney(),
          confirmedCommitments: month.totals,
          projectedCommitments: zeroMoney(),
          confirmedResult: negateMoney(month.totals),
          expectedIncome: zeroMoney(),
          expectedCommitments: month.totals,
          expectedResult: negateMoney(month.totals),
        },
        groups: month.cards.map((card) => ({
          key: card.cardId,
          label: card.cardLabel,
          kind: "card_debt" as const,
          originSection: "tarjetas" as const,
          originReference: card.cardId,
          confirmed: card.totals,
          projected: zeroMoney(),
          items: card.rows,
        })),
        componentCount: month.cards.reduce(
          (total, card) => total + card.rows.length,
          0,
        ),
        dataQuality: {
          ...dataQuality,
          status: month.dataQuality.status,
          warnings: month.dataQuality.warnings,
        },
      })),
      dataQuality,
    };
  },
};
