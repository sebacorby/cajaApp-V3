import { z } from "zod";

export const budgetIdSchema = z.string().uuid("Invalid budget identifier");
export const budgetCurrencySchema = z.enum(["ARS", "USD"]);
export const budgetStatusSchema = z.enum(["active", "paused", "closed"]);
export const budgetMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

const moneySchema = z.string().trim().min(1, "Limit is required").max(80);

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid("Invalid category identifier"),
  currency: budgetCurrencySchema.default("ARS"),
  periodStart: budgetMonthSchema,
  periodEnd: budgetMonthSchema,
  limitAmount: moneySchema,
  rolloverEnabled: z.boolean().default(false),
  status: z.enum(["active", "paused"]).default("active"),
  notes: z.string().trim().max(1000).optional().nullable(),
}).superRefine((value, context) => {
  if (value.periodEnd < value.periodStart) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["periodEnd"], message: "Period end must be equal to or after its start" });
  }
});

export const updateBudgetSchema = z.object({
  categoryId: z.string().uuid("Invalid category identifier").optional(),
  currency: budgetCurrencySchema.optional(),
  periodStart: budgetMonthSchema.optional(),
  periodEnd: budgetMonthSchema.optional(),
  limitAmount: moneySchema.optional(),
  rolloverEnabled: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const changeBudgetStatusSchema = z.object({ status: budgetStatusSchema });

export const listBudgetsQuerySchema = z.object({
  from: budgetMonthSchema.optional(),
  to: budgetMonthSchema.optional(),
  status: budgetStatusSchema.optional(),
}).superRefine((value, context) => {
  if (value.from && value.to && value.to < value.from) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "Range end must be equal to or after its start" });
  }
});

export type BudgetCurrency = z.infer<typeof budgetCurrencySchema>;
export type BudgetStatus = z.infer<typeof budgetStatusSchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type ChangeBudgetStatusInput = z.infer<typeof changeBudgetStatusSchema>;
export type ListBudgetsQueryInput = z.infer<typeof listBudgetsQuerySchema>;
