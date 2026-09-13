import type { CardStatementRow } from "@/lib/finance/card-statements-api";

/**
 * Tipos compartidos entre los módulos de la sección Tarjetas
 * (importación, preview editable, historial y compra manual).
 */

export type UIState =
  | "booting"
  | "initial"
  | "loading"
  | "preview"
  | "accepted"
  | "error";

export type EditableRowField =
  | "dateRaw"
  | "markerRaw"
  | "referenceRaw"
  | "installmentRaw"
  | "receiptRaw"
  | "amountPesos"
  | "amountDollars";

export type RowEdit = Partial<Pick<CardStatementRow, EditableRowField>>;

export type ManualPurchaseForm = {
  cardLast4: string;
  holderName: string;
  purchaseDate: string;
  description: string;
  currency: "ARS" | "USD";
  amount: string;
  installments: string;
  notes: string;
};

export const EMPTY_MANUAL_PURCHASE: ManualPurchaseForm = {
  cardLast4: "",
  holderName: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  description: "",
  currency: "ARS",
  amount: "",
  installments: "1",
  notes: "",
};
