import { z } from "zod";

const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const moneySchema = z.string().trim().min(1).max(40).refine((value) => {
  const compact = value.replace(/\s/g, "");
  return (
    /^\d+(?:[.,]\d{1,2})?$/.test(compact) ||
    /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(compact) ||
    /^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(compact)
  );
}, "Expected a non-negative decimal amount");

export const salaryReceiptItemKindSchema = z.enum([
  "earning",
  "deduction",
  "employer_contribution",
  "information",
]);

export const salaryReceiptPreviewSchema = z.object({
  version: z.literal("salary-receipt-v1"),
  documentType: z.literal("salary_receipt_pdf"),
  source: z.object({
    employerName: z.string().trim().min(1).max(200),
    employerTaxId: z.string().trim().max(40).nullable(),
    employeeName: z.string().trim().min(1).max(200),
    employeeTaxId: z.string().trim().max(40).nullable(),
    periodMonthKey: monthKeySchema,
    payDate: isoDateSchema.nullable(),
    currency: z.enum(["ARS", "USD"]),
  }),
  summary: z.object({
    grossAmount: moneySchema,
    deductionsAmount: moneySchema,
    netAmount: moneySchema,
  }),
  items: z.array(z.object({
    id: z.string().trim().min(1).max(120),
    displayOrder: z.number().int().min(1),
    kind: salaryReceiptItemKindSchema,
    code: z.string().trim().max(80).nullable(),
    label: z.string().trim().min(1).max(240),
    amount: moneySchema,
    sourcePage: z.number().int().min(1).nullable(),
    originalText: z.string().trim().max(2_000),
    confidence: z.number().min(0).max(1).nullable(),
  })).min(1),
  warnings: z.array(z.string().trim().min(1).max(500)),
});

export const salaryReceiptDraftIdSchema = z.string().uuid("Invalid draft identifier");
export const salaryReceiptIdSchema = z.string().uuid("Invalid receipt identifier");

export const acceptSalaryReceiptSchema = z.object({
  sourceId: z.string().uuid().optional().nullable(),
  useAsFutureBase: z.boolean().optional(),
});

const listSalaryReceiptsLimitSchema = z.string().regex(
  /^(?:[1-9]|[1-9]\d|100)$/,
  "Expected an integer between 1 and 100",
);

export const listSalaryReceiptsQuerySchema = z.object({
  limit: listSalaryReceiptsLimitSchema.optional(),
  includeReversed: z.enum(["true", "false"]).optional(),
});

export type SalaryReceiptPreviewInput = z.infer<typeof salaryReceiptPreviewSchema>;
export type AcceptSalaryReceiptPayload = z.infer<typeof acceptSalaryReceiptSchema>;
