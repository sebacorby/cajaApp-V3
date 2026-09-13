import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";

const API_BASE_URL = process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";
const PROVIDER_PORT = Number(process.env.CAJAAPP_AGENT_FAKE_PROVIDER_PORT ?? 11501);

function currentRanges() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Tucuman", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    monthKey,
    today: `${monthKey}-${String(day).padStart(2, "0")}`,
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

function openAiSse(response: import("node:http").ServerResponse, chunks: unknown[]) {
  response.writeHead(200, { "content-type": "text/event-stream" });
  for (const chunk of chunks) response.write(`data: ${JSON.stringify(chunk)}\n\n`);
  response.end("data: [DONE]\n\n");
}

let providerServer: Server;
let r2MovementDescription = "Farmacia E2E Agente";
let criticalMovementId = "00000000-0000-4000-8000-000000000000";
test.beforeAll(async () => {
  providerServer = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => {
      const body = JSON.parse(raw || "{}") as { messages?: Array<{ role?: string; content?: string; name?: string }> };
      const messages = body.messages ?? [];
      const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
      const prompt = messages[latestUserIndex]?.content?.toLowerCase() ?? "";
      const toolMessages = messages.slice(latestUserIndex + 1).filter((message) => message.role === "tool");
      const hasToolResult = toolMessages.length > 0;
      const range = currentRanges();

      if (prompt.includes("registrá un gasto") && hasToolResult) {
        openAiSse(response, [{ id: "fake-r2-final", choices: [{ delta: { content: "Movimiento registrado una sola vez." }, finish_reason: "stop" }] }]);
        return;
      }
      if (prompt.includes("cambiá ese movimiento") && hasToolResult) {
        openAiSse(response, [{ id: "fake-ambiguous-final", choices: [{ delta: { content: "Necesito que elijas un movimiento antes de modificarlo." }, finish_reason: "stop" }] }]);
        return;
      }
      if (hasToolResult) {
        const rejected = toolMessages.some((message) => (message.content ?? "").includes("APPROVAL_REJECTED"));
        if (rejected) {
          openAiSse(response, [{ id: "fake-rejected-final", choices: [{ delta: { content: "Entendido, no realicé la acción crítica." }, finish_reason: "stop" }] }]);
          return;
        }
        openAiSse(response, [{ id: "fake-final", choices: [{ delta: { content: "Respuesta basada en datos reales de CajaApp." }, finish_reason: "stop" }] }]);
        return;
      }

      const budgetId = process.env.CAJAAPP_AGENT_E2E_BUDGET_ID ?? "00000000-0000-4000-8000-000000000000";
      const restoreBackupId = process.env.CAJAAPP_AGENT_E2E_BACKUP_ID ?? "00000000-0000-4000-8000-000000000000";
      const calls = prompt.includes("aprobación crítica anula el movimiento")
        ? [["call-r3-void", "movements.void_manual", { movementId: criticalMovementId }]]
        : prompt.includes("aprobación crítica inicia el cierre")
          ? [["call-r3-close", "month_close.create", { monthKey: range.monthKey }]]
        : prompt.includes("aprobación crítica restaura el backup")
          ? [["call-r4-restore", "backup.restore", { backupId: restoreBackupId }]]
          : prompt.includes("presupuesto crítico elimina el presupuesto")
            ? [["call-r3-budget", "budgets.delete", { budgetId }]]
            : prompt.includes("registrá un gasto")
        ? [["call-r2-movement", "movements.create_manual", {
            occurredOn: range.today, type: "expense", sourceType: "manual_cash", description: r2MovementDescription,
            categoryId: null, currency: "ARS", amount: "18500", status: "actual", notes: "agent-e2e-r2",
          }]]
        : prompt.includes("cambiá ese movimiento")
          ? [["call-ambiguous-search", "movements.list", { from: range.from, to: range.to, page: 1, pageSize: 25, q: r2MovementDescription }]]
          : prompt.includes("presupuesto")
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

test("Agente IA: R2 explícita ejecuta una vez y ambigüedad no muta", async ({ page }) => {
  let conversationId: string | null = null;
  try {
    r2MovementDescription = `Farmacia E2E Agente ${Date.now()}`;
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir Agente IA" }).click();
    const composer = page.getByRole("textbox", { name: "Mensaje para Agente IA" });
    const sendButton = page.getByRole("button", { name: "Enviar mensaje" });
    const createResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/agent/conversations" && response.request().method() === "POST";
    });

    await composer.fill("Registrá un gasto de ARS 18500 en farmacia hoy");
    await sendButton.click();
    conversationId = ((await (await createResponse).json()) as { id: string }).id;

    const createCard = page.getByTestId("agent-tool-card").filter({ hasText: "movements.create_manual" });
    await expect(createCard).toHaveAttribute("data-status", "succeeded");
    await expect(createCard).toContainText("R2");
    await expect(page.getByText("Movimiento registrado una sola vez.", { exact: true })).toBeVisible();

    const range = currentRanges();
    const movements = await page.request.get(`${API_BASE_URL}/api/movements?from=${range.today}&to=${range.today}&page=1&pageSize=100&q=${encodeURIComponent(r2MovementDescription)}`);
    expect(movements.ok()).toBeTruthy();
    const payload = await movements.json() as { items: Array<{ description?: string }> };
    expect(payload.items.filter((item) => item.description === r2MovementDescription)).toHaveLength(1);

    await composer.fill("Cambiá ese movimiento");
    await sendButton.click();
    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "movements.list" })).toHaveAttribute("data-status", "succeeded");
    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "movements.update_manual" })).toHaveCount(0);
    await expect(page.getByText("Necesito que elijas un movimiento antes de modificarlo.", { exact: true })).toBeVisible();
  } finally {
    if (conversationId) {
      const deleted = await page.request.delete(`${API_BASE_URL}/api/agent/conversations/${conversationId}`);
      expect(deleted.status()).toBe(204);
    }
  }
});


