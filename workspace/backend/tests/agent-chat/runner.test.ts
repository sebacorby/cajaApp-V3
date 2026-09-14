import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AgentRunnerService } from "../../src/modules/agent-chat/agent-runner.service.js";
import { FakeAgentChatProvider } from "../../src/modules/ai/agent/fake-agent-chat-provider.js";
import { AgentEventsService } from "../../src/modules/agent-chat/agent-events.service.js";
import { AgentToolRegistry, projectAgentResult } from "../../src/modules/agent-chat/agent-tool-registry.js";
import { AgentToolExecutor } from "../../src/modules/agent-chat/agent-tool-executor.js";

function dependencies(events = [
  { type: "text-delta" as const, text: "Hola " },
  { type: "text-delta" as const, text: "Javi" },
  { type: "completed" as const, usage: { inputTokens: 4, outputTokens: 2 }, providerRequestId: "fake-1" },
]) {
  const db = {
    agentRun: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
    agentConversation: { update: vi.fn() },
  };
  const chat = {
    getConversation: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" }),
    appendMessage: vi.fn(),
    getProviderMessages: vi.fn().mockResolvedValue([{ role: "user", content: "Hola" }]),
  };
  db.agentRun.create.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", status: "running" });
  const context = {
    build: vi.fn(async () => {
      const recent = await chat.getProviderMessages("11111111-1111-4111-8111-111111111111");
      const latestUserText = [...recent].reverse().find((message: any) => message.role === "user")?.content ?? "";
      return { messages: [{ role: "system", content: "TEST PROMPT" }, ...recent], latestUserText };
    }),
  };
  db.agentRun.update.mockImplementation(async ({ data }: { data: object }) => ({ id: "22222222-2222-4222-8222-222222222222", ...data }));
  return { db, chat, context, provider: new FakeAgentChatProvider(events), eventBus: new AgentEventsService({ heartbeatMs: 10_000 }) };
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
      findUnique: vi.fn(async () => null),
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
      lookup: vi.fn(() => ({
        riskClass: "R0",
        parallelSafe: true,
        requiresExplicitIntent: false,
        inputSchema: z.object({ from: z.string(), to: z.string() }),
      })),
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
    expect((d.db as any).agentToolCall.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ idempotencyKey: "22222222-2222-4222-8222-222222222222:provider-call-1" }),
    }));
    expect((d.db as any).agentToolCall.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "succeeded" }) }));
    expect(d.chat.appendMessage).toHaveBeenCalledWith(expect.any(String), "tool", expect.objectContaining({ toolCall: expect.objectContaining({ name: "dashboard.get_overview", status: "succeeded" }) }));
    expect(d.eventBus.replay(run.id).map((event) => event.type)).toContain("tool.completed");
    expect(d.eventBus.replay(run.id).at(-1)?.type).toBe("run.completed");
  });
});


