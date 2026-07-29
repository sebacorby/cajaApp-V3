import { z } from "zod";

export const movementEntityIdSchema = z.string().uuid("Invalid identifier");

export const movementDateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/, "Expected YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");

export const movementTypeSchema = z.enum(["income", "expense"]);
export const movementCurrencySchema = z.enum(["ARS", "USD"]);
export const movementStatusSchema = z.enum(["actual", "pending", "projected", "voided"]);

export const manualMovementSourceTypeSchema = z.enum([
  "manual_cash",
  "manual_income",
  "manual_unexpected",
  "manual_transfer",
  "manual_adjustment",
]);

export const categoryAssignableSourceTypeSchema = z.union([
  manualMovementSourceTypeSchema,
  z.literal("debit_csv"),
]);

const moneySchema = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .max(80, "Amount is too long");

const categoryKeywordSchema = z.string().trim().min(2).max(120);

export const createMovementCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a six digit hex color")
    .default("#64748b"),
  icon: z.string().trim().min(1).max(80).default("circle"),
  keywords: z.array(categoryKeywordSchema).max(50).default([]),
});

export const updateMovementCategorySchema = createMovementCategorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const listMovementCategoriesQuerySchema = z.object({
  includeInactive: z
    .preprocess(
      (value) => value === true || value === "true" || value === "1",
      z.boolean(),
    )
    .default(false),
});

export const archiveMovementCategorySchema = z.object({
  replacementCategoryId: movementEntityIdSchema.optional().nullable(),
});

export const assignMovementCategorySchema = z.object({
  sourceType: categoryAssignableSourceTypeSchema,
  sourceId: movementEntityIdSchema,
  categoryId: movementEntityIdSchema.optional().nullable(),
});

export const suggestMovementCategorySchema = z.object({
  description: z.string().trim().min(1).max(500),
  reference: z.string().trim().max(500).optional().nullable(),
  sourceType: z.string().trim().max(80).optional().nullable(),
});

export const createManualMovementSchema = z.object({
  occurredOn: movementDateSchema,
  type: movementTypeSchema,
  sourceType: manualMovementSourceTypeSchema,
  description: z.string().trim().min(1).max(200),
  categoryId: movementEntityIdSchema.optional().nullable(),
  currency: movementCurrencySchema.default("ARS"),
  amount: moneySchema,
  status: z.enum(["actual", "pending"]).default("actual"),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updateManualMovementSchema = createManualMovementSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

export const movementQuerySchema = z
  .object({
    from: movementDateSchema,
    to: movementDateSchema,
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    type: z.preprocess(
      (value) => (value === "all" || value === "" ? undefined : value),
      movementTypeSchema.optional(),
    ),
    source: optionalText,
    category: optionalText,
    status: z.preprocess(
      (value) => (value === "all" || value === "" ? undefined : value),
      movementStatusSchema.optional(),
    ),
    currency: z.preprocess(
      (value) => (value === "all" || value === "" ? undefined : value),
      movementCurrencySchema.optional(),
    ),
    q: optionalText,
    minAmount: optionalText,
    maxAmount: optionalText,
    includeProjected: z
      .preprocess(
        (value) => value === true || value === "true" || value === "1",
        z.boolean(),
      )
      .default(false),
  })
  .superRefine((value, context) => {
    if (value.to < value.from) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "The end date must be equal to or after the start date",
      });
    }

    const start = new Date(`${value.from}T00:00:00Z`);
    const end = new Date(`${value.to}T00:00:00Z`);
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    if (days > 1_095) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "Movement queries cannot exceed three years",
      });
    }
  });

export type CreateMovementCategoryInput = z.infer<typeof createMovementCategorySchema>;
export type UpdateMovementCategoryInput = z.infer<typeof updateMovementCategorySchema>;
export type ListMovementCategoriesQueryInput = z.infer<typeof listMovementCategoriesQuerySchema>;
export type ArchiveMovementCategoryInput = z.infer<typeof archiveMovementCategorySchema>;
export type AssignMovementCategoryInput = z.infer<typeof assignMovementCategorySchema>;
export type SuggestMovementCategoryInput = z.infer<typeof suggestMovementCategorySchema>;
export type CreateManualMovementInput = z.infer<typeof createManualMovementSchema>;
export type UpdateManualMovementInput = z.infer<typeof updateManualMovementSchema>;
export type MovementQueryInput = z.infer<typeof movementQuerySchema>;
