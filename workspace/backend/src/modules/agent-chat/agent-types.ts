import type { AgentJsonValue } from "../ai/agent/agent-chat-provider.js";

export type AgentRiskClass = "R0" | "R1" | "R2" | "R3" | "R4";
export type AgentConversationStatus = "active" | "archived";
export type AgentMessageRole = "user" | "assistant" | "tool";
export type AgentAttachmentStatus = "staged" | "consumed" | "failed";

export type AgentRunStatus =
  | "running"
  | "awaiting_approval"
  | "completed"
  | "cancelled"
  | "cancelled_after_tool"
  | "failed";

export type AgentToolCallStatus =
  | "proposed"
  | "awaiting_approval"
  | "running"
  | "succeeded"
  | "failed"
  | "rejected"
  | "cancelled";

export type AgentApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export interface AgentEntityRef {
  entityType: string;
  entityId: string;
  label?: string;
  section?: string;
}

export type AgentEventType =
  | "run.started"
  | "assistant.delta"
  | "tool.proposed"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  | "approval.required"
  | "approval.resolved"
  | "ui.navigate"
  | "assistant.completed"
  | "run.completed"
  | "run.cancelled"
  | "run.failed"
  | "heartbeat";

export interface AgentEvent<TPayload extends AgentJsonValue = AgentJsonValue> {
  runId: string;
  sequence: number;
  timestamp: string;
  type: AgentEventType;
  payload: TPayload;
}

export interface AgentToolPublicDefinition {
  name: string;
  description: string;
  riskClass: AgentRiskClass;
  parallelSafe: boolean;
  requiresExplicitIntent: boolean;
}

export interface AgentToolExecutionResult {
  result: AgentJsonValue;
  entityRefs?: AgentEntityRef[];
}
