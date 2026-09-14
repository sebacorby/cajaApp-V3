import { describe, expect, it, vi } from "vitest";
import { AgentChatService } from "../../src/modules/agent-chat/agent-chat.service.js";
import { projectAgentResult } from "../../src/modules/agent-chat/agent-tool-registry.js";

function mutationDelegate() {
  return {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };
}

describe("Agent chat safety boundaries", () => {
  it("eliminar una conversación sólo toca el grafo Agent* y no muta dominio financiero", async () => {
    const movement = mutationDelegate();
    const budget = mutationDelegate();
    const goal = mutationDelegate();
    const income = mutationDelegate();
    const db = {
      agentAttachment: { findMany: vi.fn().mockResolvedValue([]) },
      agentConversation: { delete: vi.fn().mockResolvedValue({ id: "conv-1" }) },
      movement,
      budget,
      goal,
      income,
    };
    const service = new AgentChatService(db as never);
    await service.deleteConversation("conv-1");

    expect(db.agentConversation.delete).toHaveBeenCalledWith({ where: { id: "conv-1" } });
    for (const delegate of [movement, budget, goal, income]) {
      expect(delegate.create).not.toHaveBeenCalled();
      expect(delegate.update).not.toHaveBeenCalled();
      expect(delegate.delete).not.toHaveBeenCalled();
      expect(delegate.deleteMany).not.toHaveBeenCalled();
    }
  });

  it("result projectors eliminan secretos y rutas físicas aunque usen claves genéricas", () => {
    const projected = projectAgentResult({
      ok: true,
      apiKey: "secret-key",
      token: "secret-token",
      storagePath: "I:\\private\\staged.pdf",
      filePath: "C:\\private\\artifact.csv",
      path: "I:\\private\\generic.txt",
      absolutePath: "C:\\private\\absolute.txt",
      nested: {
        authorization: "Bearer secret",
        cookie: "sid=secret",
        label: "safe",
      },
    });
    const serialized = JSON.stringify(projected);
    expect(serialized).toContain("safe");
    expect(serialized).not.toContain("secret-key");
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("private");
    expect(serialized).not.toContain("Bearer secret");
    expect(serialized).not.toContain("sid=secret");
  });
});
