import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AgentRunnerService } from "../../src/modules/agent-chat/agent-runner.service.js";
import { AgentEventsService } from "../../src/modules/agent-chat/agent-events.service.js";
import {
  AgentToolRegistry,
  projectAgentResult,
  type AgentToolRegistryEntry,
} from "../../src/modules/agent-chat/agent-tool-registry.js";
import { AgentToolExecutor } from "../../src/modules/agent-chat/agent-tool-executor.js";
import {
  AgentApprovalService,
  canonicalToolArguments,
  computeArgumentsHash,
} from "../../src/modules/agent-chat/agent-approval.service.js";
import type { AgentChatProvider, AgentProviderToolCall } from "../../src/modules/ai/agent/agent-chat-provider.js";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";
const RUN_ID = "22222222-2222-4222-8222-222222222222";
const TOOL_CALL_ID = "tool-crit-1";
const PROVIDER_CALL_ID = "provider-crit-1";

function criticalEntry(
  name = "test.critical",
  handler = vi.fn(async () => ({ ok: true, name })),
): AgentToolRegistryEntry {
  return {
    name,
    description: "test critical tool",
    inputSchema: z.object({ value: z.string(), confirmed: z.boolean().default(false) }),
    riskClass: "R3",
    parallelSafe: false,
    requiresExplicitIntent: false,
    handler,
    resultProjector: projectAgentResult,
    auditEntityRefs: () => [],
  };
}

type ApprovalDeps = {
  db: any;
  chat: any;
  eventBus: AgentEventsService;
  approvals: AgentApprovalService;
  executor: AgentToolExecutor;
  handler: ReturnType<typeof vi.fn>;
};
function approvalDeps(toolName = "test.critical"): ApprovalDeps {
  const toolRows = new Map<string, any>();
  const approvalRows = new Map<string, any>();
  const handler = vi.fn(async () => ({ ok: true, name: toolName }));
  const registry = new AgentToolRegistry([criticalEntry(toolName, handler)]);
  const runRow = { id: RUN_ID, status: "running" };

  const db: any = {
    agentRun: {
      create: vi.fn(async ({ data }: { data: object }) => ({ id: RUN_ID, status: "running", ...data })),
      update: vi.fn(async ({ data }: { data: object }) => Object.assign(runRow, data)),
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => ({
        id: RUN_ID,
        conversationId: CONVERSATION_ID,
        status: runRow.status,
        provider: "fake",
        model: "critical-tools",
        startedAt: new Date(),
        toolCallCount: 0,
      })),
    },
    agentConversation: { update: vi.fn(async () => ({})) },
    agentToolCall: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; idempotencyKey?: string } }) =>
        toolRows.get(where.id ?? "") ?? toolRows.get(where.idempotencyKey ?? "")),
      create: vi.fn(async ({ data }: { data: object }) => {
        const row = {
          id: TOOL_CALL_ID, ...data, createdAt: new Date(), completedAt: null, resultJson: null, status: "proposed",
        };
        toolRows.set(row.id, row);
        if (row.idempotencyKey) toolRows.set(row.idempotencyKey, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: object }) => {
        const row = toolRows.get(where.id);
        Object.assign(row, data);
        if (row.idempotencyKey) toolRows.set(row.idempotencyKey, row);
        return row;
      }),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    agentApproval: {
      create: vi.fn(async ({ data }: { data: object }) => {
        const row = { id: "approval-1", ...data, requestedAt: new Date(), resolvedAt: null };
        approvalRows.set((data as { toolCallId: string }).toolCallId, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { toolCallId: string } }) => approvalRows.get(where.toolCallId)),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: object }) => {
        const [row] = approvalRows.values();
        if (row) Object.assign(row, data);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; status?: string }; data: object }) => {
        const [row] = approvalRows.values();
        if (!row || row.id !== where.id || (where.status && row.status !== where.status)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }),
    },
  };
const chat = {
    getConversation: vi.fn(async () => ({ id: CONVERSATION_ID })),
    appendMessage: vi.fn(async () => ({ id: "user-1" })),
    getProviderMessages: vi.fn(),
  };

  const eventBus = new AgentEventsService({ heartbeatMs: 60_000 });
  const approvals = new AgentApprovalService(db as never, { approvalTtlMs: 60_000 });
  const executor = new AgentToolExecutor(registry, {
    findSucceeded: vi.fn(async () => null),
    markSucceeded: vi.fn(async () => undefined),
  });
  return { db, chat, eventBus, approvals, executor, handler };
}

