import { z } from "zod";

export const cardStatementRowTypeSchema = z.enum([
  "section_header",
  "group_header",
  "transaction",
  "group_total",
  "consolidated_row",
  "tax",
  "charge",
  "statement_total",
  "future_installment_reference",
  "legal_text",
  "unknown",
]);

export const currencyOriginalSchema = z.enum([
  "ARS",
  "USD",
  "MIXED",
  "UNKNOWN",
]);

export const cardStatementRowSchema = z.object({
  id: z.string(),
  displayOrder: z.number(),
  sourcePage: z.number().nullable(),
  sectionId: z.string(),
  sectionLabel: z.string(),
  groupId: z.string().nullable(),
  groupLabel: z.string().nullable(),
  groupOrder: z.number().nullable(),
  rowType: cardStatementRowTypeSchema,
  editable: z.boolean(),
  dateRaw: z.string().nullable(),
  dateIso: z.string().nullable(),
  markerRaw: z.string().nullable(),
  referenceRaw: z.string().nullable(),
  installmentRaw: z.string().nullable(),
  installmentCurrent: z.number().nullable(),
  installmentTotal: z.number().nullable(),
  receiptRaw: z.string().nullable(),
  amountPesos: z.string().nullable(),
  amountDollars: z.string().nullable(),
  currencyOriginal: currencyOriginalSchema,
  originalText: z.string(),
  confidence: z.number().nullable(),
  warnings: z.array(z.string()),
});

export const cardStatementSectionSchema = z.object({
  id: z.string(),
  displayOrder: z.number(),
  label: z.string(),
});

export const cardStatementGroupSchema = z.object({
  id: z.string(),
  displayOrder: z.number(),
  label: z.string(),
  cardLast4: z.string().nullable(),
  holderName: z.string().nullable(),
});

export const cardStatementPreviewSchema = z.object({
  statementId: z.string().nullable(),
  source: z.object({
    bankName: z.string().nullable(),
    brand: z.string().nullable(),
    statementNumber: z.string().nullable(),
    pageCount: z.number(),
  }),
  summary: z.object({
    totalPesos: z.string().nullable(),
    totalDollars: z.string().nullable(),
    minimumPaymentPesos: z.string().nullable(),
    currentDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "currentDueDate must be ISO YYYY-MM-DD")
      .nullable(),
    nextClosingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "nextClosingDate must be ISO YYYY-MM-DD")
      .nullable(),
    nextDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "nextDueDate must be ISO YYYY-MM-DD")
      .nullable(),
  }),
  sections: z.array(cardStatementSectionSchema),
  groups: z.array(cardStatementGroupSchema),
  rows: z.array(cardStatementRowSchema),
  futureInstallmentsBlock: z.array(cardStatementRowSchema),
});

export const importResultSchema = z.object({
  draftId: z.string(),
  document: z.object({
    id: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
    sha256: z.string(),
    pageCount: z.number(),
  }),
  status: z.string(),
  warnings: z.array(z.string()),
  preview: cardStatementPreviewSchema,
});

export const manualPurchaseSchema = z.object({
  cardLast4: z.string().length(4),
  holderName: z.string().min(1),
  purchaseDate: z.string(),
  description: z.string().min(1),
  currency: z.enum(["ARS", "USD"]),
  amount: z.string(),
  installments: z.number().int().positive(),
  notes: z.string().optional(),
});

export type CardStatementRowInput = z.infer<typeof cardStatementRowSchema>;
export type CardStatementPreviewInput = z.infer<
  typeof cardStatementPreviewSchema
>;
export type ManualPurchaseInput = z.infer<typeof manualPurchaseSchema>;

const exchangeRateValueSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    const compact = value.replace(/\s/g, "");
    const normalized = compact.includes(",")
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact;
    return /^\d+(?:\.\d{1,2})?$/.test(normalized) && Number(normalized) > 0;
  }, "La cotización debe ser mayor que cero");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "La fecha de cotización no es válida");

export const exchangeRateUpdateSchema = z.object({
  rate: exchangeRateValueSchema,
  effectiveDate: isoDateSchema,
});

export const statementArchiveSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const cardStatementDraftSummarySchema = z.object({
  id: z.string(),
  status: z.enum(["preview_ready", "failed"]),
  createdAt: z.string(),
  fileName: z.string(),
  errorMessage: z.string().optional(),
});
