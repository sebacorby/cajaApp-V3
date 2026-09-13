import type { AgentJsonValue } from "../ai/agent/agent-chat-provider.js";
import type { AgentEntityRef, AgentRiskClass } from "./agent-types.js";
import { AgentToolRegistry, agentToolRegistry } from "./agent-tool-registry.js";

export interface AgentToolRequest {
  name: string;
  arguments: AgentJsonValue;
  explicitIntent?: boolean;
}

export interface ExecutedAgentTool {
  name: string;
  riskClass: AgentRiskClass;
  arguments: AgentJsonValue;
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
  constructor(private readonly registry: AgentToolRegistry = agentToolRegistry) {}

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
      const raw = await tool.handler(parsed.data);
      return {
        name: tool.name,
        riskClass: tool.riskClass,
        arguments: parsed.data as AgentJsonValue,
        result: tool.resultProjector(raw),
        entityRefs: tool.auditEntityRefs(raw, parsed.data),
      };
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
