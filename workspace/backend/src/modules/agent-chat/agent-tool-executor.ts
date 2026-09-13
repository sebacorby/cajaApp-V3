import type { AgentJsonValue } from "../ai/agent/agent-chat-provider.js";
import { prisma } from "../../db/prisma.js";
import type { AgentEntityRef, AgentRiskClass } from "./agent-types.js";
import { AgentToolRegistry, agentToolRegistry } from "./agent-tool-registry.js";
import { computeArgumentsHash } from "./agent-approval.service.js";

export interface AgentToolRequest {
  name: string;
  arguments: AgentJsonValue;
  conversationId?: string;
  explicitIntent?: boolean;
  toolCallId?: string;
  idempotencyKey?: string;
  approval?: { status: "approved"; argumentsHash: string } | undefined;
}

export interface AgentToolExecutionStore {
  findSucceeded(idempotencyKey: string): Promise<{ resultJson: string } | null>;
  markSucceeded(toolCallId: string, idempotencyKey: string, resultJson: string): Promise<void>;
}

const prismaExecutionStore: AgentToolExecutionStore = {
  async findSucceeded(idempotencyKey) {
    const row = await prisma.agentToolCall.findUnique({
      where: { idempotencyKey },
      select: { status: true, resultJson: true },
    });
    return row?.status === "succeeded" && row.resultJson ? { resultJson: row.resultJson } : null;
  },
  async markSucceeded(toolCallId, idempotencyKey, resultJson) {
    const updated = await prisma.agentToolCall.updateMany({
      where: { id: toolCallId, idempotencyKey },
      data: { status: "succeeded", resultJson, completedAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new AgentToolExecutionError("IDEMPOTENCY_RECORD_MISMATCH", "Agent tool call idempotency record does not match");
    }
  },
};

export interface ExecutedAgentTool {
  name: string;
  riskClass: AgentRiskClass;
  arguments: AgentJsonValue;
  conversationId?: string;
  result: AgentJsonValue;
  entityRefs: AgentEntityRef[];
}

export class AgentToolExecutionError extends Error {
  constructor(public readonly code: string, message: string, public readonly causeValue?: unknown) {
    super(message);
    this.name = "AgentToolExecutionError";
  }
}

export class AgentToolExecutor {
  constructor(
    private readonly registry: AgentToolRegistry = agentToolRegistry,
    private readonly store: AgentToolExecutionStore = prismaExecutionStore,
  ) {}

  canRunInParallel(calls: AgentToolRequest[]): boolean {
    return calls.length > 1 && calls.every((call) => {
      const tool = this.registry.lookup(call.name);
      return Boolean(tool && tool.riskClass === "R0" && tool.parallelSafe);
    });
  }

  async execute(call: AgentToolRequest): Promise<ExecutedAgentTool> {
    const tool = this.registry.lookup(call.name);
    if (!tool) throw new AgentToolExecutionError("UNKNOWN_TOOL", `Unknown agent tool: ${call.name}`);
    if (tool.requiresExplicitIntent && call.explicitIntent !== true) {
      throw new AgentToolExecutionError("EXPLICIT_INTENT_REQUIRED", `Tool ${call.name} requires explicit user intent`);
    }
    const parsed = tool.inputSchema.safeParse(call.arguments);
    if (!parsed.success) {
      throw new AgentToolExecutionError(
        "INVALID_TOOL_ARGUMENTS",
        `Invalid arguments for ${call.name}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
        parsed.error,
      );
    }
    try {
      const risk = tool.riskClass;

      if (risk === "R3" || risk === "R4") {
        const replayed = call.idempotencyKey ? await this.store.findSucceeded(call.idempotencyKey) : null;
        if (replayed) {
          const result = JSON.parse(replayed.resultJson) as AgentJsonValue;
          return {
            name: tool.name,
            riskClass: tool.riskClass,
            arguments: parsed.data as AgentJsonValue,
            result,
            entityRefs: tool.auditEntityRefs(result, parsed.data),
          };
        }
        if (!call.approval || call.approval.status !== "approved") {
          throw new AgentToolExecutionError(
            "APPROVAL_REQUIRED",
            `Tool ${tool.name} requires an explicit valid approval before execution`,
          );
        }
        if (!call.toolCallId || !call.idempotencyKey) {
          throw new AgentToolExecutionError("IDEMPOTENCY_KEY_REQUIRED", `Tool ${tool.name} requires durable idempotency metadata`);
        }
        const expectedHash = computeArgumentsHash(tool.name, parsed.data);
        if (call.approval.argumentsHash !== expectedHash) {
          throw new AgentToolExecutionError(
            "APPROVAL_ARGUMENTS_MISMATCH",
            `Approval is not valid for the current arguments of ${tool.name}`,
          );
        }
      }

      if (risk === "R2") {
        if (!call.toolCallId || !call.idempotencyKey) {
          throw new AgentToolExecutionError("IDEMPOTENCY_KEY_REQUIRED", `Tool ${tool.name} requires durable idempotency metadata`);
        }
        const cached = await this.store.findSucceeded(call.idempotencyKey);
        if (cached) {
          const result = JSON.parse(cached.resultJson) as AgentJsonValue;
          return {
            name: tool.name,
            riskClass: tool.riskClass,
            arguments: parsed.data as AgentJsonValue,
            result,
            entityRefs: tool.auditEntityRefs(result, parsed.data),
          };
        }
      }

      const raw = await tool.handler(parsed.data, { conversationId: call.conversationId });
      const result = tool.resultProjector(raw);
      const executed = {
        name: tool.name,
        riskClass: tool.riskClass,
        arguments: parsed.data as AgentJsonValue,
        result,
        entityRefs: tool.auditEntityRefs(raw, parsed.data),
      };
      if (risk === "R2" || risk === "R3" || risk === "R4") {
        await this.store.markSucceeded(call.toolCallId!, call.idempotencyKey!, JSON.stringify(result));
      }
      return executed;
    } catch (error) {
      if (error instanceof AgentToolExecutionError) throw error;
      const message = error instanceof Error ? error.message : "Tool execution failed";
      throw new AgentToolExecutionError("TOOL_EXECUTION_FAILED", message, error);
    }
  }

  async executeMany(calls: AgentToolRequest[]): Promise<ExecutedAgentTool[]> {
    if (this.canRunInParallel(calls)) return Promise.all(calls.map((call) => this.execute(call)));
    const results: ExecutedAgentTool[] = [];
    for (const call of calls) results.push(await this.execute(call));
    return results;
  }
}

export const agentToolExecutor = new AgentToolExecutor();