test("Agente IA: Approval Card R3 confirma una vez y cancelar no muta", async ({ page }) => {
  let conversationId: string | null = null;
  const range = currentRanges();
  const runSuffix = Date.now();
  const approvedDescription = `R3 aprobar E2E ${runSuffix}`;
  const rejectedDescription = `R3 rechazar E2E ${runSuffix}`;
  const createMovement = async (description: string) => {
    const response = await page.request.post(`${API_BASE_URL}/api/movements/manual`, { data: {
      occurredOn: range.today, type: "expense", sourceType: "manual_cash", description,
      categoryId: null, currency: "ARS", amount: "12345", status: "actual", notes: "agent-e2e-r3",
    } });
    expect(response.status()).toBe(201);
    return await response.json() as { sourceId: string };
  };
  const movementStatus = async (description: string) => {
    const response = await page.request.get(`${API_BASE_URL}/api/movements?from=${range.today}&to=${range.today}&page=1&pageSize=100&q=${encodeURIComponent(description)}`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json() as { items: Array<{ description: string; status: string }> };
    return payload.items.find((item) => item.description === description)?.status;
  };

  try {
    const approvedMovement = await createMovement(approvedDescription);
    criticalMovementId = approvedMovement.sourceId;
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir Agente IA" }).click();
    const composer = page.getByRole("textbox", { name: "Mensaje para Agente IA" });
    const sendButton = page.getByRole("button", { name: "Enviar mensaje" });
    const createResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/agent/conversations" && response.request().method() === "POST");
    await composer.fill("Aprobación crítica anula el movimiento");
    await sendButton.click();
    conversationId = ((await (await createResponse).json()) as { id: string }).id;

    const approvalCard = page.getByTestId("agent-approval-card");
    await expect(approvalCard).toBeVisible();
    await expect(approvalCard).toHaveAttribute("data-risk-class", "R3");
    expect(await movementStatus(approvedDescription)).toBe("actual");
    await page.getByTestId("agent-approval-approve").click();
    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "movements.void_manual" })).toHaveAttribute("data-status", "succeeded");
    expect(await movementStatus(approvedDescription)).toBeUndefined();

    const rejectedMovement = await createMovement(rejectedDescription);
    criticalMovementId = rejectedMovement.sourceId;
    await composer.fill("Aprobación crítica anula el movimiento");
    await sendButton.click();
    await expect(approvalCard).toBeVisible();
    expect(await movementStatus(rejectedDescription)).toBe("actual");
    await page.getByTestId("agent-approval-reject").click();
    await expect(page.getByText("Entendido, no realicé la acción crítica.", { exact: true })).toBeVisible();
    await expect(page.getByTestId("agent-tool-card").filter({ hasText: "movements.void_manual" }).last()).toHaveAttribute("data-status", "rejected");
    expect(await movementStatus(rejectedDescription)).toBe("actual");
  } finally {
    if (conversationId) {
      const deleted = await page.request.delete(`${API_BASE_URL}/api/agent/conversations/${conversationId}`);
      expect(deleted.status()).toBe(204);
    }
    criticalMovementId = "00000000-0000-4000-8000-000000000000";
  }
});
