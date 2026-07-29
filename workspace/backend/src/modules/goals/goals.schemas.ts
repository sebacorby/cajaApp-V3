import { z } from "zod";

export const goalIdSchema = z.string().uuid("Invalid goal identifier");
export const goalContributionIdSchema = z.string().uuid("Invalid contribution identifier");

export const goalCurrencySchema = z.enum(["ARS", "USD"]);
export const goalStatusSchema = z.enum(["active", "paused", "completed", "closed"]);

const moneySchema = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .max(80, "Amount is too long");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");

export const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmount: moneySchema,
  currency: goalCurrencySchema.default("ARS"),
  targetDate: isoDateSchema.optional().nullable(),
  status: z.enum(["active", "paused"]).default("active"),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updateGoalSchema = createGoalSchema
  .omit({ status: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const changeGoalStatusSchema = z.object({
  status: goalStatusSchema,
  note: z.string().trim().max(500).optional().nullable(),
});

export const createGoalContributionSchema = z
  .object({
    contributedOn: isoDateSchema,
    amount: moneySchema,
    notes: z.string().trim().max(500).optional().nullable(),
    referenceType: z.string().trim().min(1).max(80).optional().nullable(),
    referenceId: z.string().trim().min(1).max(160).optional().nullable(),
    referenceLabel: z.string().trim().max(200).optional().nullable(),
  })
  .superRefine((value, context) => {
    const hasType = Boolean(value.referenceType);
    const hasId = Boolean(value.referenceId);
    if (hasType !== hasId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasType ? ["referenceId"] : ["referenceType"],
        message: "referenceType and referenceId must be provided together",
      });
    }
  });

export type GoalCurrency = z.infer<typeof goalCurrencySchema>;
export type GoalStatus = z.infer<typeof goalStatusSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type ChangeGoalStatusInput = z.infer<typeof changeGoalStatusSchema>;
export type CreateGoalContributionInput = z.infer<typeof createGoalContributionSchema>;
