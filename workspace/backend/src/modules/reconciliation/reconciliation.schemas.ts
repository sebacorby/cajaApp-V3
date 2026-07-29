import { z } from "zod";

export const reconciliationRelationTypeSchema = z.enum([
  "all",
  "duplicate_movement",
  "salary_deposit",
  "card_payment",
]);

export const reconciliationStatusSchema = z.enum([
  "all",
  "open",
  "resolved",
  "dismissed",
]);

export const reconciliationScopeSchema = z.enum([
  "all",
  "current",
  "historical",
]);

const limitSchema = z.string().regex(
  /^(?:[1-9]|[1-9]\d|100)$/,
  "Expected an integer between 1 and 100",
);

const offsetSchema = z.string().regex(
  /^(?:0|[1-9]\d{0,5})$/,
  "Expected an integer between 0 and 999999",
);

const isoDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Expected an ISO date in YYYY-MM-DD format",
  )
  .refine((value: string) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");

export const listReconciliationQuerySchema = z.object({
  status: reconciliationStatusSchema.optional(),
  relationType: reconciliationRelationTypeSchema.optional(),
  scope: reconciliationScopeSchema.optional(),
  search: z.string().max(160).optional(),
  limit: limitSchema.optional(),
  offset: offsetSchema.optional(),
});

export const scanReconciliationSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});

export const reconciliationParamsSchema = z.object({
  id: z.string().uuid(),
});

export const resolveReconciliationSchema = z.object({
  action: z.enum([
    "exclude_left",
    "exclude_right",
    "keep_both",
    "link_only",
    "dismiss",
  ]),
});

export type ListReconciliationQueryInput = z.infer<
  typeof listReconciliationQuerySchema
>;
export type ScanReconciliationInput = z.infer<
  typeof scanReconciliationSchema
>;
export type ResolveReconciliationInput = z.infer<
  typeof resolveReconciliationSchema
>;
