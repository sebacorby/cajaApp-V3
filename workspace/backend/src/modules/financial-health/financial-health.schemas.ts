import { z, type RefinementCtx } from "zod";
import { movementDateSchema } from "../movements/movements.schemas.js";


const rangeShape = {
  from: movementDateSchema,
  to: movementDateSchema,
};


function validateRange(
  value: { from: string; to: string },
  context: RefinementCtx,
): void {
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
      message: "Financial health ranges cannot exceed three years",
    });
  }
}


export const financialHealthQuerySchema = z
  .object(rangeShape)
  .superRefine(validateRange);


export const financialHealthSnapshotSchema = z
  .object(rangeShape)
  .superRefine(validateRange);


export const financialHealthHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});


export const financialHealthSnapshotParamsSchema = z.object({
  snapshotId: z.string().uuid(),
});


export type FinancialHealthQueryInput = {
  from: string;
  to: string;
};


export type FinancialHealthHistoryQueryInput = {
  limit: number;
};


export type FinancialHealthSnapshotParamsInput = {
  snapshotId: string;
};