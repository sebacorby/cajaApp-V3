import { z } from "zod";

export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected month in YYYY-MM format");

export const createMonthCloseSchema = z.object({
  monthKey: monthKeySchema,
});

export const listMonthCloseQuerySchema = z.object({
  monthKey: monthKeySchema.optional(),
  status: z.enum(["all", "closed", "reopened"]).optional(),
  limit: z.string().regex(/^(?:[1-9]|[1-9]\d|100)$/).optional(),
  offset: z.string().regex(/^(?:0|[1-9]\d{0,5})$/).optional(),
});

export const monthCloseParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateMonthCloseInput = z.infer<typeof createMonthCloseSchema>;
export type ListMonthCloseQueryInput = z.infer<typeof listMonthCloseQuerySchema>;
