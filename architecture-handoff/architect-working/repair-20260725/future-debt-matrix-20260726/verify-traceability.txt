import { amountCentsForOccurrence, centsToDecimalString } from "./amount.js";
import { isSupportedCurrency } from "./currency.js";
import type {
  FutureDebtRow,
  FutureOccurrence,
  FuturePendingRow,
  FutureSourceType,
  PendingOccurrence,
} from "../future.types.js";

export function confirmedStatus(): "confirmed" {
  return "confirmed";
}

export function normalizeSourceType(isManual: boolean): FutureSourceType {
  return isManual ? "manual_card_purchase" : "card_statement";
}

export function toTraceability(occurrence: FutureOccurrence): FutureDebtRow {
  if (!isSupportedCurrency(occurrence.currencyOriginal)) {
    throw new Error("Cannot trace an occurrence without a supported currency");
  }
  if (
    occurrence.installmentCurrent === null ||
    occurrence.installmentTotal === null
  ) {
    throw new Error("Cannot trace an occurrence without an installment sequence");
  }

  const amount = amountCentsForOccurrence(occurrence);
  return {
    id: occurrence.id,
    sourceId: occurrence.sourceId,
    dateIso: occurrence.dateIso,
    monthKey: occurrence.monthKey,
    description: occurrence.description,
    installmentNumber: occurrence.installmentCurrent,
    installmentTotal: occurrence.installmentTotal,
    installmentLabel: `${occurrence.installmentCurrent}/${occurrence.installmentTotal}`,
    amount: centsToDecimalString(amount.cents),
    currency: amount.currency,
    originType: occurrence.sourceType,
    originReference: occurrence.originReference,
    sourceLabel: occurrence.sourceLabel,
    cardId: occurrence.cardId!,
    cardLast4: occurrence.cardLast4!.trim(),
    holderName: occurrence.holderName?.trim() || "Sin titular",
    cardLabel: occurrence.cardLabel ?? occurrence.sourceLabel,
    status: confirmedStatus(),
    rowType: "future_installment",
  };
}

export function toPendingTraceability(
  occurrence: PendingOccurrence,
): FuturePendingRow {
  let currency: "ARS" | "USD" | null = isSupportedCurrency(
    occurrence.currencyOriginal,
  )
    ? occurrence.currencyOriginal
    : null;
  let amount = "0.00";

  if (currency) {
    try {
      amount = centsToDecimalString(amountCentsForOccurrence(occurrence).cents);
    } catch {
      currency = null;
    }
  }

  return {
    id: occurrence.id,
    sourceId: occurrence.sourceId,
    dateIso: occurrence.dateIso,
    monthKey: occurrence.monthKey,
    description: occurrence.description,
    installmentNumber: occurrence.installmentCurrent,
    installmentTotal: occurrence.installmentTotal,
    installmentLabel:
      occurrence.installmentCurrent !== null &&
      occurrence.installmentTotal !== null
        ? `${occurrence.installmentCurrent}/${occurrence.installmentTotal}`
        : occurrence.label || "—",
    amount,
    currency,
    originType: occurrence.sourceType,
    originReference: occurrence.originReference,
    sourceLabel: occurrence.sourceLabel,
    cardId: occurrence.cardId,
    cardLast4: occurrence.cardLast4,
    holderName: occurrence.holderName,
    cardLabel: occurrence.cardLabel,
    status: confirmedStatus(),
    rowType: "future_installment",
    diagnostic: occurrence.diagnostic,
    diagnosticDetail: occurrence.diagnosticDetail,
  };
}
