import { randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";
import type {
  AgentChatMessage,
  AgentChatProvider,
  AgentChatRequest,
  AgentChatStreamEvent,
  AgentJsonValue,
} from "./agent-chat-provider.js";

export interface OllamaAgentChatConfig {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

type OllamaToolCall = {
  id?: string;
  function?: { name?: string; arguments?: unknown };
};

type OllamaChunk = {
  message?: { content?: string; tool_calls?: OllamaToolCall[] };
  done?: boolean;
  error?: string;
  prompt_eval_count?: number;
  eval_count?: number;
};

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
}

function toJsonValue(value: unknown): AgentJsonValue {
  if (typeof value === "string") {
    try { return JSON.parse(value) as AgentJsonValue; } catch { return { raw: value }; }
  }
  return (value ?? {}) as AgentJsonValue;
}
function mapMessage(message: AgentChatMessage): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    role: message.role,
    content: message.content,
  };
  if (message.name) mapped.tool_name = message.name;
  if (message.toolCalls?.length) {
    mapped.tool_calls = message.toolCalls.map((call) => ({
      id: call.id,
      function: { name: call.name, arguments: call.arguments },
    }));
  }
  return mapped;
}

export class OllamaAgentChatClient implements AgentChatProvider {
  readonly identity;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: OllamaAgentChatConfig = {}) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? env.OLLAMA_BASE_URL);
    this.apiKey = config.apiKey ?? env.OLLAMA_API_KEY;
    this.identity = { provider: "ollama", model: config.model ?? env.OLLAMA_MODEL };
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/x-ndjson, application/json",
    };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  async preflight(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/show`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: this.identity.model }),
    });
    if (!response.ok) throw new Error(`Ollama preflight failed with HTTP ${response.status}`);
    const payload = await response.json() as { capabilities?: string[] };
    if (payload.capabilities && !payload.capabilities.includes("tools")) {
      throw new Error(`Ollama model ${this.identity.model} does not declare tool calling capability`);
    }
  }
  async *stream(request: AgentChatRequest): AsyncIterable<AgentChatStreamEvent> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: this.headers(),
      signal: request.signal,
      body: JSON.stringify({
        model: this.identity.model,
        messages: request.messages.map(mapMessage),
        tools: request.tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        })),
        stream: true,
        keep_alive: env.OLLAMA_KEEP_ALIVE,
        options: {
          temperature: request.temperature ?? env.AI_TEMPERATURE,
          ...(env.OLLAMA_NUM_CTX > 0 ? { num_ctx: env.OLLAMA_NUM_CTX } : {}),
        },
      }),
    });
    if (!response.ok) throw new Error(`Ollama chat failed with HTTP ${response.status}`);
    if (!response.body) throw new Error("Ollama chat response has no body");

    const requestId = response.headers.get("x-request-id") ?? undefined;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fallbackOrdinal = 0;

    const parseLine = (line: string): OllamaChunk | null => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      return JSON.parse(trimmed) as OllamaChunk;
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const chunk = parseLine(line);
        if (!chunk) continue;
        if (chunk.error) throw new Error(`Ollama chat error: ${chunk.error}`);
        if (chunk.message?.content) yield { type: "text-delta", text: chunk.message.content };
        for (const call of chunk.message?.tool_calls ?? []) {
          const name = call.function?.name?.trim();
          if (!name) continue;
          fallbackOrdinal += 1;
          yield {
            type: "tool-call",
            toolCall: {
              id: call.id?.trim() || `ollama-${fallbackOrdinal}-${randomUUID()}`,
              name,
              arguments: toJsonValue(call.function?.arguments),
            },
          };
        }
        if (chunk.done) {
          yield {
            type: "completed",
            usage: { inputTokens: chunk.prompt_eval_count, outputTokens: chunk.eval_count },
            providerRequestId: requestId,
          };
        }
      }
      if (done) break;
    }

    const trailing = parseLine(buffer);
    if (trailing?.message?.content) yield { type: "text-delta", text: trailing.message.content };
  }
}
