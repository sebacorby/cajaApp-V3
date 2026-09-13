export type CardStatementRowType =
  | "section_header"
  | "group_header"
  | "transaction"
  | "group_total"
  | "consolidated_row"
  | "tax"
  | "charge"
  | "statement_total"
  | "future_installment_reference"
  | "legal_text"
  | "unknown";

export type CurrencyOriginal = "ARS" | "USD" | "MIXED" | "UNKNOWN";

export interface CardStatementRow {
  id: string;
  displayOrder: number;
  sourcePage: number | null;

  sectionId: string;
  sectionLabel: string;

  groupId: string | null;
  groupLabel: string | null;
  groupOrder: number | null;

  rowType: CardStatementRowType;
  editable: boolean;

  dateRaw: string | null;
  dateIso: string | null;

  markerRaw: string | null;
  referenceRaw: string | null;
  installmentRaw: string | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;

  receiptRaw: string | null;

  amountPesos: string | null;
  amountDollars: string | null;

  currencyOriginal: CurrencyOriginal;
  originalText: string;
  confidence: number | null;
  warnings: string[];
}

export interface CardStatementSection {
  id: string;
  displayOrder: number;
  label: string;
}

export interface CardStatementGroup {
  id: string;
  displayOrder: number;
  label: string;
  cardLast4: string | null;
  holderName: string | null;
}

export interface CardStatementPreview {
  statementId: string | null;
  source: {
    bankName: string | null;
    brand: string | null;
    statementNumber: string | null;
    pageCount: number;
  };
  summary: {
    totalPesos: string | null;
    totalDollars: string | null;
    minimumPaymentPesos: string | null;
    currentDueDate: string | null;
    nextClosingDate: string | null;
    nextDueDate: string | null;
  };
  sections: CardStatementSection[];
  groups: CardStatementGroup[];
  rows: CardStatementRow[];
  futureInstallmentsBlock: CardStatementRow[];
}

export interface ImportResult {
  draftId: string;
  document: {
    id: string;
    fileName: string;
    mimeType: string;
    sha256: string;
    pageCount: number;
  };
  status: string;
  warnings: string[];
  preview: CardStatementPreview;
}


export interface CardExchangeRate {
  configured: boolean;
  pair: "USD_ARS";
  rate: string | null;
  effectiveDate: string | null;
  source: string | null;
  status: "active" | "missing" | string;
  updatedAt: string | null;
}

export interface CardMoneyEquivalents {
  usdEquivalentPesos: string | null;
  combinedTotalPesos: string | null;
}


export interface CardStatementHistoryMetadata {
  periodKey: string | null;
  historyKey: string | null;
  version: number;
  isActiveForPeriod: boolean;
  archivedAt: string | null;
  archivedReason: string | null;
}

export interface CardStatementTraceability {
  statement: {
    id: string;
    status: string;
    periodKey: string | null;
    version: number;
    isActiveForPeriod: boolean;
    archivedAt: string | null;
    archivedReason: string | null;
    createdAt: string;
    updatedAt: string;
  };
  document: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    pageCount: number | null;
    createdAt: string;
  };
  draft: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  aiRun: {
    id: string;
    status: string;
    provider: string;
    model: string;
    promptHash: string;
    promptVersion: string | null;
    rawResponseHash: string | null;
    validationErrors: string | null;
    retries: number;
    createdAt: string;
    completedAt: string | null;
  } | null;
  versions: Array<{
    id: string;
    status: string;
    version: number;
    isActiveForPeriod: boolean;
    createdAt: string;
    archivedAt: string | null;
    archivedReason: string | null;
    document: { fileName: string; sha256: string };
  }>;
}

export interface AcceptResult {
  statementId: string;
  status: string;
  updatedValues: {
    months: MonthlyProjection[];
    rows: unknown[];
  };
  exchangeRate: CardExchangeRate;
  warnings: string[];
}

export interface MonthlyProjection {
  monthKey: string;
  label: string;
  totalPesos: string;
  totalDollars: string;
  usdEquivalentPesos?: string | null;
  combinedTotalPesos?: string | null;
}
