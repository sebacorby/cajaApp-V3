import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";

const API_BASE_URL = process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";
const PROVIDER_PORT = Number(process.env.CAJAAPP_AGENT_FAKE_PROVIDER_PORT ?? 11501);

function currentRanges() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Tucuman", year: "numeric", month: "2-digit" })
    .formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { monthKey, from: `${monthKey}-01`, to: `${monthKey}-${String(lastDay).padStart(2, "0")}` };
}

function openAiSse(response: import("node:http").ServerResponse, chunks: unknown[]) {
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
      const body = JSON.parse(raw || "{}") as { messages?: Array<{ role?: string; content?: string }> };
      const messages = body.messages ?? [];
      const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
      const prompt = messages[latestUserIndex]?.content?.toLowerCase() ?? "";
      const hasToolResult = messages.slice(latestUserIndex + 1).some((message) => message.role === "tool");
      if (hasToolResult) {
        openAiSse(response, [{ id: "fake-final", choices: [{ delta: { content: "Respuesta basada en datos reales de CajaApp." }, finish_reason: "stop" }] }]);
        return;
      }
      const range = currentRanges();
      const calls = prompt.includes("presupuesto")
        ? [
            ["call-budget", "budgets.get_overview", { from: range.monthKey, to: range.monthKey }],
            ["call-movements", "movements.list", { from: range.from, to: range.to }],
          ]
        : prompt.includes("llevame")
          ? [["call-nav", "ui.navigate", { section: "tarjetas" }]]
          : prompt.includes("invalida")
            ? [["call-invalid", "tool.que_no_existe", {}]]
            : [["call-dashboard", "dashboard.get_overview", { from: range.from, to: range.to }]];
      openAiSse(response, [{ id: "fake-tools", choices: [{ delta: { tool_calls: calls.map(([id, name, args], index) => ({ index, id, function: { name, arguments: JSON.stringify(args) } })) }, finish_reason: "tool_calls" }] }]);
    });
  });
  await new Promise<void>((resolve) => providerServer.listen(PROVIDER_PORT, "127.0.0.1", resolve));
});

test.afterAll(async () => new Promise<void>((resolve) => providerServer.close(() => resolve())));

test("Agente IA: launcher global, minimizar/reabrir y mobile", async ({ page }) => {
  await page.route("**/api/agent/conversations**", async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        id: "11111111-1111-4111-8111-111111111111", title: "Nuevo chat", status: "active",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), archivedAt: null,
      }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], nextCursor: null }) });
  });

  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Abrir Agente IA" });
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute("data-testid", "agent-launcher");
  await launcher.click();
  await expect(page.getByTestId("agent-chat-panel")).toBeVisible();
  await expect(page.getByText("¿Qué querés hacer?")).toBeVisible();

  await page.getByRole("button", { name: "Minimizar Agente IA" }).click();
  await expect(page.getByTestId("agent-chat-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir Agente IA" }).click();
  await expect(page.getByTestId("agent-chat-panel")).toBeVisible();

  await page.getByRole("button", { name: /^Movimientos$/ }).click();
  await expect(page.getByTestId("agent-chat-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar Agente IA" })).toBeVisible();

  await page.getByRole("button", { name: "Cerrar Agente IA" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir Agente IA" }).click();
  const mobilePanel = page.getByTestId("agent-chat-panel");
  await expect(mobilePanel).toBeVisible();
  await expect(mobilePanel).toHaveAttribute("data-mobile", "true");
  await expect(page.getByRole("textbox", { name: "Mensaje para Agente IA" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar Agente IA" }).click();
  await expect(page.getByRole("button", { name: "Abrir Agente IA" })).toBeVisible();
});


test("Agente IA: read tools reales, multi-tool, navegación y tool inválida", async ({ page }) => {
  let conversationId: string | null = null;
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir Agente IA" }).click();
    const composer = page.getByRole("textbox", { name: "Mensaje para Agente IA" });
    const sendButton = page.getByRole("button", { name: "Enviar mensaje" });
    const finalMessages = page.getByText("Respuesta basada en datos reales de CajaApp.", { exact: true });

    const createResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/agent/conversations" && response.request().method() === "POST";
    });
    await composer.fill("Mostrame el dashboard con datos reales");
    await sendButton.click();
    const created = await (await createResponse).json() as { id: string };
    conversationId = created.id;
    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "dashboard.get_overview" }))
      .toHaveAttribute("data-status", "succeeded");
    await expect(finalMessages).toHaveCount(1);

    await composer.fill("Compará mi presupuesto con los movimientos del mes");
    await sendButton.click();
    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "budgets.get_overview" }))
      .toHaveAttribute("data-status", "succeeded");
    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "movements.list" }))
      .toHaveAttribute("data-status", "succeeded");
    await expect(finalMessages).toHaveCount(2);

    await composer.fill("Llevame a Tarjetas");
    await sendButton.click();
    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "ui.navigate" }))
      .toHaveAttribute("data-status", "succeeded");
    await expect(page.getByRole("button", { name: /^Tarjetas$/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("agent-chat-panel")).toBeVisible();
    await expect(finalMessages).toHaveCount(3);

    await composer.fill("Probá una tool invalida para validar el rechazo");
    await sendButton.click();
    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "tool.que_no_existe" }))
      .toHaveAttribute("data-status", "failed");
    await expect(finalMessages).toHaveCount(4);
    await expect(page.getByTestId("agent-activity-panel")).toContainText("5 tools");
  } finally {
    if (conversationId) {
      const deleted = await page.request.delete(`${API_BASE_URL}/api/agent/conversations/${conversationId}`);
      expect(deleted.status()).toBe(204);
    }
  }
});