function twoRoundProvider(toolName: string, argumentsValue: Record<string, unknown>): AgentChatProvider {
  let round = 0;
  return {
    identity: { provider: "fake", model: "critical-tools" },
    async *stream() {
      round += 1;
      if (round === 1) {
        yield { type: "tool-call" as const, toolCall: { id: PROVIDER_CALL_ID, name: toolName, arguments: argumentsValue } };
        yield { type: "completed" as const, usage: { inputTokens: 1, outputTokens: 1 } };
        return;
      }
      yield { type: "text-delta" as const, text: "Listo, continué la conversación." };
      yield { type: "completed" as const, usage: { inputTokens: 1, outputTokens: 1 } };
    },
  };
}

function roundBasedProviderMessages(toolName: string, userText: string, argumentsValue: Record<string, unknown>) {
  return vi
    .fn()
    .mockResolvedValueOnce([{ role: "user", content: userText }])
    .mockResolvedValueOnce([
      { role: "user", content: userText },
      { role: "assistant", content: "", toolCalls: [{ id: PROVIDER_CALL_ID, name: toolName, arguments: argumentsValue }] },
      { role: "tool", content: "", toolCallId: PROVIDER_CALL_ID, name: toolName },
    ]);
}

async function waitFor(predicate: () => boolean, timeoutMs = 3_000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("AgentApprovalService", () => {
  it("canonicalToolArguments es estable ante orden de claves y sensible al valor", () => {
    const first = canonicalToolArguments({ b: 1, a: { d: "x", c: [1, 2] } });
    const reordered = canonicalToolArguments({ a: { c: [1, 2], d: "x" }, b: 1 });
    expect(first).toBe(reordered);
    expect(canonicalToolArguments({ a: 1 })).not.toBe(canonicalToolArguments({ a: 2 }));
  });

  it("computeArgumentsHash liga toolName + argumentos canónicos", () => {
    const args = { value: "x", nested: { enabled: true } };
    const expected = computeArgumentsHash("test.critical", args);
    expect(expected).toMatch(/^[a-f0-9]{64}$/);
    expect(computeArgumentsHash("test.critical", { nested: { enabled: true }, value: "x" })).toBe(expected);
    expect(computeArgumentsHash("test.critical", { value: "y", nested: { enabled: true } })).not.toBe(expected);
    expect(computeArgumentsHash("test.other", args)).not.toBe(expected);
  });

  it("crea approvals pending con impacto y argumentsHash", async () => {
    const d = approvalDeps();
    const approval = await d.approvals.requestApproval({
      toolCallId: TOOL_CALL_ID,
      toolName: "test.critical",
      arguments: { value: "x" },
      impactSummary: { riskClass: "R3", danger: "reversible: false" },
    });
    expect(approval.status).toBe("pending");
    expect(approval.argumentsHash).toBe(computeArgumentsHash("test.critical", { value: "x" }));
    expect(approval.impact).toEqual({ riskClass: "R3", danger: "reversible: false" });
    expect(d.db.agentApproval.create).toHaveBeenCalled();
  });

  it("no permite aprobar si los argumentos de la tool call ya cambiaron", async () => {
    const d = approvalDeps();
    await d.approvals.requestApproval({
      toolCallId: TOOL_CALL_ID, toolName: "test.critical", arguments: { value: "x" }, impactSummary: {},
    });
    d.db.agentToolCall.findUnique = vi.fn(async ({ where }: { where: { id?: string } }) =>
      where.id === TOOL_CALL_ID
        ? { id: TOOL_CALL_ID, toolName: "test.critical", argumentsJson: JSON.stringify({ value: "y" }) }
        : null);
    await expect(d.approvals.approve(TOOL_CALL_ID)).rejects.toMatchObject({ code: "APPROVAL_ARGUMENTS_MISMATCH" });
  });

  it("aprueba y rechaza una vez (estados terminales no vuelven a pending)", async () => {
    const d = approvalDeps();
    await d.approvals.requestApproval({
      toolCallId: TOOL_CALL_ID, toolName: "test.critical", arguments: { value: "x" }, impactSummary: {},
    });
    const approved = await d.approvals.approve(TOOL_CALL_ID);
    expect(approved.status).toBe("approved");
    await expect(d.approvals.approve(TOOL_CALL_ID)).rejects.toMatchObject({ code: "APPROVAL_NOT_PENDING" });
    await expect(d.approvals.reject(TOOL_CALL_ID)).rejects.toMatchObject({ code: "APPROVAL_NOT_PENDING" });
  });

  it("expira approvals pendientes después de la TTL y resuelve al runner", async () => {
    const d = approvalDeps();
    await d.approvals.requestApproval({
      toolCallId: TOOL_CALL_ID, toolName: "test.critical", arguments: { value: "x" }, impactSummary: {},
    });
    const decision = await d.approvals.waitForDecision(TOOL_CALL_ID, 40);
    expect(decision.status).toBe("expired");
    const after = await d.approvals.getByToolCall(TOOL_CALL_ID);
    expect(after?.status).toBe("expired");
  });

  it("entrega la misma decisión a waiters concurrentes de una misma approval", async () => {
    const d = approvalDeps();
    await d.approvals.requestApproval({
      toolCallId: TOOL_CALL_ID, toolName: "test.critical", arguments: { value: "x" }, impactSummary: {},
    });
    const first = d.approvals.waitForDecision(TOOL_CALL_ID, 1_000);
    const second = d.approvals.waitForDecision(TOOL_CALL_ID, 1_000);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await d.approvals.reject(TOOL_CALL_ID);
    const decisions = await Promise.all([first, second]);
    expect(decisions.map((decision) => decision.status)).toEqual(["rejected", "rejected"]);
  });

  it("resuelve approve/reject de forma atómica: una sola transición terminal gana", async () => {
    const d = approvalDeps();
    await d.approvals.requestApproval({
      toolCallId: TOOL_CALL_ID, toolName: "test.critical", arguments: { value: "x" }, impactSummary: {},
    });
    const outcomes = await Promise.allSettled([
      d.approvals.approve(TOOL_CALL_ID),
      d.approvals.reject(TOOL_CALL_ID),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
  });
});
describe("AgentRunnerService US4 approvals", () => {
  function runnerDeps(
    toolName = "test.critical",
    argumentsValue: Record<string, unknown> = { value: "x" },
    userText = "Ejecutá la acción crítica",
  ) {
    const d = approvalDeps(toolName);
    d.chat.appendMessage.mockResolvedValue({ id: "user-1" });
    d.chat.getProviderMessages = roundBasedProviderMessages(toolName, userText, argumentsValue);
    const provider = twoRoundProvider(toolName, argumentsValue);
    const registry = new AgentToolRegistry([criticalEntry(toolName, d.handler)]);
    const context = {
      build: vi.fn(async () => {
        const recent = await d.chat.getProviderMessages(CONVERSATION_ID);
        const latestUserText = [...recent].reverse().find((message: any) => message.role === "user")?.content ?? "";
        return { messages: [{ role: "system", content: "TEST PROMPT" }, ...recent], latestUserText };
      }),
    };
    const runner = new AgentRunnerService({
      db: d.db, chat: d.chat, provider, eventBus: d.eventBus,
      registry, executor: d.executor, approvals: d.approvals, context,
    } as never);
    return { ...d, runner };
  }

  it("pausa en awaiting_approval, pide approval y NO ejecuta antes de confirmar", async () => {
    const { runner, db, eventBus, handler, approvals } = runnerDeps();
    const run = await runner.startRun(CONVERSATION_ID, { content: "Ejecutá la acción crítica", attachmentIds: [] });
    await waitFor(() => eventBus.replay(run.id).some((event) => event.type === "approval.required"));
    expect(handler).not.toHaveBeenCalled();
    const approvalEvent = eventBus.replay(run.id).find((event) => event.type === "approval.required");
    expect(approvalEvent?.payload).toMatchObject({ name: "test.critical", riskClass: "R3" });
    expect(db.agentRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "awaiting_approval" }),
    }));
    const toolCallRow = await db.agentToolCall.findUnique({ where: { idempotencyKey: `${RUN_ID}:${PROVIDER_CALL_ID}` } });
    expect(toolCallRow.status).toBe("awaiting_approval");
    const approval = await approvals.getByToolCall(TOOL_CALL_ID);
    expect(approval?.status).toBe("pending");
    expect(approval?.argumentsHash).toBe(computeArgumentsHash("test.critical", { value: "x", confirmed: false }));
    expect(eventBus.replay(run.id).some((event) => event.type === "tool.started")).toBe(false);
    expect(eventBus.replay(run.id).some((event) => event.type === "run.completed")).toBe(false);
    await approvals.reject(TOOL_CALL_ID);
    await runner.waitForRun(run.id);
  });

  it("rechaza argumentos R3 inválidos antes de crear una approval", async () => {
    const { runner, db, eventBus, handler } = runnerDeps("test.critical", { value: 7 });
    const run = await runner.startRun(CONVERSATION_ID, { content: "Ejecutá la acción crítica", attachmentIds: [] });
    await runner.waitForRun(run.id);
    expect(handler).not.toHaveBeenCalled();
    expect(db.agentApproval.create).not.toHaveBeenCalled();
    expect(eventBus.replay(run.id).some((event) => event.type === "approval.required")).toBe(false);
    expect(eventBus.replay(run.id).some((event) => event.type === "tool.failed")).toBe(true);
  });

  it("confirmar la approval continúa el MISMO run y ejecuta exactamente la tool aprobada", async () => {
    const { runner, eventBus, handler, approvals } = runnerDeps();
    const run = await runner.startRun(CONVERSATION_ID, { content: "Ejecutá la acción crítica", attachmentIds: [] });
    await waitFor(() => eventBus.replay(run.id).some((event) => event.type === "approval.required"));
    expect(handler).not.toHaveBeenCalled();
    await approvals.approve(TOOL_CALL_ID);
    await runner.waitForRun(run.id);
    expect(handler).toHaveBeenCalledTimes(1);
    const types = eventBus.replay(run.id).map((event) => event.type);
    expect(types).toContain("approval.resolved");
    expect(types).toContain("tool.started");
    expect(types).toContain("tool.completed");
    expect(types.indexOf("approval.resolved")).toBeLessThan(types.indexOf("tool.started"));
    expect(types.indexOf("tool.started")).toBeLessThan(types.indexOf("tool.completed"));
    expect(types[types.length - 1]).toBe("run.completed");
    const resolved = eventBus.replay(run.id).find((event) => event.type === "approval.resolved");
    expect((resolved?.payload as { status?: string }).status).toBe("approved");
  });

  it("rechazar marca la tool rejected, no muta y el run continúa sin reintentar", async () => {
    const { runner, db, eventBus, handler, approvals } = runnerDeps();
    const run = await runner.startRun(CONVERSATION_ID, { content: "Ejecutá la acción crítica", attachmentIds: [] });
    await waitFor(() => eventBus.replay(run.id).some((event) => event.type === "approval.required"));
    await approvals.reject(TOOL_CALL_ID);
    await runner.waitForRun(run.id);
    expect(handler).not.toHaveBeenCalled();
    const toolCallRow = await db.agentToolCall.findUnique({ where: { idempotencyKey: `${RUN_ID}:${PROVIDER_CALL_ID}` } });
    expect(toolCallRow.status).toBe("rejected");
    const types = eventBus.replay(run.id).map((event) => event.type);
    expect(types).toContain("approval.resolved");
    expect(types[types.length - 1]).toBe("run.completed");
    const resolved = eventBus.replay(run.id).find((event) => event.type === "approval.resolved");
    expect((resolved?.payload as { status?: string }).status).toBe("rejected");
  });

  it("no ejecuta la tool si el run se cancela durante la espera de approval", async () => {
    const { runner, eventBus, handler } = runnerDeps();
    const run = await runner.startRun(CONVERSATION_ID, { content: "Ejecutá la acción crítica", attachmentIds: [] });
    await waitFor(() => eventBus.replay(run.id).some((event) => event.type === "approval.required"));
    expect(handler).not.toHaveBeenCalled();
    await runner.cancelRun(run.id);
    await runner.waitForRun(run.id);
    expect(handler).not.toHaveBeenCalled();
    expect(eventBus.replay(run.id).some((event) => event.type === "run.cancelled")).toBe(true);
  });
});