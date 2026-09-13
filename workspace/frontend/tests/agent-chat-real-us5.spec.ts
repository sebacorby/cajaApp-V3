import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";

const API_BASE_URL = process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";
const PROVIDER_PORT = Number(process.env.CAJAAPP_AGENT_FAKE_PROVIDER_PORT ?? 11501);

function writeSse(response: import("node:http").ServerResponse, chunks: unknown[]) {
  response.writeHead(200, { "content-type": "text/event-stream" });
  for (const chunk of chunks) response.write(`data: ${JSON.stringify(chunk)}\n\n`);
  response.end("data: [DONE]\n\n");
}

let providerServer: Server;

test.beforeAll(async () => {
  providerServer = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => {
      const body = JSON.parse(raw || "{}") as {
        messages?: Array<{ role?: string; content?: string; name?: string }>;
      };
      const messages = body.messages ?? [];
      const latestUser = [...messages].reverse().find((message) => message.role === "user");      if (messages.some((message) => message.role === "tool")) {
        writeSse(response, [{
          id: "tester-final",
          choices: [{ delta: { content: "Preview real de débito listo para revisar." }, finish_reason: "stop" }],
        }]);
        return;
      }

      const attachmentId = latestUser?.content?.match(/attachmentId=([0-9a-f-]{36})/i)?.[1];
      if (!attachmentId) {
        writeSse(response, [{
          id: "tester-no-attachment",
          choices: [{ delta: { content: "Necesito un adjunto válido." }, finish_reason: "stop" }],
        }]);
        return;
      }

      writeSse(response, [{
        id: "tester-tool",
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              id: "tester-debit-preview",
              function: { name: "debit_import.preview_attachment", arguments: JSON.stringify({ attachmentId }) },
            }],          },
          finish_reason: "tool_calls",
        }],
      }]);
    });
  });
  await new Promise<void>((resolve) => providerServer.listen(PROVIDER_PORT, "127.0.0.1", resolve));
});

test.afterAll(async () => new Promise<void>((resolve) => providerServer.close(() => resolve())));

test("FEAT-024 REAL — browser multipart reaches debit preview draft without R3 materialization", async ({ page }) => {
  let conversationId: string | null = null;
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir Agente IA" }).click();

    const createResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/agent/conversations" && response.request().method() === "POST",
    );
    await page.getByTestId("agent-attachment-input").setInputFiles({
      name: "debito-real.csv",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("Fecha;Descripción;Débito;Crédito;Referencia\n11/07/2026;TEST REAL;10;;A-REAL"),
    });
    conversationId = ((await (await createResponse).json()) as { id: string }).id;
    const chip = page.getByTestId("agent-attachment-chip").filter({ hasText: "debito-real.csv" });
    await expect(chip).toHaveAttribute("data-status", "staged");

    await page.getByRole("textbox", { name: "Mensaje para Agente IA" }).fill("Importá este débito CSV adjunto");
    await page.getByRole("button", { name: "Enviar mensaje" }).click();

    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "debit_import.preview_attachment" }))
      .toHaveAttribute("data-status", "succeeded");
    await expect(page.getByText("Preview real de débito listo para revisar.", { exact: true })).toBeVisible();
    await expect(page.getByTestId("agent-approval-card")).toHaveCount(0);

    const conversationResponse = await page.request.get(`${API_BASE_URL}/api/agent/conversations/${conversationId}`);
    expect(conversationResponse.ok()).toBeTruthy();
    const conversation = await conversationResponse.json() as {
      messages: Array<{ role: string; content: { toolCall?: { name?: string; status?: string; result?: { id?: string; status?: string } } } }>;
    };
    const toolCall = conversation.messages.find((message) =>
      message.role === "tool" && message.content.toolCall?.name === "debit_import.preview_attachment",
    )?.content.toolCall;
    expect(toolCall?.status).toBe("succeeded");
    expect(toolCall?.result?.status).toBe("draft");
    expect(toolCall?.result?.id).toMatch(/^[0-9a-f-]{36}$/i);
    const attachmentsResponse = await page.request.get(`${API_BASE_URL}/api/agent/conversations/${conversationId}/attachments`);
    expect(attachmentsResponse.ok()).toBeTruthy();
    const attachmentPayload = await attachmentsResponse.json() as { items: Array<{ status: string }> };
    expect(attachmentPayload.items).toHaveLength(1);
    expect(attachmentPayload.items[0].status).toBe("consumed");
    await expect(chip).toHaveCount(0);
    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "debit_import.accept" })).toHaveCount(0);
  } finally {
    if (conversationId) {
      const deleted = await page.request.delete(`${API_BASE_URL}/api/agent/conversations/${conversationId}`);
      expect(deleted.status()).toBe(204);
    }
  }
});