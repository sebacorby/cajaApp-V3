import { describe, expect, it, vi } from "vitest";
import { AgentChatService } from "../../src/modules/agent-chat/agent-chat.service.js";

function prismaMock() {
  return {
    agentConversation: {
      create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(),
      update: vi.fn(), delete: vi.fn(),
    },
    agentMessage: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    agentAttachment: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(),
  };
}

describe("AgentChatService conversations", () => {
  it("crea conversación con título default y serializa fechas", async () => {
    const db = prismaMock();
    db.agentConversation.create.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Nuevo chat", status: "active", lastProvider: null, lastModel: null,
      createdAt: new Date("2026-09-12T20:00:00Z"), updatedAt: new Date("2026-09-12T20:00:00Z"), archivedAt: null,
    });
    const service = new AgentChatService(db as never);
    const created = await service.createConversation({});
    expect(db.agentConversation.create).toHaveBeenCalledWith({ data: { title: "Nuevo chat" } });
    expect(created.createdAt).toBe("2026-09-12T20:00:00.000Z");
  });
  it("pagina por cursor y conserva orden reciente", async () => {
    const db = prismaMock();
    db.agentConversation.findUnique.mockResolvedValue({ updatedAt: new Date("2026-09-12T19:00:00Z") });
    db.agentConversation.findMany.mockResolvedValue([
      { id: "22222222-2222-4222-8222-222222222222", title: "B", status: "active", lastProvider: null, lastModel: null, createdAt: new Date(), updatedAt: new Date("2026-09-12T18:00:00Z"), archivedAt: null },
    ]);
    const service = new AgentChatService(db as never);
    const result = await service.listConversations({
      cursor: "11111111-1111-4111-8111-111111111111", limit: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(db.agentConversation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 2,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    }));
  });

  it("renombra, archiva/reactiva y elimina mediante el delegate Agent*", async () => {
    const db = prismaMock();
    db.agentConversation.update.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111", title: "Renombrado", status: "archived",
      lastProvider: null, lastModel: null, createdAt: new Date(), updatedAt: new Date(), archivedAt: new Date(),
    });
    db.agentConversation.delete.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" });
    const service = new AgentChatService(db as never);
    await service.updateConversation("11111111-1111-4111-8111-111111111111", { title: "Renombrado", status: "archived" });
    await service.deleteConversation("11111111-1111-4111-8111-111111111111");
    expect(db.agentConversation.update).toHaveBeenCalled();
    expect(db.agentConversation.delete).toHaveBeenCalledWith({ where: { id: "11111111-1111-4111-8111-111111111111" } });
  });
});
