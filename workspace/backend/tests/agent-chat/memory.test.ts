import { describe, expect, it, vi } from "vitest";
import { AgentMemoryService } from "../../src/modules/agent-chat/agent-memory.service.js";
import { AgentContextService } from "../../src/modules/agent-chat/agent-context.service.js";

const conversationId = "11111111-1111-4111-8111-111111111111";

function row(sequence: number, role: "user" | "assistant" | "tool", content: unknown) {
  return {
    id: `message-${sequence}`,
    conversationId,
    sequence,
    role,
    contentJson: JSON.stringify(content),
    createdAt: new Date(`2026-09-13T12:00:${String(sequence).padStart(2, "0")}.000Z`),
  };
}

describe("AgentMemoryService US6", () => {
  it("compacta historial viejo preservando entity refs, ids y acciones pendientes", async () => {
    const db = {
      agentConversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: conversationId,
          summaryText: null,
          summaryVersion: null,
          summaryThroughSequence: null,
        }),
        update: vi.fn(async ({ data }: any) => ({ id: conversationId, ...data })),
      },
      agentMessage: {
        findMany: vi.fn().mockResolvedValue([
          row(1, "user", { text: "Revisá el movimiento aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
          row(2, "tool", {
            text: "ok",
            toolCall: {
              id: "tool-read-1",
              name: "movements.get",
              status: "succeeded",
              entityRefs: [{ entityType: "movement", entityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", label: "Farmacia" }],
            },
          }),
          row(3, "assistant", { text: "Ese movimiento queda como referencia." }),
          row(4, "tool", {
            text: "pending",
            toolCall: {
              id: "tool-pending-1",
              name: "month_close.create",
              status: "awaiting_approval",
              arguments: { monthKey: "2026-08" },
            },
          }),
          row(5, "user", { text: "seguí con eso" }),
          row(6, "assistant", { text: "continúo" }),
        ]),
      },
    };
    const service = new AgentMemoryService(db as never, { recentMessages: 2, maxContextCharacters: 20_000 });
    const memory = await service.compactIfNeeded(conversationId);

    expect(memory.summaryThroughSequence).toBe(4);
    expect(memory.summaryVersion).toBe("agent-memory-v1");
    const summary = JSON.parse(memory.summaryText ?? "{}");
    expect(summary.entityRefs).toContainEqual(expect.objectContaining({
      entityType: "movement",
      entityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    }));
    expect(summary.identifiers).toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(summary.pendingActions).toContainEqual(expect.objectContaining({
      id: "tool-pending-1",
      name: "month_close.create",
      status: "awaiting_approval",
    }));
    expect(db.agentConversation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: conversationId },
      data: expect.objectContaining({
        summaryVersion: "agent-memory-v1",
        summaryThroughSequence: 4,
      }),
    }));
  });
});

describe("AgentContextService US6", () => {
  it("arma prompt con summary + preferencias y sólo mensajes recientes", async () => {
    const memory = {
      compactIfNeeded: vi.fn().mockResolvedValue({
        summaryText: JSON.stringify({
          entityRefs: [{ entityType: "movement", entityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }],
          pendingActions: [{ id: "tool-pending-1", name: "month_close.create", status: "awaiting_approval" }],
        }),
        summaryVersion: "agent-memory-v1",
        summaryThroughSequence: 4,
      }),
    };
    const chat = {
      getProviderMessages: vi.fn().mockResolvedValue([
        { role: "user", content: "seguí con eso" },
        { role: "assistant", content: "continúo" },
      ]),
    };
    const settings = {
      getSettings: vi.fn().mockResolvedValue({
        timezone: "America/Argentina/Tucuman",
        defaultCurrency: "ARS",
        hideAmounts: true,
        locale: "es-AR",
      }),
    };
    const registry = {
      listPublic: vi.fn().mockReturnValue([
        { name: "movements.get", riskClass: "R0" },
        { name: "month_close.create", riskClass: "R3" },
      ]),
    };
    const service = new AgentContextService({
      memory: memory as never,
      chat: chat as never,
      settings: settings as never,
      registry: registry as never,
      recentMessages: 2,
      maxContextCharacters: 20_000,
      loadPrompt: async () => "BASE PROMPT",
      now: () => new Date("2026-09-13T22:00:00.000Z"),
    });
    const context = await service.build(conversationId);

    expect(chat.getProviderMessages).toHaveBeenCalledWith(conversationId, {
      afterSequence: 4,
      limit: 2,
    });
    expect(context.messages).toHaveLength(3);
    expect(context.messages[0].role).toBe("system");
    expect(context.messages[0].content).toContain("BASE PROMPT");
    expect(context.messages[0].content).toContain("America/Argentina/Tucuman");
    expect(context.messages[0].content).toContain("defaultCurrency=ARS");
    expect(context.messages[0].content).toContain("hideAmounts=true");
    expect(context.messages[0].content).toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(context.messages[0].content).toContain("tool-pending-1");
    expect(context.messages[1]).toEqual({ role: "user", content: "seguí con eso" });
    expect(context.messages[2]).toEqual({ role: "assistant", content: "continúo" });
    expect(context.latestUserText).toBe("seguí con eso");
  });
});
