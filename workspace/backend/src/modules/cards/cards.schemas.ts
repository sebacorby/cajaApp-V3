import { z } from "zod";
import {
  cardStatementPreviewSchema as cardStatementPreviewSchemaBase,
  importResultSchema as importResultSchemaBase,
} from "./cards.schemas.base.js";

export * from "./cards.schemas.base.js";

export const cardStatementPreviewSchema = cardStatementPreviewSchemaBase.extend({
  source: cardStatementPreviewSchemaBase.shape.source.extend({
    accountNumber: z.string().trim().min(1).nullable().optional(),
  }),
});

export const importResultSchema = importResultSchemaBase.extend({
  preview: cardStatementPreviewSchema,
});

export type CardStatementPreviewInput = z.infer<
  typeof cardStatementPreviewSchema
>;
