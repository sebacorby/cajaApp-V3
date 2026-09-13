import { env } from "../../../config/env.js";
import type {
  AgentChatMessage,
  AgentChatProvider,
  AgentChatRequest,
  AgentChatStreamEvent,
  AgentJsonValue,
} from "./agent-chat-provider.js";

export interface OpenAICompatibleAgentChatConfig {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  chatCompletionsPath?: string;
  toolCallingEnabled: boolean;
}

type PendingToolCall = { id: string; name: string; argumentsText: string };

type OpenAIChunk = {
  id?: string;
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function jsonArguments(value: string): AgentJsonValue {
  if (!value.trim()) return {};
  try { return JSON.parse(value) as AgentJsonValue; } catch { return { raw: value }; }
}
function mapMessage(message: AgentChatMessage): Record<string, unknown> {
  const mapped: Record<string, unknown> = { role: message.role, content: message.content };
  if (message.toolCallId) mapped.tool_call_id = message.toolCallId;
  if (message.name) mapped.name = message.name;
  if (message.toolCalls?.length) {
    mapped.tool_calls = message.toolCalls.map((call) => ({
      id: call.id,
      type: "function",
      function: { name: call.name, arguments: JSON.stringify(call.arguments) },
    }));
  }
  return mapped;
}

export class OpenAICompatibleAgentChatClient implements AgentChatProvider {
  readonly identity;
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(config: OpenAICompatibleAgentChatConfig) {
    if (!config.toolCallingEnabled) {
      throw new Error("OpenAI-compatible agent provider requires declared tool calling support");
    }
    const baseUrl = config.baseUrl ?? env.AI_BASE_URL;
    const model = config.model ?? env.AI_MODEL;
    if (!baseUrl || !model) throw new Error("OpenAI-compatible agent provider requires baseUrl and model");
    const path = config.chatCompletionsPath ?? env.AI_CHAT_COMPLETIONS_PATH;
    this.endpoint = `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
    this.apiKey = config.apiKey ?? env.AI_API_KEY ?? "";
    this.identity = { provider: "openai-compatible", model };
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "text/event-stream, application/json",
    };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    return headers;
  }
  async *stream(request: AgentChatRequest): AsyncIterable<AgentChatStreamEvent> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: this.headers(),
      signal: request.signal,
      body: JSON.stringify({
        model: this.identity.model,
        messages: request.messages.map(mapMessage),
        tools: request.tools.map((tool) => ({
          type: "function",
          function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
        })),
        stream: true,
        stream_options: { include_usage: true },
        temperature: request.temperature ?? env.AI_TEMPERATURE,
        ...(request.maxOutputTokens ? { [env.AI_TOKEN_PARAMETER]: request.maxOutputTokens } : {}),
      }),
    });
    if (!response.ok) throw new Error(`OpenAI-compatible chat failed with HTTP ${response.status}`);
    if (!response.body) throw new Error("OpenAI-compatible chat response has no body");

    const pending = new Map<number, PendingToolCall>();
    let requestId: string | undefined;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let completed = false;

    const flushTools = function *(): Iterable<AgentChatStreamEvent> {
      for (const [index, call] of [...pending.entries()].sort(([a], [b]) => a - b)) {
        if (!call.name) continue;
        yield {
          type: "tool-call",
          toolCall: { id: call.id || `tool-${index}`, name: call.name, arguments: jsonArguments(call.argumentsText) },
        };
      }
      pending.clear();
    };
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handleData = (data: string): OpenAIChunk | null => {
      if (data === "[DONE]") return null;
      return JSON.parse(data) as OpenAIChunk;
    };

    const processChunk = function *(chunk: OpenAIChunk): Iterable<AgentChatStreamEvent> {
      requestId = chunk.id ?? requestId;
      inputTokens = chunk.usage?.prompt_tokens ?? inputTokens;
      outputTokens = chunk.usage?.completion_tokens ?? outputTokens;

      for (const choice of chunk.choices ?? []) {
        const content = choice.delta?.content;
        if (content) yield { type: "text-delta", text: content };
        for (const fragment of choice.delta?.tool_calls ?? []) {
          const index = fragment.index ?? 0;
          const current = pending.get(index) ?? { id: "", name: "", argumentsText: "" };
          if (fragment.id) current.id = fragment.id;
          if (fragment.function?.name) current.name += fragment.function.name;
          if (fragment.function?.arguments) current.argumentsText += fragment.function.arguments;
          pending.set(index, current);
        }
        if (choice.finish_reason === "tool_calls") yield *flushTools();
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const records = buffer.split(/\r?\n\r?\n/);
      buffer = records.pop() ?? "";
      for (const record of records) {
        for (const line of record.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") {
            yield *flushTools();
            yield { type: "completed", usage: { inputTokens, outputTokens }, providerRequestId: requestId };
            completed = true;
            continue;
          }
          const chunk = handleData(data);
          if (chunk) yield *processChunk(chunk);
        }
      }
      if (done) break;
    }

    if (!completed) {
      const trailing = buffer.trim();
      if (trailing.startsWith("data:")) {
        const data = trailing.slice(5).trim();
        if (data !== "[DONE]") {
          const chunk = handleData(data);
          if (chunk) yield *processChunk(chunk);
        }
      }
      yield *flushTools();
      yield { type: "completed", usage: { inputTokens, outputTokens }, providerRequestId: requestId };
    }
  }
}
