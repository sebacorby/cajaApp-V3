import { z } from "zod";

const DECIMAL_STRING = /^-?\d+\.\d{2}$/;

export const futureMonthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

function currentUtcMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

const queryFromSchema = z.preprocess(
  (value) => value === undefined ? currentUtcMonth() : value,
  futureMonthKeySchema,
);

const queryMonthsSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
    return value;
  },
  z.number().int().min(1, "months must be at least 1").max(24, "months must be at most 24").default(6),
);

const queryBooleanSchema = z.preprocess(
  (value) => {
    if (value === undefined) return false;
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  },
  z.boolean().default(false),
);

export const futureDebtQuerySchema = z.object({
  from: queryFromSchema,
  months: queryMonthsSchema,
  includeCurrentPeriod: queryBooleanSchema,
});

export const futureMoneySchema = z.object({
  ars: z.string().regex(DECIMAL_STRING),
  usd: z.string().regex(DECIMAL_STRING),
});

export const futureDebtRowSchema = z.object({
  id: z.string(),
  monthKey: futureMonthKeySchema,
  description: z.string(),
  installmentNumber: z.number().int().min(1),
  installmentTotal: z.number().int().min(1),
  installmentLabel: z.string(),
  amount: z.string().regex(DECIMAL_STRING),
  currency: z.enum(["ARS", "USD"]),
  originType: z.enum(["card_statement", "manual_card_purchase"]),
  originReference: z.string(),
  sourceLabel: z.string(),
  cardId: z.string(),
  cardLast4: z.string(),
  holderName: z.string(),
  cardLabel: z.string(),
  status: z.enum(["confirmed", "estimated"]),
  rowType: z.literal("future_installment"),
});

export const futurePendingRowSchema = z.object({
  id: z.string(),
  monthKey: futureMonthKeySchema,
  description: z.string(),
  installmentNumber: z.number().int().min(1).nullish(),
  installmentTotal: z.number().int().min(1).nullish(),
  installmentLabel: z.string(),
  amount: z.string().regex(DECIMAL_STRING),
  currency: z.enum(["ARS", "USD"]).nullish(),
  originType: z.enum(["card_statement", "manual_card_purchase"]),
  originReference: z.string(),
  sourceLabel: z.string(),
  cardId: z.string().nullish(),
  cardLast4: z.string().nullish(),
  holderName: z.string().nullish(),
  cardLabel: z.string().nullish(),
  status: z.enum(["confirmed", "estimated"]),
  rowType: z.literal("future_installment"),
  diagnostic: z.enum(["invalid_installment", "missing_currency", "missing_card_reference", "invalid_amount"]),
  diagnosticDetail: z.string(),
});

export const futureCardSchema = z.object({
  cardId: z.string(),
  cardLast4: z.string(),
  holderName: z.string(),
  cardLabel: z.string(),
  rows: z.array(futureDebtRowSchema),
  totals: futureMoneySchema,
});

export const futureMonthSchema = z.object({
  monthKey: futureMonthKeySchema,
  label: z.string(),
  totals: futureMoneySchema,
  cards: z.array(futureCardSchema),
  dataQuality: z.object({
    status: z.enum(["complete", "partial"]),
    warnings: z.array(z.string()),
  }),
});

export const futureDebtResponseSchema = z.object({
  range: z.object({
    from: futureMonthKeySchema,
    to: futureMonthKeySchema,
    months: z.number().int().min(1).max(24),
    includeCurrentPeriod: z.boolean(),
    currentPeriodKey: futureMonthKeySchema.nullish(),
  }),
  summary: futureMoneySchema,
  horizon: z.object({
    persisted: z.boolean(),
    persistedMonths: z.array(futureMonthKeySchema),
  }),
  months: z.array(futureMonthSchema),
  pendientes: z.object({
    rows: z.array(futurePendingRowSchema),
    diagnostics: z.array(z.string()),
  }),
  diagnostics: z.object({
    duplicateOccurrences: z.number().int().nonnegative(),
    invalidInstallmentRows: z.number().int().nonnegative(),
    missingCurrencyRows: z.number().int().nonnegative(),
    missingCardRows: z.number().int().nonnegative(),
    warnings: z.array(z.string()),
  }),
});

export type FutureDebtQueryInput = z.infer<typeof futureDebtQuerySchema>;
export type FutureDebtResponseOutput = z.infer<typeof futureDebtResponseSchema>;
// Backward-compatible aliases are intentionally limited to the new contract.
export type FutureOverviewQueryInput = FutureDebtQueryInput;
export const futureOverviewQuerySchema = futureDebtQuerySchema;
