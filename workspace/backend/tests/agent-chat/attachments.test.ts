import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentChatService } from "../../src/modules/agent-chat/agent-chat.service.js";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";
const roots: string[] = [];

async function tempRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "caja-agent-attachments-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function prismaMock() {
  return {
    agentConversation: { findUnique: vi.fn(), delete: vi.fn() },
    agentAttachment: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
  };
}

describe("AgentChatService attachments", () => {
  it("admite CSV por extensión aunque el browser envíe MIME genérico y normaliza el MIME", async () => {
    const db = prismaMock();
    db.agentConversation.findUnique.mockResolvedValue({ id: CONVERSATION_ID });
    const root = await tempRoot();
    db.agentAttachment.create.mockImplementation(async ({ data }: any) => ({
      id: "22222222-2222-4222-8222-222222222222", ...data, createdAt: new Date(),
    }));
    const service = new AgentChatService(db as never, root);

    const result = await service.stageAttachment(CONVERSATION_ID, {
      filename: "movimientos.CSV",
      mimetype: "application/octet-stream",
      buffer: Buffer.from("Fecha;Descripción;Débito;Crédito;Referencia\n11/07/2026;TEST;10;;A-1"),
    });

    const created = db.agentAttachment.create.mock.calls[0][0].data;
    expect(created.mimeType).toBe("text/csv");
    expect(result.mimeType).toBe("text/csv");
    expect(path.dirname(created.storagePath)).toBe(path.join(path.resolve(root), CONVERSATION_ID));
    expect(path.extname(created.storagePath)).toBe(".csv");
  });

  it("admite PDF por extensión aunque el browser MIME no sea application/pdf", async () => {
    const db = prismaMock();
    db.agentConversation.findUnique.mockResolvedValue({ id: CONVERSATION_ID });
    const root = await tempRoot();
    db.agentAttachment.create.mockImplementation(async ({ data }: any) => ({
      id: "33333333-3333-4333-8333-333333333333", ...data, createdAt: new Date(),
    }));
    const service = new AgentChatService(db as never, root);

    const result = await service.stageAttachment(CONVERSATION_ID, {
      filename: "resumen.PDF",
      mimetype: "application/octet-stream",
      buffer: Buffer.from("%PDF-test"),
    });

    expect(result.mimeType).toBe("application/pdf");
    expect(db.agentAttachment.create.mock.calls[0][0].data.mimeType).toBe("application/pdf");
  });

  it("rechaza extensión no soportada aunque el MIME afirme PDF", async () => {
    const db = prismaMock();
    db.agentConversation.findUnique.mockResolvedValue({ id: CONVERSATION_ID });
    const root = await tempRoot();
    const service = new AgentChatService(db as never, root);

    await expect(service.stageAttachment(CONVERSATION_ID, {
      filename: "foto.png", mimetype: "application/pdf", buffer: Buffer.from("png"),
    })).rejects.toMatchObject({ code: "AGENT_ATTACHMENT_INVALID" });
    expect(db.agentAttachment.create).not.toHaveBeenCalled();
  });

  it("rechaza extensión fuera de PDF/CSV antes de escribir", async () => {
    const db = prismaMock();
    db.agentConversation.findUnique.mockResolvedValue({ id: CONVERSATION_ID });
    const root = await tempRoot();
    const service = new AgentChatService(db as never, root);
    const stage = (service as any).stageAttachment;
    expect(typeof stage).toBe("function");
    if (typeof stage !== "function") return;

    await expect(stage.call(service, CONVERSATION_ID, {
      filename: "foto.png", mimetype: "image/png", buffer: Buffer.from("png"),
    })).rejects.toMatchObject({ code: "AGENT_ATTACHMENT_INVALID" });
    expect(db.agentAttachment.create).not.toHaveBeenCalled();
  });

  it("rechaza archivos vacíos o mayores a 10 MiB", async () => {
    const db = prismaMock();
    db.agentConversation.findUnique.mockResolvedValue({ id: CONVERSATION_ID });
    const root = await tempRoot();
    const service = new AgentChatService(db as never, root);
    const stage = (service as any).stageAttachment;
    expect(typeof stage).toBe("function");
    if (typeof stage !== "function") return;

    for (const buffer of [Buffer.alloc(0), Buffer.alloc(10 * 1024 * 1024 + 1)]) {
      await expect(stage.call(service, CONVERSATION_ID, {
        filename: "datos.csv", mimetype: "text/csv", buffer,
      })).rejects.toMatchObject({ code: "AGENT_ATTACHMENT_INVALID" });
    }
  });

  it("persiste ownership, sha256 y un storage path controlado sin exponerlo", async () => {
    const db = prismaMock();
    db.agentConversation.findUnique.mockResolvedValue({ id: CONVERSATION_ID });
    const root = await tempRoot();
    const buffer = Buffer.from("fecha,importe\n2026-09-13,18500\n");
    db.agentAttachment.create.mockImplementation(async ({ data }: any) => ({
      id: "22222222-2222-4222-8222-222222222222", ...data, status: "staged", createdAt: new Date(),
    }));
    const service = new AgentChatService(db as never, root);
    const stage = (service as any).stageAttachment;
    expect(typeof stage).toBe("function");
    if (typeof stage !== "function") return;

    const result = await stage.call(service, CONVERSATION_ID, {
      filename: "..\\..\\secreto.csv", mimetype: "text/csv", buffer,
    });
    const created = db.agentAttachment.create.mock.calls[0][0].data;
    expect(created.conversationId).toBe(CONVERSATION_ID);
    expect(created.sha256).toBe(createHash("sha256").update(buffer).digest("hex"));
    expect(path.resolve(created.storagePath).startsWith(path.resolve(root) + path.sep)).toBe(true);
    expect(created.storagePath).not.toContain("secreto.csv");
    expect(await readFile(created.storagePath)).toEqual(buffer);
    expect(result).not.toHaveProperty("storagePath");
  });

  it("no permite stage sobre una conversación ajena o inexistente", async () => {
    const db = prismaMock();
    db.agentConversation.findUnique.mockResolvedValue(null);
    const root = await tempRoot();
    const service = new AgentChatService(db as never, root);
    const stage = (service as any).stageAttachment;
    expect(typeof stage).toBe("function");
    if (typeof stage !== "function") return;

    await expect(stage.call(service, CONVERSATION_ID, {
      filename: "resumen.pdf", mimetype: "application/pdf", buffer: Buffer.from("%PDF-test"),
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.agentAttachment.create).not.toHaveBeenCalled();
  });

  it("resolveAttachment falla cerrado si el archivo staged fue alterado", async () => {
    const db = prismaMock();
    const root = await tempRoot();
    const conversationDir = path.join(root, CONVERSATION_ID);
    await import("node:fs/promises").then(({ mkdir }) => mkdir(conversationDir, { recursive: true }));
    const storedPath = path.join(conversationDir, "44444444-4444-4444-8444-444444444444.csv");
    const original = Buffer.from("Fecha;Descripción;Débito;Crédito;Referencia\n11/07/2026;TEST;10;;A-1");
    await writeFile(storedPath, original);
    db.agentAttachment.findFirst.mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
      conversationId: CONVERSATION_ID,
      fileName: "movimientos.csv",
      mimeType: "text/csv",
      sizeBytes: original.length,
      sha256: createHash("sha256").update(original).digest("hex"),
      storagePath: storedPath,
      status: "staged",
    });
    const service = new AgentChatService(db as never, root);

    await writeFile(storedPath, Buffer.from("contenido alterado"));

    await expect(service.resolveAttachment(CONVERSATION_ID, "44444444-4444-4444-8444-444444444444"))
      .rejects.toMatchObject({ code: "AGENT_ATTACHMENT_INVALID" });
  });

  it("appendMessage rechaza attachmentIds que no están staged y owned por la conversación", async () => {
    const tx = {
      agentAttachment: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
      agentMessage: { findFirst: vi.fn(), create: vi.fn() },
      agentConversation: { update: vi.fn() },
    };
    const db = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const service = new AgentChatService(db as never, await tempRoot());

    await expect(service.appendMessage(CONVERSATION_ID, "user", {
      text: "importalo",
      attachmentIds: ["55555555-5555-4555-8555-555555555555"],
    })).rejects.toMatchObject({ code: "AGENT_ATTACHMENT_INVALID" });
    expect(tx.agentMessage.create).not.toHaveBeenCalled();
  });

  it("getProviderMessages expone sólo metadata segura del attachment", async () => {
    const db = {
      agentMessage: { findMany: vi.fn().mockResolvedValue([{
        role: "user",
        contentJson: JSON.stringify({ text: "importalo", attachmentIds: ["66666666-6666-4666-8666-666666666666"] }),
      }]) },
      agentAttachment: { findMany: vi.fn().mockResolvedValue([{
        id: "66666666-6666-4666-8666-666666666666",
        fileName: "movimientos.csv",
        mimeType: "text/csv",
        sizeBytes: 123,
        storagePath: "C:\\secret\\never-expose.csv",
      }]) },
    };
    const service = new AgentChatService(db as never, await tempRoot());

    const messages = await service.getProviderMessages(CONVERSATION_ID);
    expect(messages[0].content).toContain("attachmentId=66666666-6666-4666-8666-666666666666");
    expect(messages[0].content).toContain("fileName=movimientos.csv");
    expect(messages[0].content).not.toContain("storagePath");
    expect(messages[0].content).not.toContain("never-expose.csv");
  });

  it("al borrar la conversación elimina archivos staged además del cascade Agent*", async () => {
    const db = prismaMock();
    const root = await tempRoot();
    const storedPath = path.join(root, "staged-file.pdf");
    await writeFile(storedPath, Buffer.from("%PDF-test"));
    db.agentAttachment.findMany.mockResolvedValue([{ storagePath: storedPath, status: "staged" }]);
    db.agentConversation.delete.mockResolvedValue({ id: CONVERSATION_ID });
    const service = new AgentChatService(db as never, root);

    await service.deleteConversation(CONVERSATION_ID);
    expect(db.agentAttachment.findMany).toHaveBeenCalledWith({
      where: { conversationId: CONVERSATION_ID, status: "staged" }, select: { storagePath: true },
    });
    expect(db.agentConversation.delete).toHaveBeenCalledWith({ where: { id: CONVERSATION_ID } });
    await expect(stat(storedPath)).rejects.toMatchObject({ code: "ENOENT" });
  });
});