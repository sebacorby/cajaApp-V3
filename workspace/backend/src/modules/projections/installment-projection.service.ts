import { logger } from "../../shared/logger.js";
import { getMonthKey, getMonthLabel, addMonths } from "../../shared/dates.js";
import type { CardStatementRow, MonthlyProjection } from "../cards/cards.types.js";
import { parseArgentinePesos, parseDollars } from "../../shared/money.js";

export interface InstallmentProjection {
  rowId: string;
  monthKey: string;
  label: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  amountPesos: string | null;
  amountDollars: string | null;
  currencyOriginal: string;
}

export class InstallmentProjectionService {
  calculateProjections(
    rows: CardStatementRow[],
    statementMonthKey: string
  ): InstallmentProjection[] {
    const projections: InstallmentProjection[] = [];

    for (const row of rows) {
      if (row.rowType === "transaction" && row.installmentRaw) {
        const parsed = this.parseInstallment(row.installmentRaw);

        if (parsed.current >= parsed.total) {
          continue;
        }

        const remainingInstallments = parsed.total - parsed.current;

        for (let i = 1; i <= remainingInstallments; i++) {
          const futureMonthKey = addMonths(statementMonthKey, i);

          projections.push({
            rowId: row.id,
            monthKey: futureMonthKey,
            label: getMonthLabel(futureMonthKey),
            installmentCurrent: parsed.current + i,
            installmentTotal: parsed.total,
            amountPesos: row.amountPesos,
            amountDollars: row.amountDollars,
            currencyOriginal: row.currencyOriginal,
          });
        }
      }
    }

    logger.info({
      inputRows: rows.length,
      projectedInstallments: projections.length,
      statementMonthKey,
    }, "Installment projections calculated");

    return projections;
  }

  parseInstallment(installmentRaw: string): { current: number; total: number } {
    if (!installmentRaw || installmentRaw.trim() === "") {
      return { current: 1, total: 1 };
    }

    const parts = installmentRaw.split("/");
    if (parts.length !== 2) {
      return { current: 1, total: 1 };
    }

    const current = parseInt(parts[0].trim(), 10);
    const total = parseInt(parts[1].trim(), 10);

    if (isNaN(current) || isNaN(total)) {
      return { current: 1, total: 1 };
    }

    return { current, total };
  }

  getStatementMonthKey(rows: CardStatementRow[]): string {
    const transactionRows = rows.filter(r => r.rowType === "transaction" && r.dateIso);

    if (transactionRows.length === 0) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    }

    const dates = transactionRows.map(r => r.dateIso!).sort();
    const latestDate = dates[dates.length - 1];
    return latestDate.slice(0, 7);
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

      if ((projection.currencyOriginal === "ARS" || projection.currencyOriginal === "MIXED") && projection.amountPesos) {
        try {
          const existingCents = parseArgentinePesos(existing.totalPesos);
          const addCents = parseArgentinePesos(projection.amountPesos);
          const newTotal = existingCents + addCents;
          existing.totalPesos = (Number(newTotal) / 100).toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        } catch {
          // Skip invalid amounts
        }
      }

      if ((projection.currencyOriginal === "USD" || projection.currencyOriginal === "MIXED") && projection.amountDollars) {
        try {
          const existingCents = parseDollars(existing.totalDollars);
          const addCents = parseDollars(projection.amountDollars);
          const newTotal = existingCents + addCents;
          existing.totalDollars = (Number(newTotal) / 100).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        } catch {
          // Skip invalid amounts
        }
      }
    }

    const result = Array.from(monthMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );

    logger.info({ monthsCount: result.length }, "Monthly projections aggregated");

    return result;
  }
}

export const installmentProjectionService = new InstallmentProjectionService();
