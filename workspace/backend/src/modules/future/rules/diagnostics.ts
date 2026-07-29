import { amountCentsForOccurrence } from "./amount.js";
import { isValidInstallment } from "./exclusion.js";
import { isSupportedCurrency } from "./currency.js";
import type {
  FutureOccurrence,
  PendingDiagnostic,
  PendingOccurrence,
  ValidityDiagnostics,
} from "../future.types.js";

export interface ValidityPartition {
  included: FutureOccurrence[];
  pending: PendingOccurrence[];
  diagnostics: ValidityDiagnostics;
}

export function emptyDiagnostics(): ValidityDiagnostics {
  return {
    duplicateOccurrences: 0,
    invalidInstallmentRows: 0,
    missingCurrencyRows: 0,
    missingCardRows: 0,
    warnings: [],
  };
}

function pending(
  occurrence: FutureOccurrence,
  diagnostic: PendingDiagnostic,
  detail: string,
): PendingOccurrence {
  return { ...occurrence, diagnostic, diagnosticDetail: detail };
}

export function partitionByValidity(occurrences: readonly FutureOccurrence[]): ValidityPartition {
  const included: FutureOccurrence[] = [];
  const pendingRows: PendingOccurrence[] = [];
  const diagnostics = emptyDiagnostics();

  for (const occurrence of occurrences) {
    if (!isValidInstallment({
      current: occurrence.installmentCurrent,
      total: occurrence.installmentTotal,
    })) {
      diagnostics.invalidInstallmentRows += 1;
      pendingRows.push(pending(
        occurrence,
        "invalid_installment",
        "La ocurrencia no contiene una secuencia de cuotas válida; no se derivó deuda futura.",
      ));
      continue;
    }

    if (!isSupportedCurrency(occurrence.currencyOriginal)) {
      diagnostics.missingCurrencyRows += 1;
      pendingRows.push(pending(
        occurrence,
        "missing_currency",
        "La moneda de la ocurrencia no es ARS ni USD; no se asumió una moneda por defecto.",
      ));
      continue;
    }

    if (!occurrence.cardId || !occurrence.cardLast4?.trim()) {
      diagnostics.missingCardRows += 1;
      pendingRows.push(pending(
        occurrence,
        "missing_card_reference",
        "La ocurrencia no tiene una referencia de tarjeta identificable y no se sumó a una tarjeta.",
      ));
      continue;
    }

    try {
      amountCentsForOccurrence(occurrence);
    } catch {
      pendingRows.push(pending(
        occurrence,
        "invalid_amount",
        "El importe de la ocurrencia no pudo interpretarse de forma segura.",
      ));
      continue;
    }

    included.push(occurrence);
  }

  return { included, pending: pendingRows, diagnostics };
}
