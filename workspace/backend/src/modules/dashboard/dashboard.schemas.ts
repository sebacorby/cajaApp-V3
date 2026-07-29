import { z, type RefinementCtx } from "zod";
import { movementDateSchema } from "../movements/movements.schemas.js";

export const dashboardQuerySchema = z
  .object({
    from: movementDateSchema,
    to: movementDateSchema,
  })
  .superRefine((value: { from: string; to: string }, context: RefinementCtx) => {
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
        message: "Dashboard ranges cannot exceed three years",
      });
    }
  });

export type DashboardQueryInput = { from: string; to: string };
