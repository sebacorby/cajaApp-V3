import { z } from "zod";


export const futureMonthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");


export const futureOverviewQuerySchema = z.object({
  from: futureMonthKeySchema,
  months: z.coerce.number().int().min(1).max(36).default(12),
});


export type FutureOverviewQueryInput = z.infer<typeof futureOverviewQuerySchema>;