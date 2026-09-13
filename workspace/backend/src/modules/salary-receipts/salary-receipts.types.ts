export type SalaryReceiptCurrency = "ARS" | "USD";
export type SalaryReceiptItemKind =
  | "earning"
  | "deduction"
  | "employer_contribution"
  | "information";

export interface SalaryReceiptSource {
  employerName: string;
  employerTaxId: string | null;
  employeeName: string;
  employeeTaxId: string | null;
  periodMonthKey: string;
  payDate: string | null;
  currency: SalaryReceiptCurrency;
}

export interface SalaryReceiptSummary {
  grossAmount: string;
  deductionsAmount: string;
  netAmount: string;
}

export interface SalaryReceiptItem {
  id: string;
  displayOrder: number;
  kind: SalaryReceiptItemKind;
  code: string | null;
  label: string;
  amount: string;
  sourcePage: number | null;
  originalText: string;
  confidence: number | null;
}

export interface SalaryReceiptPreview {
  version: "salary-receipt-v1";
  documentType: "salary_receipt_pdf";
  source: SalaryReceiptSource;
  summary: SalaryReceiptSummary;
  items: SalaryReceiptItem[];
  warnings: string[];
}

export interface AcceptSalaryReceiptInput {
  sourceId?: string | null;
  useAsFutureBase: boolean;
}
