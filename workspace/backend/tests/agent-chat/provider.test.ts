import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentChatProvider, AgentChatStreamEvent } from "../../src/modules/ai/agent/agent-chat-provider.js";
import { FakeAgentChatProvider } from "../../src/modules/ai/agent/fake-agent-chat-provider.js";
import { OllamaAgentChatClient } from "../../src/modules/ai/agent/ollama-agent-chat.client.js";
import { OpenAICompatibleAgentChatClient } from "../../src/modules/ai/agent/openai-compatible-agent-chat.client.js";
import { getAgentChatProvider, setAgentChatProviderForTests } from "../../src/modules/ai/agent/agent-chat-provider.factory.js";

async function collect(provider: AgentChatProvider, signal?: AbortSignal): Promise<AgentChatStreamEvent[]> {
  const events: AgentChatStreamEvent[] = [];
  for await (const event of provider.stream({
    messages: [{ role: "user", content: "hola" }],
    tools: [{ name: "app.search", description: "buscar", inputSchema: { type: "object" } }],
    signal,
  })) events.push(event);
  return events;
}

afterEach(() => vi.restoreAllMocks());

describe("AgentChatProvider adapters", () => {
  it("fake provider entrega texto, tool call y completed determinísticamente", async () => {
    const provider = new FakeAgentChatProvider([
      { type: "text-delta", text: "Busco " },
      { type: "tool-call", toolCall: { id: "call-1", name: "app.search", arguments: { query: "seguro" } } },
      { type: "completed", usage: { inputTokens: 4, outputTokens: 2 }, providerRequestId: "fake-1" },
    ]);
    expect(await collect(provider)).toEqual([
      { type: "text-delta", text: "Busco " },
      { type: "tool-call", toolCall: { id: "call-1", name: "app.search", arguments: { query: "seguro" } } },
      { type: "completed", usage: { inputTokens: 4, outputTokens: 2 }, providerRequestId: "fake-1" },
    ]);
  });

  it("fake provider respeta AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = new FakeAgentChatProvider([{ type: "text-delta", text: "no" }]);
    await expect(collect(provider, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
  it("Ollama traduce NDJSON incremental a eventos del contrato", async () => {
    const body = [
      JSON.stringify({ message: { content: "Hola " }, done: false }),
      JSON.stringify({ message: { content: "", tool_calls: [{ id: "call-2", function: { name: "app.search", arguments: { query: "seguro" } } }] }, done: false }),
      JSON.stringify({ message: { content: "listo" }, done: true, prompt_eval_count: 7, eval_count: 3 }),
    ].join("\n") + "\n";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, {
      status: 200,
      headers: { "content-type": "application/x-ndjson", "x-request-id": "ollama-req" },
    }));

    const provider = new OllamaAgentChatClient({ baseUrl: "http://ollama.test", model: "test-model" });
    expect(await collect(provider)).toEqual([
      { type: "text-delta", text: "Hola " },
      { type: "tool-call", toolCall: { id: "call-2", name: "app.search", arguments: { query: "seguro" } } },
      { type: "text-delta", text: "listo" },
      { type: "completed", usage: { inputTokens: 7, outputTokens: 3 }, providerRequestId: "ollama-req" },
    ]);
  });

  it("OpenAI-compatible traduce SSE content + function call + usage", async () => {
    const body = [
      `data: ${JSON.stringify({ id: "chatcmpl-1", choices: [{ delta: { content: "Voy " } }] })}\n\n`,
      `data: ${JSON.stringify({ id: "chatcmpl-1", choices: [{ delta: { tool_calls: [{ index: 0, id: "call-3", function: { name: "app.search", arguments: JSON.stringify({ query: "seguro" }) } }] } }] })}\n\n`,
      `data: ${JSON.stringify({ id: "chatcmpl-1", choices: [{ delta: {}, finish_reason: "tool_calls" }], usage: { prompt_tokens: 9, completion_tokens: 4 } })}\n\n`,
      "data: [DONE]\n\n",
    ].join("");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } }));

    const provider = new OpenAICompatibleAgentChatClient({ baseUrl: "http://openai.test", model: "test-model", toolCallingEnabled: true });
    expect(await collect(provider)).toEqual([
      { type: "text-delta", text: "Voy " },
      { type: "tool-call", toolCall: { id: "call-3", name: "app.search", arguments: { query: "seguro" } } },
      { type: "completed", usage: { inputTokens: 9, outputTokens: 4 }, providerRequestId: "chatcmpl-1" },
    ]);
  });
  it("OpenAI-compatible rechaza configuración sin tool calling", () => {
    expect(() => new OpenAICompatibleAgentChatClient({
      baseUrl: "http://openai.test",
      model: "test-model",
      toolCallingEnabled: false,
    })).toThrow(/tool calling/i);
  });

  it("factory permite inyectar fake explícito sin afectar el provider documental", () => {
    const fake = new FakeAgentChatProvider();
    setAgentChatProviderForTests(fake);
    expect(getAgentChatProvider()).toBe(fake);
    setAgentChatProviderForTests(undefined);
  });
});