describe("AgentRunnerService US3 R2 policy", () => {
  function r2Deps(userText: string, toolName: string, providerArguments: Record<string, unknown>, approvals?: unknown) {
    let round = 0;
    const provider = {
      identity: { provider: "fake", model: "r2-tools" },
      async *stream() {
        round += 1;
        if (round === 1) {
          yield { type: "tool-call" as const, toolCall: { id: "provider-r2-1", name: toolName, arguments: providerArguments } };
          yield { type: "completed" as const };
          return;
        }
        yield { type: "text-delta" as const, text: "Listo" };
        yield { type: "completed" as const };
      },
    };
    const d = dependencies([]);
    const toolRows = new Map<string, any>();
    (d.db as any).agentToolCall = {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: "tool-r2-db-1", ...data };
        toolRows.set(row.id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = { ...toolRows.get(where.id), ...data };
        toolRows.set(where.id, row);
        return row;
      }),
    };
    d.chat.appendMessage.mockResolvedValue({ id: "message" });
    d.chat.getProviderMessages
      .mockResolvedValueOnce([{ role: "user", content: userText }])
      .mockResolvedValueOnce([
        { role: "user", content: userText },
        { role: "assistant", content: "", toolCalls: [{ id: "provider-r2-1", name: toolName, arguments: providerArguments }] },
        { role: "tool", content: "{}", toolCallId: "provider-r2-1", name: toolName },
      ]);
    const handler = vi.fn(async () => ({ id: "created-r2" }));
    const registry = new AgentToolRegistry([
      {
        name: toolName,
        description: "R2 write test",
        inputSchema: z.object({}).passthrough(),
        riskClass: "R2",
        parallelSafe: false,
        requiresExplicitIntent: true,
        handler,
        resultProjector: projectAgentResult,
        auditEntityRefs: () => [],
      },
    ]);
    const executor = new AgentToolExecutor(registry, {
      findSucceeded: vi.fn(async () => null),
      markSucceeded: vi.fn(async () => undefined),
    });
    const executeSpy = vi.spyOn(executor, "execute");
    const resolvedApprovals = approvals ?? {
      requestApproval: vi.fn(async () => ({ id: "approval-1", toolCallId: "tool-r2-db-1", status: "pending", argumentsHash: "hash-1", impact: {} })),
      getByToolCall: vi.fn(async () => ({ status: "pending", argumentsHash: "hash-1" })),
      waitForDecision: vi.fn(async () => ({ status: "rejected", argumentsHash: "hash-1", resolvedAt: null })),
    };
    const runner = new AgentRunnerService({
      ...d, provider, registry, executor, approvals: resolvedApprovals,
    } as never);
    return { d, executor, executeSpy, handler, approvals: resolvedApprovals, runner };
  }

  it("pasa explicit intent y clave estable a una R2 pedida por el usuario", async () => {
    const { executeSpy, runner } = r2Deps("Registrá un gasto de ARS 18500 en farmacia hoy", "movements.create_manual", { amount: "18500" });
    const run = await runner.startRun("11111111-1111-4111-8111-111111111111", { content: "Registrá un gasto de ARS 18500 en farmacia hoy", attachmentIds: [] });
    await runner.waitForRun(run.id);
    expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({
      explicitIntent: true, toolCallId: "tool-r2-db-1",
      idempotencyKey: "22222222-2222-4222-8222-222222222222:provider-r2-1",
    }));
  });

  it("no muta una R2 con referencia ambigua: la pausa y resuelve por approval", async () => {
    const { executeSpy, runner, approvals, handler } = r2Deps("Cambiá ese movimiento", "movements.update_manual", {
      movementId: "11111111-1111-4111-8111-111111111111",
      changes: { amount: "19000" },
    });
    const run = await runner.startRun("11111111-1111-4111-8111-111111111111", { content: "Cambiá ese movimiento", attachmentIds: [] });
    await runner.waitForRun(run.id);
    expect(handler).not.toHaveBeenCalled();
    expect(executeSpy).not.toHaveBeenCalled();
    expect(approvals.requestApproval).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: "tool-r2-db-1", toolName: "movements.update_manual",
    }));
  });
});


