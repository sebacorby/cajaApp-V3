/**
 * Tipos del dominio de finanzas personales.
 * Centralizan la forma de los datos que consume la UI.
 */

export type TransactionType = "income" | "expense";

export type TransactionStatus = "completed" | "pending";

export interface Transaction {
  id: string;
  date: string; // ISO (yyyy-mm-dd)
  description: string;
  category: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
}

export interface Category {
  id: string;
  name: string;
  /** Color de acento usado en chips y gráficos. */
  color: string;
  /** Nombre del ícono de lucide-react en kebab-case. */
  icon: string;
  amount: number;
}

export interface Budget {
  id: string;
  category: string;
  spent: number;
  limit: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  /** ISO date. */
  deadline: string;
  icon: string;
}

export type AlertSeverity = "info" | "warning" | "danger" | "success";

export interface SmartAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  icon: string;
}

export interface MonthlyPoint {
  month: string; // etiqueta corta, ej: "Ene"
  income: number;
  expenses: number;
  savings: number;
}

export interface MonthlySummary {
  balance: number;
  balanceVariation: number; // porcentaje
  income: number;
  incomeVariation: number;
  expenses: number;
  expensesVariation: number;
  savings: number;
  savingsRate: number; // 0..1
}

export interface BudgetSummary {
  totalLimit: number;
  totalSpent: number;
}

export interface UserProfile {
  name: string;
  greeting: string;
  account: string;
}

export interface FinanceSnapshot {
  user: UserProfile;
  summary: MonthlySummary;
  categories: Category[];
  budgets: Budget[];
  budgetSummary: BudgetSummary;
  transactions: Transaction[];
  goals: Goal[];
  alerts: SmartAlert[];
  evolution: MonthlyPoint[];
  healthScore: number; // 0..100
}

export type CardStatementCurrency = "ARS" | "USD";

export type CardStatementRowType =
  | "section_header"
  | "summary"
  | "consolidated_row"
  | "table_header"
  | "transaction"
  | "group_total"
  | "tax_or_charge"
  | "final_total"
  | "future_installment"
  | "legal_info";

export interface CardStatementRow {
  id: string;
  displayOrder: number;
  sourcePage: number | null;
  sectionId: string;
  sectionLabel: string;
  groupId: string | null;
  groupLabel: string | null;
  rowType: CardStatementRowType;
  editable: boolean;
  dateRaw: string | null;
  markerRaw?: string | null;
  referenceRaw: string | null;
  installmentRaw: string | null;
  receiptRaw: string | null;
  amountPesosMinor: number | null;
  amountDollarsMinor: number | null;
  originalText: string;
}

export interface CardStatementGroup {
  id: string;
  displayOrder: number;
  label: string;
  cardLast4: string | null;
  holderName: string | null;
  rows: CardStatementRow[];
  totalPesosMinor: number | null;
  totalDollarsMinor: number | null;
}

export interface CardStatementSection {
  id: string;
  displayOrder: number;
  label: string;
  rows?: CardStatementRow[];
  groups?: CardStatementGroup[];
}

export interface CardStatementPreview {
  id: string;
  sourceFileName: string;
  sourceKind: "pdf" | "csv" | "image";
  documentKind: "credit_card_statement";
  bankName: string | null;
  brandName: string | null;
  statementNumber: string | null;
  accountNumber: string | null;
  holderName: string | null;
  periodLabel: string;
  totals: {
    totalPesosMinor: number | null;
    totalDollarsMinor: number | null;
    minimumPaymentPesosMinor: number | null;
  };
  billingCycle: Array<{
    displayOrder: number;
    label: string;
    valueRaw: string;
  }>;
  sections: CardStatementSection[];
}

export interface CardStatementCellEdit {
  rowId: string;
  field:
    | "dateRaw"
    | "referenceRaw"
    | "installmentRaw"
    | "receiptRaw"
    | "amountPesosMinor"
    | "amountDollarsMinor";
  value: string | number | null;
}
