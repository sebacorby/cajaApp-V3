export type FutureCurrency = "ARS" | "USD";
export type FutureSourceType = "card_statement" | "manual_card_purchase";
export type FutureStatus = "confirmed" | "estimated";
export type FutureRowType = "future_installment";
export type PendingDiagnostic =
  | "invalid_installment"
  | "missing_currency"
  | "missing_card_reference"
  | "invalid_amount";

export interface RawProjection {
  id: string;
  statementId: string;
  rowId: string;
  monthKey: string;
  label: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
  currencyOriginal: string | null;
  isManual: boolean;
}

export interface RawCardStatement {
  id: string;
  status: string;
  periodLabel: string | null;
  periodKey: string | null;
  isActiveForPeriod: boolean;
  bankName?: string | null;
  brand?: string | null;
  holderName?: string | null;
}

export interface RawCardStatementGroup {
  id: string;
  statementId: string;
  groupKey: string;
  label: string;
  cardLast4: string | null;
  holderName: string | null;
}

export interface RawCardStatementRow {
  id: string;
  statementId: string;
  groupKey: string | null;
  rowType: string;
  referenceRaw: string | null;
  dateIso: string | null;
  installmentRaw: string | null;
  originalText: string;
  description?: string | null;
  currencyOriginal?: string | null;
  amountPesosRaw?: string | null;
  amountDollarsRaw?: string | null;
}

export interface RawManualPurchase {
  id: string;
  statementId: string;
  cardLast4: string;
  holderName: string;
  purchaseDate: string;
  description: string;
  currency: string;
  amountRaw: string;
  installments: number;
  notes?: string | null;
}

export interface FutureDebtReader {
  cardInstallmentProjection: {
    findMany(args?: unknown): Promise<RawProjection[]>;
  };
  cardStatement: {
    findFirst(args?: unknown): Promise<RawCardStatement | null>;
    findMany(args?: unknown): Promise<RawCardStatement[]>;
  };
  cardStatementRow: {
    findMany(args?: unknown): Promise<RawCardStatementRow[]>;
  };
  cardStatementGroup: {
    findMany(args?: unknown): Promise<RawCardStatementGroup[]>;
  };
  manualCardPurchase: {
    findMany(args?: unknown): Promise<RawManualPurchase[]>;
  };
}

export interface FutureDebtLogger {
  warn?(object: unknown, message?: string): void;
  info?(object: unknown, message?: string): void;
}

export interface FutureDebtQuery {
  from: string;
  months: number;
  includeCurrentPeriod: boolean;
}

export interface FutureOccurrence {
  id: string;
  sourceType: FutureSourceType;
  sourceId: string;
  statementId: string;
  statementPeriodKey: string | null;
  isManual: boolean;
  monthKey: string;
  label: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
  currencyOriginal: string | null;
  description: string;
  dateIso: string | null;
  referenceRaw: string | null;
  cardId: string | null;
  cardLast4: string | null;
  holderName: string | null;
  cardLabel: string | null;
  originReference: string;
  sourceLabel: string;
  status: "confirmed";
  rowType: FutureRowType;
}

export interface MoneyBucket {
  ars: bigint;
  usd: bigint;
}

export interface FutureDebtRow {
  id: string;
  sourceId: string;
  dateIso: string | null;
  monthKey: string;
  description: string;
  installmentNumber: number;
  installmentTotal: number;
  installmentLabel: string;
  amount: string;
  currency: FutureCurrency;
  originType: FutureSourceType;
  originReference: string;
  sourceLabel: string;
  cardId: string;
  cardLast4: string;
  holderName: string;
  cardLabel: string;
  status: FutureStatus;
  rowType: FutureRowType;
}

export interface FuturePendingRow extends Omit<
  FutureDebtRow,
  | "currency"
  | "installmentNumber"
  | "installmentTotal"
  | "cardId"
  | "cardLast4"
  | "holderName"
  | "cardLabel"
> {
  installmentNumber: number | null;
  installmentTotal: number | null;
  currency: FutureCurrency | null;
  cardId: string | null;
  cardLast4: string | null;
  holderName: string | null;
  cardLabel: string | null;
  diagnostic: PendingDiagnostic;
  diagnosticDetail: string;
}

export interface FutureCardGroup {
  cardId: string;
  cardLast4: string;
  holderName: string;
  cardLabel: string;
  rows: FutureDebtRow[];
  totals: { ars: string; usd: string };
}

export interface FutureMonth {
  monthKey: string;
  label: string;
  totals: { ars: string; usd: string };
  cards: FutureCardGroup[];
  dataQuality: { status: "complete" | "partial"; warnings: string[] };
}

export interface FutureDebtResponse {
  range: {
    from: string;
    to: string;
    months: number;
    includeCurrentPeriod: boolean;
    currentPeriodKey: string | null;
  };
  summary: { ars: string; usd: string };
  horizon: { persisted: boolean; persistedMonths: string[] };
  months: FutureMonth[];
  pendientes: { rows: FuturePendingRow[]; diagnostics: string[] };
  diagnostics: {
    duplicateOccurrences: number;
    invalidInstallmentRows: number;
    missingCurrencyRows: number;
    missingCardRows: number;
    warnings: string[];
  };
}

export interface ValidityDiagnostics {
  duplicateOccurrences: number;
  invalidInstallmentRows: number;
  missingCurrencyRows: number;
  missingCardRows: number;
  warnings: string[];
}

export interface PendingOccurrence extends FutureOccurrence {
  diagnostic: PendingDiagnostic;
  diagnosticDetail: string;
}
