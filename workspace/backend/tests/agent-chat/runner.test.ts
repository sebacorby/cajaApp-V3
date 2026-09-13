import { describe, expect, it, vi } from "vitest";
import { AgentRunnerService } from "../../src/modules/agent-chat/agent-runner.service.js";
import { FakeAgentChatProvider } from "../../src/modules/ai/agent/fake-agent-chat-provider.js";
import { AgentEventsService } from "../../src/modules/agent-chat/agent-events.service.js";

function dependencies(events = [
  { type: "text-delta" as const, text: "Hola " },
  { type: "text-delta" as const, text: "Javi" },
  { type: "completed" as const, usage: { inputTokens: 4, outputTokens: 2 }, providerRequestId: "fake-1" },
]) {
  const db = {
    agentRun: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    agentConversation: { update: vi.fn() },
  };
  const chat = {
    getConversation: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" }),
    appendMessage: vi.fn(),
    getProviderMessages: vi.fn().mockResolvedValue([{ role: "user", content: "Hola" }]),
  };
  db.agentRun.create.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", status: "running" });
  db.agentRun.update.mockImplementation(async ({ data }: { data: object }) => ({ id: "22222222-2222-4222-8222-222222222222", ...data }));
  return { db, chat, provider: new FakeAgentChatProvider(events), eventBus: new AgentEventsService({ heartbeatMs: 10_000 }) };
}

describe("AgentRunnerService US1", () => {
  it("persiste user/assistant, emite deltas y completa el run", async () => {
    const d = dependencies();
    d.chat.appendMessage.mockResolvedValueOnce({ id: "user-1" }).mockResolvedValueOnce({ id: "assistant-1" });
    const runner = new AgentRunnerService(d as never);
    const run = await runner.startRun("11111111-1111-4111-8111-111111111111", { content: "Hola", attachmentIds: [] });
    await runner.waitForRun(run.id);
    expect(d.chat.appendMessage).toHaveBeenNthCalledWith(1, expect.any(String), "user", { text: "Hola", attachmentIds: [] });
    expect(d.chat.appendMessage).toHaveBeenNthCalledWith(2, expect.any(String), "assistant", { text: "Hola Javi" });
    expect(d.eventBus.replay(run.id).map((event) => event.type)).toEqual(["run.started", "assistant.delta", "assistant.delta", "assistant.completed", "run.completed"]);
    expect(d.db.agentRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "completed" }) }));
  });
  it("cancela un provider activo con AbortSignal y marca el run", async () => {
    const slowProvider = {
      identity: { provider: "fake", model: "slow" },
      async *stream(request: { signal?: AbortSignal }) {
        if (request.signal?.aborted) {
          const error = new Error("aborted");
          error.name = "AbortError";
          throw error;
        }
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 5_000);
          request.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          }, { once: true });
        });
        yield { type: "completed" as const };
      },
    };
    const d = dependencies([]);
    d.chat.appendMessage.mockResolvedValue({ id: "user-1" });
    const runner = new AgentRunnerService({ ...d, provider: slowProvider } as never);
    const run = await runner.startRun("11111111-1111-4111-8111-111111111111", { content: "cancelame", attachmentIds: [] });
    await runner.cancelRun(run.id);
    await runner.waitForRun(run.id);
    expect(d.db.agentRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "cancelled" }) }));
    expect(d.eventBus.replay(run.id).at(-1)?.type).toBe("run.cancelled");
  });
});