describe("AgentRunnerService US6 recovery", () => {
  it("expone un snapshot durable con secuencia, métricas, tool calls y approval", async () => {
    const d = dependencies([]);
    d.db.agentRun.findUnique.mockResolvedValue({
      id: "run-restart-1",
      conversationId: "conv-1",
      status: "awaiting_approval",
      provider: "fake",
      model: "recovery",
      startedAt: new Date("2026-09-13T12:00:00.000Z"),
      completedAt: null,
      inputTokens: 17,
      outputTokens: 9,
      toolCallCount: 2,
      lastEventSequence: 14,
      errorCode: null,
      errorMessage: null,
      toolCalls: [{
        id: "tool-restart-1",
        ordinal: 2,
        toolName: "month_close.create",
        riskClass: "R3",
        argumentsJson: '{"monthKey":"2026-08"}',
        status: "awaiting_approval",
        resultJson: null,
        errorCode: null,
        errorMessage: null,
        approval: {
          id: "approval-restart-1",
          status: "pending",
          impactSummaryJson: '{"message":"Cerrar agosto"}',
          argumentsHash: "hash-restart",
          requestedAt: new Date("2026-09-13T12:00:01.000Z"),
          resolvedAt: null,
        },
      }],
    });
    const runner = new AgentRunnerService(d as never);
    const snapshot = await runner.getRun("run-restart-1");
    expect(snapshot).toMatchObject({
      id: "run-restart-1",
      status: "awaiting_approval",
      provider: "fake",
      model: "recovery",
      toolCallCount: 2,
      lastEventSequence: 14,
    });
    expect(snapshot?.toolCalls).toEqual([
      expect.objectContaining({
        id: "tool-restart-1",
        name: "month_close.create",
        status: "awaiting_approval",
        arguments: { monthKey: "2026-08" },
        approval: expect.objectContaining({ status: "pending", argumentsHash: "hash-restart" }),
      }),
    ]);
  });
  it("termina como cancelled_after_tool si la cancelación llega con una tool ya iniciada", async () => {
    let round = 0;
    let releaseTool!: () => void;
    const toolStarted = new Promise<void>((resolve) => { releaseTool = resolve; });
    let finishTool!: () => void;
    const toolGate = new Promise<void>((resolve) => { finishTool = resolve; });
    const provider = {
      identity: { provider: "fake", model: "cancel-after-tool" },
      async *stream() {
        round += 1;
        if (round === 1) {
          yield { type: "tool-call" as const, toolCall: { id: "provider-tool-1", name: "dashboard.get_overview", arguments: {} } };
          yield { type: "completed" as const };
          return;
        }
        yield { type: "completed" as const };
      },
    };
    const d = dependencies([]);
    const rows = new Map<string, any>();
    (d.db as any).agentToolCall = {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: "tool-cancel-1", ...data };
        rows.set(row.id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = { ...rows.get(where.id), ...data };
        rows.set(where.id, row);
        return row;
      }),
    };
    d.chat.appendMessage.mockResolvedValue({ id: "message" });
    d.chat.getProviderMessages.mockResolvedValue([{ role: "user", content: "consultá dashboard" }]);
    const registry = {
      listProviderTools: vi.fn(() => [{ name: "dashboard.get_overview", description: "dashboard", inputSchema: { type: "object" } }]),
      lookup: vi.fn(() => ({
        name: "dashboard.get_overview",
        riskClass: "R0",
        parallelSafe: false,
        requiresExplicitIntent: false,
        inputSchema: z.object({}),
      })),
    };
    const executor = {
      canRunInParallel: vi.fn(() => false),
      execute: vi.fn(async () => {
        releaseTool();
        await toolGate;
        return { name: "dashboard.get_overview", riskClass: "R0", arguments: {}, result: { ok: true }, entityRefs: [] };
      }),
    };
    const runner = new AgentRunnerService({ ...d, provider, registry, executor } as never);
    const run = await runner.startRun("11111111-1111-4111-8111-111111111111", { content: "consultá dashboard", attachmentIds: [] });
    await toolStarted;
    await runner.cancelRun(run.id);
    finishTool();
    await runner.waitForRun(run.id);
    expect(d.db.agentRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "cancelled_after_tool" }),
    }));
  });
});


