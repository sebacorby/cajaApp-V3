import { logger } from "../../shared/logger.js";
import type { CardStatementRow, MonthlyProjection } from "../cards/cards.types.js";
import { parseArgentinePesos, parseDollars } from "../../shared/money.js";
import { cardBillingCalendarService } from "./card-billing-calendar.service.js";

export interface InstallmentProjection {
  rowId: string;
  monthKey: string;
  label: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  amountPesos: string | null;
  amountDollars: string | null;
  currencyOriginal: string;
  /** Composite-key fields used to correlate a projection with its persisted CardStatementRow */
  displayOrder: number;
  sectionKey: string;
  groupKey: string;
}

export class InstallmentProjectionService {
  calculateProjections(
    rows: CardStatementRow[],
    statementPeriodKey: string,
  ): InstallmentProjection[] {
    const projections: InstallmentProjection[] = [];
    const validStatementPeriodKey = cardBillingCalendarService.requireMonthKey(
      statementPeriodKey,
      "statementPeriodKey",
    );
    let invalidInstallmentRows = 0;

    for (const row of rows) {
      // installmentRaw is the authoritative signal that this accepted row represents
      // a financed sequence. Interests, financing charges and other obligations can
      // legitimately carry 09/12, 07/12, etc. and must not be discarded because
      // the extractor classified them with a rowType different from "transaction".
      if (!row.installmentRaw?.trim()) {
        continue;
      }

      let parsed: { current: number; total: number };

      try {
        parsed = cardBillingCalendarService.parseInstallment(row.installmentRaw);
      } catch (error) {
        invalidInstallmentRows += 1;
        logger.warn(
          {
            rowId: row.id,
            rowType: row.rowType,
            installmentRaw: row.installmentRaw,
            error: error instanceof Error ? error.message : String(error),
          },
          "Invalid installment row omitted from future projections",
        );
        continue;
      }

      const schedule = cardBillingCalendarService.futureInstallments(
        validStatementPeriodKey,
        parsed.current,
        parsed.total,
      );

      for (const occurrence of schedule) {
        projections.push({
          rowId: row.id,
          monthKey: occurrence.monthKey,
          label: occurrence.label,
          installmentCurrent: occurrence.installmentCurrent,
          installmentTotal: occurrence.installmentTotal,
          amountPesos: row.amountPesos,
          amountDollars: row.amountDollars,
          currencyOriginal: row.currencyOriginal,
          displayOrder: row.displayOrder,
          sectionKey: row.sectionId,
          groupKey: row.groupId ?? "",
        });
      }
    }

    logger.info(
      {
        inputRows: rows.length,
        projectedInstallments: projections.length,
        invalidInstallmentRows,
        statementPeriodKey: validStatementPeriodKey,
        firstProjectedMonth: projections[0]?.monthKey ?? null,
        lastProjectedMonth: projections.at(-1)?.monthKey ?? null,
      },
      "Installment projections calculated from accepted installment sequences",
    );

    return projections;
  }

  parseInstallment(installmentRaw: string): { current: number; total: number } {
    try {
      return cardBillingCalendarService.parseInstallment(installmentRaw);
    } catch {
      return { current: 1, total: 1 };
    }
  }

  /** Compatibility-only fallback for callers that have not yet been migrated. */
  getStatementMonthKey(rows: CardStatementRow[]): string {
    const transactionRows = rows.filter(
      (row) => row.rowType === "transaction" && row.dateIso,
    );

    logger.warn(
      { transactionRows: transactionRows.length },
      "Deprecated transaction-date statement period fallback used",
    );

    if (transactionRows.length === 0) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    }

    const dates = transactionRows.map((row) => row.dateIso!).sort();
    return dates[dates.length - 1].slice(0, 7);
  }

  aggregateByMonth(projections: InstallmentProjection[]): MonthlyProjection[] {
    const monthMap = new Map<string, MonthlyProjection>();

    for (const projection of projections) {
      if (!monthMap.has(projection.monthKey)) {
        monthMap.set(projection.monthKey, {
          monthKey: projection.monthKey,
          label: projection.label,
          totalPesos: "0.00",
          totalDollars: "0.00",
        });
      }

      const existing = monthMap.get(projection.monthKey)!;

      if (
        (projection.currencyOriginal === "ARS" || projection.currencyOriginal === "MIXED") &&
        projection.amountPesos
      ) {
        try {
          const existingCents = parseArgentinePesos(existing.totalPesos);
          const addCents = parseArgentinePesos(projection.amountPesos);
          const newTotal = existingCents + addCents;
          existing.totalPesos = (Number(newTotal) / 100).toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        } catch {
          logger.warn(
            { rowId: projection.rowId, amountPesos: projection.amountPesos },
            "Invalid ARS installment amount omitted from monthly aggregation",
          );
        }
      }

      if (
        (projection.currencyOriginal === "USD" || projection.currencyOriginal === "MIXED") &&
        projection.amountDollars
      ) {
        try {
          const existingCents = parseDollars(existing.totalDollars);
          const addCents = parseDollars(projection.amountDollars);
          const newTotal = existingCents + addCents;
          existing.totalDollars = (Number(newTotal) / 100).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        } catch {
          logger.warn(
            { rowId: projection.rowId, amountDollars: projection.amountDollars },
            "Invalid USD installment amount omitted from monthly aggregation",
          );
        }
      }
    }

    const result = Array.from(monthMap.values()).sort((left, right) =>
      left.monthKey.localeCompare(right.monthKey),
    );

    logger.info({ monthsCount: result.length }, "Monthly installment projections aggregated");
    return result;
  }
}

export const installmentProjectionService = new InstallmentProjectionService();
