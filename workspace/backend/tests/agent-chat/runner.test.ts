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


describe("AgentRunnerService US2 tool loop", () => {
  it("ejecuta una read, persiste tool result y continúa el mismo run", async () => {
    let round = 0;
    const provider = {
      identity: { provider: "fake", model: "tools" },
      async *stream(request: { tools: Array<{ name: string }> }) {
        expect(request.tools.map((tool) => tool.name)).toContain("dashboard.get_overview");
        round += 1;
        if (round === 1) {
          yield { type: "tool-call" as const, toolCall: { id: "provider-call-1", name: "dashboard.get_overview", arguments: { from: "2026-09-01", to: "2026-09-30" } } };
          yield { type: "completed" as const };
          return;
        }
        yield { type: "text-delta" as const, text: "Gastaste según CajaApp" };
        yield { type: "completed" as const, usage: { inputTokens: 10, outputTokens: 4 } };
      },
    };
    const d = dependencies([]);
    const toolRows = new Map<string, any>();
    (d.db as any).agentToolCall = {
      create: vi.fn(async ({ data }: any) => {
        const row = { id: "tool-db-1", ...data };
        toolRows.set(row.id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = { ...toolRows.get(where.id), ...data };
        toolRows.set(where.id, row);
        return row;
      }),
    };
    d.chat.appendMessage
      .mockResolvedValueOnce({ id: "user-1" })
      .mockResolvedValueOnce({ id: "assistant-tools" })
      .mockResolvedValueOnce({ id: "tool-message" })
      .mockResolvedValueOnce({ id: "assistant-final" });
    d.chat.getProviderMessages
      .mockResolvedValueOnce([{ role: "user", content: "cuánto gasté" }])
      .mockResolvedValueOnce([
        { role: "user", content: "cuánto gasté" },
        { role: "assistant", content: "", toolCalls: [{ id: "provider-call-1", name: "dashboard.get_overview", arguments: { from: "2026-09-01", to: "2026-09-30" } }] },
        { role: "tool", content: "{\"spent\":\"100\"}", toolCallId: "provider-call-1", name: "dashboard.get_overview" },
      ]);
    const registry = {
      listProviderTools: vi.fn(() => [{ name: "dashboard.get_overview", description: "dashboard", inputSchema: { type: "object" } }]),
      lookup: vi.fn(() => ({ riskClass: "R0", parallelSafe: true, requiresExplicitIntent: false })),
    };
    const executor = {
      canRunInParallel: vi.fn(() => false),
      execute: vi.fn(async () => ({
        name: "dashboard.get_overview", riskClass: "R0", arguments: { from: "2026-09-01", to: "2026-09-30" },
        result: { spent: "100" }, entityRefs: [],
      })),
    };
    const runner = new AgentRunnerService({ ...d, provider, registry, executor } as never);
    const run = await runner.startRun("11111111-1111-4111-8111-111111111111", { content: "cuánto gasté", attachmentIds: [] });
    await runner.waitForRun(run.id);
    expect((d.db as any).agentToolCall.create).toHaveBeenCalledTimes(1);
    expect((d.db as any).agentToolCall.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "succeeded" }) }));
    expect(d.chat.appendMessage).toHaveBeenCalledWith(expect.any(String), "tool", expect.objectContaining({ toolCall: expect.objectContaining({ name: "dashboard.get_overview", status: "succeeded" }) }));
    expect(d.eventBus.replay(run.id).map((event) => event.type)).toContain("tool.completed");
    expect(d.eventBus.replay(run.id).at(-1)?.type).toBe("run.completed");
  });
});
