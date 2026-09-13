import { z, type RefinementCtx } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "La fecha no es válida");

export const reportsQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .superRefine((value: { from: string; to: string }, context: RefinementCtx) => {
    if (value.from > value.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "La fecha final no puede ser anterior a la inicial",
      });
      return;
    }
    const from = new Date(`${value.from}T00:00:00Z`);
    const to = new Date(`${value.to}T00:00:00Z`);
    const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
    if (days > 1_827) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "Los reportes no pueden abarcar más de cinco años",
      });
    }
  });

export type ReportsQueryInput = { from: string; to: string };
