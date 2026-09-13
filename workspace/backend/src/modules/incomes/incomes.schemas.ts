import { z } from "zod";

export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

export const incomeEntityIdSchema = z.string().uuid("Invalid identifier");

const moneySchema = z.string().trim().min(1, "Amount is required");

const percentSchema = z
  .string()
  .trim()
  .regex(/^-?\d+(?:[.,]\d{1,2})?$/, "Invalid percentage")
  .refine((value) => {
    const numeric = Number(value.replace(",", "."));
    return Number.isFinite(numeric) && numeric > -100 && numeric <= 1000;
  }, "Percentage must be greater than -100 and at most 1000");

export const incomeSourceKindSchema = z.enum([
  "salary",
  "benefit",
  "freelance",
  "other",
]);

export const incomeCurrencySchema = z.enum(["ARS", "USD"]);

export const incomeEventKindSchema = z.enum([
  "monthly_override",
  "permanent_adjustment",
  "bonus",
  "aguinaldo",
  "extra",
  "other",
]);

export const incomeEventStatusSchema = z.enum(["actual", "projected"]);

export const createIncomeSourceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  employer: z.string().trim().max(160).optional().nullable(),
  kind: incomeSourceKindSchema.default("salary"),
  currency: incomeCurrencySchema.default("ARS"),
  baseAmount: moneySchema,
  startMonthKey: monthKeySchema,
  paymentDay: z.number().int().min(1).max(31).optional().nullable(),
  increaseEveryMonths: z.number().int().min(1).max(24).default(3),
  increasePercent: percentSchema.default("0"),
  active: z.boolean().default(true),
});

export const updateIncomeSourceSchema = createIncomeSourceSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const createIncomeEventSchema = z
  .object({
    sourceId: z.string().uuid().optional().nullable(),
    monthKey: monthKeySchema,
    kind: incomeEventKindSchema,
    currency: incomeCurrencySchema.optional(),
    amount: moneySchema,
    label: z.string().trim().min(1).max(160),
    status: incomeEventStatusSchema.default("projected"),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, context) => {
    const sourceBound =
      value.kind === "monthly_override" || value.kind === "permanent_adjustment";

    if (sourceBound && !value.sourceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceId"],
        message: `${value.kind} requires sourceId`,
      });
    }

    if (!sourceBound && value.sourceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceId"],
        message: `${value.kind} must not include sourceId`,
      });
    }

    if (!sourceBound && !value.currency) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currency"],
        message: "Currency is required for one-off income events",
      });
    }
  });

export type CreateIncomeSourceInput = z.infer<typeof createIncomeSourceSchema>;
export type UpdateIncomeSourceInput = z.infer<typeof updateIncomeSourceSchema>;
export type CreateIncomeEventInput = z.infer<typeof createIncomeEventSchema>;
