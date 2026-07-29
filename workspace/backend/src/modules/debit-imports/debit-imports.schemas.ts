import { z } from "zod";

export const debitImportEntityIdSchema = z.string().uuid();

export const debitImportRowUpdateSchema = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(1).max(240),
  reference: z.string().trim().max(160).nullable().optional(),
  movementType: z.enum(["income", "expense"]),
  currency: z.enum(["ARS", "USD"]),
  amount: z.string().trim().min(1).max(64),
  categoryId: z.string().uuid().nullable().optional(),
  included: z.boolean().optional(),
});

export const acceptDebitImportSchema = z.object({
  rowIds: z.array(z.string().uuid()).max(5000).optional(),
});

export const listDebitImportsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type DebitImportRowUpdateInput = z.infer<typeof debitImportRowUpdateSchema>;
export type AcceptDebitImportInput = z.infer<typeof acceptDebitImportSchema>;
export type ListDebitImportsQueryInput = z.infer<typeof listDebitImportsQuerySchema>;
