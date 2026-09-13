import { z } from "zod";

export const agentIdSchema = z.string().uuid();

export const agentConversationStatusSchema = z.enum(["active", "archived"]);
export const agentMessageRoleSchema = z.enum(["user", "assistant", "tool"]);
export const agentRiskClassSchema = z.enum(["R0", "R1", "R2", "R3", "R4"]);
export const agentApprovalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const agentRunStatusSchema = z.enum([
  "running",
  "awaiting_approval",
  "completed",
  "cancelled",
  "cancelled_after_tool",
  "failed",
]);

export const agentToolCallStatusSchema = z.enum([
  "proposed",
  "awaiting_approval",
  "running",
  "succeeded",
  "failed",
  "rejected",
  "cancelled",
]);

export const agentConversationParamsSchema = z.object({
  id: agentIdSchema,
});

export const agentRunParamsSchema = z.object({
  runId: agentIdSchema,
});

export const agentToolCallParamsSchema = z.object({
  toolCallId: agentIdSchema,
});

export const listAgentConversationsQuerySchema = z.object({
  status: agentConversationStatusSchema.optional(),
  cursor: agentIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const createAgentConversationBodySchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const updateAgentConversationBodySchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    status: agentConversationStatusSchema.optional(),
  })
  .refine((value) => value.title !== undefined || value.status !== undefined, {
    message: "At least one conversation field must be provided",
  });

export const getAgentConversationQuerySchema = z.object({
  beforeSequence: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const createAgentMessageBodySchema = z
  .object({
    content: z.string().trim().max(50_000).default(""),
    attachmentIds: z.array(agentIdSchema).max(10).default([]),
  })
  .refine(
    (value) => value.content.length > 0 || value.attachmentIds.length > 0,
    { message: "Message content or at least one attachment is required" },
  );

export const rejectAgentToolCallBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const approveAgentToolCallBodySchema = z.object({}).default({});

export const lastEventIdSchema = z.coerce.number().int().min(0);
