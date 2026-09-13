export type AgentJsonPrimitive = string | number | boolean | null;

export type AgentJsonValue =
  | AgentJsonPrimitive
  | AgentJsonValue[]
  | { [key: string]: AgentJsonValue };

export type AgentChatRole = "system" | "user" | "assistant" | "tool";

export interface AgentProviderToolCall {
  id: string;
  name: string;
  arguments: AgentJsonValue;
}

export interface AgentChatMessage {
  role: AgentChatRole;
  content: string;
  toolCallId?: string;
  name?: string;
  toolCalls?: AgentProviderToolCall[];
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, AgentJsonValue>;
}

export interface AgentChatUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface AgentChatRequest {
  messages: AgentChatMessage[];
  tools: AgentToolDefinition[];
  signal?: AbortSignal;
  maxOutputTokens?: number;
  temperature?: number;
}

export type AgentChatStreamEvent =
  | {
      type: "text-delta";
      text: string;
    }
  | {
      type: "tool-call";
      toolCall: AgentProviderToolCall;
    }
  | {
      type: "completed";
      usage?: AgentChatUsage;
      providerRequestId?: string;
    };

export interface AgentChatProviderIdentity {
  provider: string;
  model: string;
}

export interface AgentChatProvider {
  readonly identity: AgentChatProviderIdentity;
  preflight?(): Promise<void>;
  stream(request: AgentChatRequest): AsyncIterable<AgentChatStreamEvent>;
}
