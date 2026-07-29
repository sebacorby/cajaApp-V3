import { addMonths, getMonthLabel } from "../../shared/dates.js";
import { ValidationError } from "../../shared/errors.js";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const INSTALLMENT_PATTERN = /^(\d{1,3})\s*\/\s*(\d{1,3})$/;

export interface ParsedInstallment {
  current: number;
  total: number;
}

export interface ScheduledInstallment {
  monthKey: string;
  label: string;
  installmentCurrent: number;
  installmentTotal: number;
}

export type ManualPurchaseAnchorReason =
  | "next_due_cycle"
  | "after_next_closing"
  | "next_due_without_closing"
  | "statement_period_fallback";

export interface ManualPurchaseBillingAnchor {
  firstBillingMonthKey: string;
  dueDateEstimated: boolean;
  reason: ManualPurchaseAnchorReason;
}

export interface StatementPeriodMetadata {
  periodKey?: string | null;
  currentDueDate?: string | null;
  nextClosingDate?: string | null;
  nextDueDate?: string | null;
}

export interface ManualPurchaseAnchorInput extends StatementPeriodMetadata {
  purchaseDate: string;
}

function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export class CardBillingCalendarService {
  requireMonthKey(value: string, fieldName = "monthKey"): string {
    const normalized = value.trim();

    if (!MONTH_KEY_PATTERN.test(normalized)) {
      throw new ValidationError(`${fieldName} must use YYYY-MM format`);
    }

    return normalized;
  }

  requireIsoDate(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!isRealIsoDate(normalized)) {
      throw new ValidationError(`${fieldName} must be a valid ISO date`);
    }

    return normalized;
  }

  monthKeyFromIsoDate(value: string, fieldName: string): string {
    return this.requireIsoDate(value, fieldName).slice(0, 7);
  }

  resolveStatementPeriodKey(metadata: StatementPeriodMetadata): string {
    if (metadata.periodKey?.trim()) {
      return this.requireMonthKey(metadata.periodKey, "statement periodKey");
    }

    const dateCandidates: Array<[string, string | null | undefined]> = [
      ["currentDueDate", metadata.currentDueDate],
      ["nextClosingDate", metadata.nextClosingDate],
      ["nextDueDate", metadata.nextDueDate],
    ];

    for (const [fieldName, value] of dateCandidates) {
      if (!value?.trim()) continue;

      try {
        return this.monthKeyFromIsoDate(value, fieldName);
      } catch {
        // Try the next authoritative statement metadata field.
      }
    }

    throw new ValidationError(
      "The statement has no valid period metadata; installment projections cannot be calculated",
    );
  }

  parseInstallment(installmentRaw: string): ParsedInstallment {
    const normalized = installmentRaw.trim();
    const match = normalized.match(INSTALLMENT_PATTERN);

    if (!match) {
      throw new ValidationError(`Invalid installment value: ${installmentRaw}`);
    }

    const current = Number.parseInt(match[1], 10);
    const total = Number.parseInt(match[2], 10);

    if (
      !Number.isSafeInteger(current)
      || !Number.isSafeInteger(total)
      || current < 1
      || total < 1
      || current > total
    ) {
      throw new ValidationError(`Invalid installment sequence: ${installmentRaw}`);
    }

    return { current, total };
  }

  futureInstallments(
    statementPeriodKey: string,
    installmentCurrent: number,
    installmentTotal: number,
  ): ScheduledInstallment[] {
    const anchorMonthKey = this.requireMonthKey(
      statementPeriodKey,
      "statementPeriodKey",
    );

    if (
      !Number.isSafeInteger(installmentCurrent)
      || !Number.isSafeInteger(installmentTotal)
      || installmentCurrent < 1
      || installmentTotal < 1
      || installmentCurrent > installmentTotal
    ) {
      throw new ValidationError(
        `Invalid installment sequence: ${installmentCurrent}/${installmentTotal}`,
      );
    }

    const schedule: ScheduledInstallment[] = [];

    for (
      let installmentNumber = installmentCurrent + 1;
      installmentNumber <= installmentTotal;
      installmentNumber += 1
    ) {
      const monthOffset = installmentNumber - installmentCurrent;
      const monthKey = addMonths(anchorMonthKey, monthOffset);

      schedule.push({
        monthKey,
        label: getMonthLabel(monthKey),
        installmentCurrent: installmentNumber,
        installmentTotal,
      });
    }

    return schedule;
  }

  resolveManualPurchaseAnchor(
    input: ManualPurchaseAnchorInput,
  ): ManualPurchaseBillingAnchor {
    const purchaseDate = this.requireIsoDate(input.purchaseDate, "purchaseDate");
    const statementPeriodKey = this.resolveStatementPeriodKey(input);

    const hasNextClosingDate = Boolean(input.nextClosingDate?.trim());
    const hasNextDueDate = Boolean(input.nextDueDate?.trim());

    if (hasNextClosingDate && hasNextDueDate) {
      const nextClosingDate = this.requireIsoDate(
        input.nextClosingDate!,
        "nextClosingDate",
      );
      const nextDueMonthKey = this.monthKeyFromIsoDate(
        input.nextDueDate!,
        "nextDueDate",
      );

      if (purchaseDate <= nextClosingDate) {
        return {
          firstBillingMonthKey: nextDueMonthKey,
          dueDateEstimated: false,
          reason: "next_due_cycle",
        };
      }

      return {
        firstBillingMonthKey: addMonths(nextDueMonthKey, 1),
        dueDateEstimated: true,
        reason: "after_next_closing",
      };
    }

    if (hasNextDueDate) {
      return {
        firstBillingMonthKey: this.monthKeyFromIsoDate(
          input.nextDueDate!,
          "nextDueDate",
        ),
        dueDateEstimated: true,
        reason: "next_due_without_closing",
      };
    }

    return {
      firstBillingMonthKey: addMonths(statementPeriodKey, 1),
      dueDateEstimated: true,
      reason: "statement_period_fallback",
    };
  }

  purchaseInstallments(
    firstBillingMonthKey: string,
    installmentTotal: number,
  ): ScheduledInstallment[] {
    const anchorMonthKey = this.requireMonthKey(
      firstBillingMonthKey,
      "firstBillingMonthKey",
    );

    if (!Number.isSafeInteger(installmentTotal) || installmentTotal < 1) {
      throw new ValidationError("installmentTotal must be a positive integer");
    }

    return Array.from({ length: installmentTotal }, (_, index) => {
      const monthKey = addMonths(anchorMonthKey, index);

      return {
        monthKey,
        label: getMonthLabel(monthKey),
        installmentCurrent: index + 1,
        installmentTotal,
      };
    });
  }
}

export const cardBillingCalendarService = new CardBillingCalendarService();
