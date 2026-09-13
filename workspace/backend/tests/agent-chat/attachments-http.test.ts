import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { agentChatService } from "../../src/modules/agent-chat/agent-chat.service.js";
import { agentRunnerService } from "../../src/modules/agent-chat/agent-runner.service.js";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";
const ATTACHMENT_ID = "22222222-2222-4222-8222-222222222222";

function multipartFile(filename: string, contentType: string, body: Buffer) {
  const boundary = "----cajaapp-agent-test";
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    payload: Buffer.concat([head, body, tail]),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

describe("agent attachment HTTP contract", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST upload devuelve metadata segura y conserva el MIME del browser para staging", async () => {
    const dto = {
      id: ATTACHMENT_ID,
      conversationId: CONVERSATION_ID,
      messageId: null,
      fileName: "movimientos.csv",
      mimeType: "text/csv",
      sizeBytes: 15,
      sha256: "abc",
      status: "staged",
      createdAt: new Date().toISOString(),
    };
    const stage = vi.spyOn(agentChatService, "stageAttachment").mockResolvedValue(dto as never);
    const multipart = multipartFile("movimientos.csv", "application/octet-stream", Buffer.from("Fecha;Importe\n"));
    const response = await app.inject({
      method: "POST",
      url: `/api/agent/conversations/${CONVERSATION_ID}/attachments`,
      headers: multipart.headers,
      payload: multipart.payload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(dto);
    expect(response.json()).not.toHaveProperty("storagePath");
    expect(stage).toHaveBeenCalledWith(CONVERSATION_ID, expect.objectContaining({
      filename: "movimientos.csv",
      mimetype: "application/octet-stream",
      buffer: expect.any(Buffer),
    }));
  });

  it("GET lista y DELETE elimina sólo por conversation + attachment id", async () => {
    const item = { id: ATTACHMENT_ID, conversationId: CONVERSATION_ID, fileName: "x.csv" };
    const list = vi.spyOn(agentChatService, "listAttachments").mockResolvedValue([item] as never);
    const remove = vi.spyOn(agentChatService, "deleteAttachment").mockResolvedValue(undefined);

    const listed = await app.inject({ method: "GET", url: `/api/agent/conversations/${CONVERSATION_ID}/attachments` });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual({ items: [item] });
    expect(list).toHaveBeenCalledWith(CONVERSATION_ID);

    const deleted = await app.inject({ method: "DELETE", url: `/api/agent/conversations/${CONVERSATION_ID}/attachments/${ATTACHMENT_ID}` });
    expect(deleted.statusCode).toBe(204);
    expect(remove).toHaveBeenCalledWith(CONVERSATION_ID, ATTACHMENT_ID);
  });

  it("POST messages permite attachment-only y transmite ids al runner", async () => {
    const start = vi.spyOn(agentRunnerService, "startRun").mockResolvedValue({ id: "33333333-3333-4333-8333-333333333333", status: "running" } as never);
    const response = await app.inject({
      method: "POST",
      url: `/api/agent/conversations/${CONVERSATION_ID}/messages`,
      payload: { content: "", attachmentIds: [ATTACHMENT_ID] },
    });

    expect(response.statusCode).toBe(202);
    expect(start).toHaveBeenCalledWith(CONVERSATION_ID, { content: "", attachmentIds: [ATTACHMENT_ID] });
  });

  it("POST messages rechaza body vacío y más de 10 attachment ids", async () => {
    const start = vi.spyOn(agentRunnerService, "startRun").mockResolvedValue({ id: "33333333-3333-4333-8333-333333333333", status: "running" } as never);
    const empty = await app.inject({
      method: "POST", url: `/api/agent/conversations/${CONVERSATION_ID}/messages`, payload: {},
    });
    expect(empty.statusCode).toBe(400);

    const tooMany = await app.inject({
      method: "POST",
      url: `/api/agent/conversations/${CONVERSATION_ID}/messages`,
      payload: { content: "x", attachmentIds: Array.from({ length: 11 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`) },
    });
    expect(tooMany.statusCode).toBe(400);
    expect(start).not.toHaveBeenCalled();
  });
});
