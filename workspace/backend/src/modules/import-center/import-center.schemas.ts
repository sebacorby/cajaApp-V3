import { z } from "zod";

export const importCenterKindSchema = z.enum([
  "all",
  "card_statement",
  "salary_receipt",
  "debit_csv",
]);

export const importCenterStatusSchema = z.enum([
  "all",
  "processing",
  "needs_review",
  "accepted",
  "failed",
  "superseded",
  "reversed",
  "archived",
]);

const positiveLimitSchema = z.string().regex(
  /^(?:[1-9]|[1-9]\d|100)$/,
  "Expected an integer between 1 and 100",
);

const offsetSchema = z.string().regex(
  /^(?:0|[1-9]\d{0,5})$/,
  "Expected an integer between 0 and 999999",
);

export const listImportCenterQuerySchema = z.object({
  kind: importCenterKindSchema.optional(),
  status: importCenterStatusSchema.optional(),
  search: z.string().max(160).optional(),
  limit: positiveLimitSchema.optional(),
  offset: offsetSchema.optional(),
});

export const importCenterDetailParamsSchema = z.object({
  kind: z.enum(["card_statement", "salary_receipt", "debit_csv"]),
  id: z.string().uuid(),
});

export type ListImportCenterQueryInput = z.infer<
  typeof listImportCenterQuerySchema
>;

export type ImportCenterDetailParamsInput = z.infer<
  typeof importCenterDetailParamsSchema
>;
