import { z, type RefinementCtx } from "zod";
import { movementDateSchema } from "../movements/movements.schemas.js";


export const aiAdvisorModeSchema = z.enum(["analysis", "simulation"]);
export const aiAdvisorCurrencySchema = z.enum(["ARS", "USD"]);


const signedMoneySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[+-]?[0-9.,]+$/, "Expected a signed monetary amount");


export const aiAdvisorScenarioSchema = z.object({
  label: z.string().trim().min(3).max(120),
  currency: aiAdvisorCurrencySchema,
  incomeDelta: signedMoneySchema.default("0"),
  expenseDelta: signedMoneySchema.default("0"),
  commitmentDelta: signedMoneySchema.default("0"),
  assumptions: z.array(z.string().trim().min(1).max(220)).max(6).default([]),
});


export const aiAdvisorQuestionSchema = z
  .object({
    from: movementDateSchema,
    to: movementDateSchema,
    question: z.string().trim().min(3).max(2_000),
    mode: aiAdvisorModeSchema.default("analysis"),
    currency: aiAdvisorCurrencySchema.optional(),
    scenario: aiAdvisorScenarioSchema.optional(),
  })
  .superRefine((value, context: RefinementCtx) => {
    if (value.to < value.from) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "The end date must be equal to or after the start date",
      });
    }
    if (value.mode === "simulation" && !value.scenario) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scenario"],
        message: "A deterministic scenario is required in simulation mode",
      });
    }
    if (value.mode === "analysis" && value.scenario) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scenario"],
        message: "Scenario data is only accepted in simulation mode",
      });
    }
    if (value.currency && value.scenario && value.currency !== value.scenario.currency) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currency"],
        message: "Question currency must match scenario currency",
      });
    }
  });


export const aiAdvisorContextQuerySchema = z.object({
  from: movementDateSchema,
  to: movementDateSchema,
}).superRefine((value, context: RefinementCtx) => {
  if (value.to < value.from) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["to"],
      message: "The end date must be equal to or after the start date",
    });
  }
});


export const aiAdvisorHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});


export const aiAdvisorInteractionParamsSchema = z.object({
  interactionId: z.string().uuid("Invalid AI advisor interaction identifier"),
});


export type AiAdvisorQuestionInput = z.infer<typeof aiAdvisorQuestionSchema>;
export type AiAdvisorContextQueryInput = z.infer<typeof aiAdvisorContextQuerySchema>;
export type AiAdvisorHistoryQueryInput = z.infer<typeof aiAdvisorHistoryQuerySchema>;
export type AiAdvisorInteractionParams = z.infer<typeof aiAdvisorInteractionParamsSchema>;
export type AiAdvisorScenarioInput = z.infer<typeof aiAdvisorScenarioSchema>;