describe("AgentRunnerService US6 invariants", () => {
  it("rechaza un segundo run activo en la misma conversación", async () => {
    const d = dependencies([]);
    d.db.agentRun.findFirst.mockResolvedValue({ id: "run-already-active", status: "running" });
    const runner = new AgentRunnerService(d as never);
    await expect(runner.startRun("11111111-1111-4111-8111-111111111111", {
      content: "otro mensaje",
      attachmentIds: [],
    })).rejects.toMatchObject({ code: "AGENT_RUN_ACTIVE" });
    expect(d.chat.appendMessage).not.toHaveBeenCalled();
    expect(d.db.agentRun.create).not.toHaveBeenCalled();
  });

  it("persiste lastEventSequence mientras publica eventos", async () => {
    const d = dependencies();
    d.chat.appendMessage.mockResolvedValueOnce({ id: "user-1" }).mockResolvedValueOnce({ id: "assistant-1" });
    const runner = new AgentRunnerService(d as never);
    const run = await runner.startRun("11111111-1111-4111-8111-111111111111", {
      content: "Hola",
      attachmentIds: [],
    });
    await runner.waitForRun(run.id);
    const sequenceUpdates = d.db.agentRun.update.mock.calls
      .map(([input]: any[]) => input.data?.lastEventSequence)
      .filter((value: unknown) => typeof value === "number");
    expect(sequenceUpdates.length).toBeGreaterThanOrEqual(3);
    expect(sequenceUpdates.at(-1)).toBe(d.eventBus.lastSequence(run.id));
  });
});


describe("AgentRunnerService US6 limits and failures", () => {
  it("sanitiza el error del provider sin persistir secretos", async () => {
    const provider = {
      identity: { provider: "fake", model: "broken" },
      async *stream() {
        throw new Error("provider failed with api_key=super-secret-token");
        yield { type: "completed" as const };
      },
    };
    const d = dependencies([]);
    d.chat.appendMessage.mockResolvedValue({ id: "user-1" });
    const runner = new AgentRunnerService({ ...d, provider } as never);
    const run = await runner.startRun("11111111-1111-4111-8111-111111111111", {
      content: "respondé",
      attachmentIds: [],
    });
    await runner.waitForRun(run.id);
    expect(d.db.agentRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "failed",
        errorCode: "AGENT_RUN_FAILED",
        errorMessage: "El agente no pudo completar la respuesta.",
      }),
    }));
    const failed = d.eventBus.replay(run.id).find((event) => event.type === "run.failed");
    expect(JSON.stringify(failed)).not.toContain("super-secret-token");
  });

  it("corta el tool loop exactamente al alcanzar maxSteps", async () => {
    let providerRounds = 0;
    const provider = {
      identity: { provider: "fake", model: "loop" },
      async *stream() {
        providerRounds += 1;
        yield {
          type: "tool-call" as const,
          toolCall: { id: `loop-${providerRounds}`, name: "dashboard.get_overview", arguments: {} },
        };
        yield { type: "completed" as const };
      },
    };
    const d = dependencies([]);
    const toolRows = new Map<string, any>();
    (d.db as any).agentToolCall = {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `tool-${data.ordinal}`, ...data };
        toolRows.set(row.id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = { ...toolRows.get(where.id), ...data };
        toolRows.set(where.id, row);
        return row;
      }),
    };
    d.chat.appendMessage.mockResolvedValue({ id: "message" });
    const registry = {
      listProviderTools: vi.fn(() => [{ name: "dashboard.get_overview", description: "dashboard", inputSchema: { type: "object" } }]),
      lookup: vi.fn(() => ({
        name: "dashboard.get_overview",
        riskClass: "R0",
        parallelSafe: false,
        requiresExplicitIntent: false,
        inputSchema: z.object({}),
      })),
      listPublic: vi.fn(() => []),
    };
    const executor = {
      canRunInParallel: vi.fn(() => false),
      execute: vi.fn(async () => ({
        name: "dashboard.get_overview",
        riskClass: "R0",
        arguments: {},
        result: { ok: true },
        entityRefs: [],
      })),
    };
    const runner = new AgentRunnerService({ ...d, provider, registry, executor, maxSteps: 2 } as never);
    const run = await runner.startRun("11111111-1111-4111-8111-111111111111", {
      content: "loop",
      attachmentIds: [],
    });
    await runner.waitForRun(run.id);
    expect(providerRounds).toBe(2);
    expect(executor.execute).toHaveBeenCalledTimes(2);
    expect(d.db.agentRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "failed", errorCode: "AGENT_MAX_STEPS_EXCEEDED" }),
    }));
  });
});
