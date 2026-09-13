import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";

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
    await page.waitForLoadState("networkidle");
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

type Us5Attachment = {
  id: string;
  conversationId: string;
  messageId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: "staged" | "consumed";
  createdAt: string;
};

type Us5MockOptions = { failFirstImport?: boolean };

async function installUs5MockApi(page: Page, options: Us5MockOptions = {}) {
  const conversationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const attachments: Us5Attachment[] = [];
  const postedMessages: Array<{ content: string; attachmentIds: string[] }> = [];
  let messages: Array<Record<string, unknown>> = [];
  let uploadRequests = 0;
  let approveRequests = 0;
  let importAttempts = 0;

  const conversation = () => ({
    id: conversationId,
    title: "Nuevo chat",
    status: "active",
    lastProvider: "fake",
    lastModel: "fake-model",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null,
    messages,
  });

  const eventStream = (runId: string, events: Array<{ type: string; payload: Record<string, unknown> }>) => {
    const now = new Date().toISOString();
    return events.map((event, index) => {
      const sequence = index + 1;
      return `id: ${sequence}\nevent: ${event.type}\ndata: ${JSON.stringify({ runId, sequence, timestamp: now, type: event.type, payload: event.payload })}\n\n`;
    }).join("");
  };

  const toolMessage = (
    id: string,
    name: string,
    status: string,
    attachmentId?: string,
    result?: Record<string, unknown>,
  ) => ({
    id,
    sequence: messages.length + 1,
    role: "tool",
    content: {
      text: result ? JSON.stringify(result) : "",
      toolCall: {
        id,
        providerCallId: `${id}-provider`,
        name,
        riskClass: name.includes("accept") ? "R3" : "R2",
        status,
        arguments: attachmentId ? { attachmentId } : { draftId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
        result,
      },
    },
    createdAt: new Date().toISOString(),
  });

  await page.route("**/api/agent/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "POST" && url.pathname === "/api/agent/conversations") {
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(conversation()) });
    }
    if (method === "GET" && url.pathname === "/api/agent/conversations") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], nextCursor: null }) });
    }
    if (method === "GET" && url.pathname === `/api/agent/conversations/${conversationId}`) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(conversation()) });
    }
    if (method === "GET" && url.pathname === `/api/agent/conversations/${conversationId}/attachments`) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: attachments }) });
    }
    if (method === "POST" && url.pathname === `/api/agent/conversations/${conversationId}/attachments`) {
      uploadRequests += 1;
      const raw = route.request().postDataBuffer()?.toString("utf8") ?? "";
      const match = raw.match(/filename="([^"]+)"/i);
      const fileName = match?.[1] ?? `attachment-${uploadRequests}.csv`;
      const lower = fileName.toLowerCase();
      const attachment: Us5Attachment = {
        id: `00000000-0000-4000-8000-${String(uploadRequests).padStart(12, "0")}`,
        conversationId,
        messageId: null,
        fileName,
        mimeType: lower.endsWith(".pdf") ? "application/pdf" : "text/csv",
        sizeBytes: Math.max(1, route.request().postDataBuffer()?.length ?? 1),
        sha256: String(uploadRequests).repeat(64).slice(0, 64),
        status: "staged",
        createdAt: new Date().toISOString(),
      };
      attachments.push(attachment);
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(attachment) });
    }
    if (method === "DELETE" && url.pathname.startsWith(`/api/agent/conversations/${conversationId}/attachments/`)) {
      const attachmentId = url.pathname.split("/").at(-1);
      const index = attachments.findIndex((item) => item.id === attachmentId);
      if (index >= 0) attachments.splice(index, 1);
      return route.fulfill({ status: 204, body: "" });
    }
    if (method === "POST" && url.pathname === `/api/agent/conversations/${conversationId}/messages`) {
      const body = route.request().postDataJSON() as { content?: string; attachmentIds?: string[] };
      const normalized = { content: body.content ?? "", attachmentIds: body.attachmentIds ?? [] };
      postedMessages.push(normalized);
      messages.push({
        id: `user-${postedMessages.length}`,
        sequence: messages.length + 1,
        role: "user",
        content: { text: normalized.content, attachmentIds: normalized.attachmentIds },
        createdAt: new Date().toISOString(),
      });
      const lower = normalized.content.toLowerCase();
      const runId = !normalized.content.trim()
        ? "run-us5-intent"
        : lower.includes("acept")
          ? "run-us5-accept"
          : lower.includes("reintent")
            ? "run-us5-retry"
            : lower.includes("todos")
              ? "run-us5-multi"
              : options.failFirstImport && importAttempts === 0
                ? "run-us5-fail"
                : "run-us5-import";
      importAttempts += runId.includes("import") || runId.includes("fail") ? 1 : 0;
      return route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ runId, status: "running" }) });
    }
    if (method === "POST" && url.pathname.includes("/api/agent/tool-calls/") && url.pathname.endsWith("/approve")) {
      approveRequests += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "approved" }) });
    }
    if (method === "POST" && url.pathname.includes("/api/agent/tool-calls/") && url.pathname.endsWith("/reject")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "rejected" }) });
    }
    if (method === "GET" && url.pathname.startsWith("/api/agent/runs/") && url.pathname.endsWith("/events")) {
      const runId = url.pathname.split("/")[4];
      const staged = attachments.filter((item) => item.status === "staged");
      const events: Array<{ type: string; payload: Record<string, unknown> }> = [];

      if (runId === "run-us5-intent") {
        const text = "¿Qué querés hacer con el archivo adjunto?";
        messages.push({
          id: "assistant-intent", sequence: messages.length + 1, role: "assistant",
          content: { text }, createdAt: new Date().toISOString(),
        });
        events.push({ type: "assistant.delta", payload: { text } });
        events.push({ type: "assistant.completed", payload: { text } });
        events.push({ type: "run.completed", payload: {} });
      } else if (runId === "run-us5-fail") {
        const attachment = staged[0];
        messages.push(toolMessage("tool-fail", "debit_import.preview_attachment", "failed", attachment?.id));
        const text = "La importación falló antes de crear un preview. Podés reintentar con el mismo archivo.";
        messages.push({ id: "assistant-fail", sequence: messages.length + 1, role: "assistant", content: { text }, createdAt: new Date().toISOString() });
        events.push({ type: "tool.failed", payload: { toolCallId: "tool-fail", name: "debit_import.preview_attachment", code: "IMPORT_FAILED" } });
        events.push({ type: "assistant.delta", payload: { text } });
        events.push({ type: "run.completed", payload: {} });
      } else if (runId === "run-us5-retry") {
        const attachment = staged[0];
        if (attachment) attachment.status = "consumed";
        const result = { importId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "preview_ready" };
        messages.push(toolMessage("tool-retry", "debit_import.preview_attachment", "succeeded", attachment?.id, result));
        const text = "Preview de débito listo para revisar.";
        messages.push({ id: "assistant-retry", sequence: messages.length + 1, role: "assistant", content: { text }, createdAt: new Date().toISOString() });
        events.push({ type: "tool.completed", payload: { toolCallId: "tool-retry", name: "debit_import.preview_attachment", result } });
        events.push({ type: "assistant.delta", payload: { text } });
        events.push({ type: "run.completed", payload: {} });
      } else if (runId === "run-us5-multi") {
        for (const [index, attachment] of staged.entries()) {
          attachment.status = "consumed";
          const isPdf = attachment.fileName.toLowerCase().endsWith(".pdf");
          const name = isPdf ? "card_import.upload_attachment" : "debit_import.preview_attachment";
          const result = isPdf
            ? { draftId: `card-draft-${index}`, status: "preview_ready" }
            : { importId: `debit-import-${index}`, status: "preview_ready" };
          messages.push(toolMessage(`tool-multi-${index}`, name, "succeeded", attachment.id, result));
          events.push({ type: "tool.completed", payload: { toolCallId: `tool-multi-${index}`, name, result } });
        }
        const text = "Los dos documentos quedaron listos como workflows independientes.";
        messages.push({ id: "assistant-multi", sequence: messages.length + 1, role: "assistant", content: { text }, createdAt: new Date().toISOString() });
        events.push({ type: "assistant.delta", payload: { text } });
        events.push({ type: "run.completed", payload: {} });
      } else if (runId === "run-us5-import") {
        const attachment = staged[0];
        if (attachment) attachment.status = "consumed";
        const isPdf = attachment?.fileName.toLowerCase().endsWith(".pdf") ?? true;
        const name = isPdf ? "card_import.upload_attachment" : "debit_import.preview_attachment";
        const result = isPdf
          ? { draftId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", status: "preview_ready" }
          : { importId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "preview_ready" };
        messages.push(toolMessage("tool-import", name, "succeeded", attachment?.id, result));
        const text = "Draft listo para revisar.";
        messages.push({ id: "assistant-import", sequence: messages.length + 1, role: "assistant", content: { text }, createdAt: new Date().toISOString() });
        events.push({ type: "tool.completed", payload: { toolCallId: "tool-import", name, result } });
        events.push({ type: "assistant.delta", payload: { text } });
        events.push({ type: "run.completed", payload: {} });
      } else if (runId === "run-us5-accept") {
        messages.push(toolMessage("tool-accept", "card_import.accept_draft", "awaiting_approval"));
        events.push({ type: "approval.required", payload: {
          toolCallId: "tool-accept",
          name: "card_import.accept_draft",
          riskClass: "R3",
          arguments: { draftId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
          impact: { draftId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", warning: "Materializa movimientos definitivos." },
        } });
      }

      return route.fulfill({ status: 200, contentType: "text/event-stream", body: eventStream(runId, events) });
    }

    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "NOT_FOUND" }) });
  });

  return {
    conversationId,
    attachments,
    postedMessages,
    get uploadRequests() { return uploadRequests; },
    get approveRequests() { return approveRequests; },
  };
}

async function openUs5Agent(page: Page, options: Us5MockOptions = {}) {
  const state = await installUs5MockApi(page, options);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Abrir Agente IA" }).click();
  await expect(page.getByTestId("agent-chat-panel")).toBeVisible();
  return state;
}

test("FEAT-024 — Attach a supported document and request import", async ({ page }) => {
  const state = await openUs5Agent(page);
  const input = page.getByTestId("agent-attachment-input");
  await expect(page.getByRole("button", { name: "Adjuntar archivo" })).toBeEnabled();
  await input.setInputFiles({
    name: "resumen.pdf", mimeType: "application/octet-stream", buffer: Buffer.from("%PDF-us5"),
  });
  await expect(page.getByTestId("agent-attachment-chip").filter({ hasText: "resumen.pdf" }))
    .toHaveAttribute("data-status", "staged");

  await page.getByRole("textbox", { name: "Mensaje para Agente IA" }).fill("Importá este resumen adjunto");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect.poll(() => state.postedMessages.at(-1)?.attachmentIds ?? []).toHaveLength(1);
  await expect(page.getByTestId("agent-tool-card").filter({ hasText: "card_import.upload_attachment" }))
    .toHaveAttribute("data-status", "succeeded");
  await expect(page.getByText("Draft listo para revisar.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("agent-approval-card")).toHaveCount(0);
});


test("FEAT-024 — Do not import an attachment without user intent", async ({ page }) => {
  const state = await openUs5Agent(page);
  const input = page.getByTestId("agent-attachment-input");
  await input.setInputFiles({ name: "resumen.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-us5") });
  await expect(page.getByTestId("agent-attachment-chip")).toHaveAttribute("data-status", "staged");

  const send = page.getByRole("button", { name: "Enviar mensaje" });
  await expect(send).toBeEnabled();
  await send.click();

  await expect.poll(() => state.postedMessages.at(-1)?.content).toBe("");
  await expect.poll(() => state.postedMessages.at(-1)?.attachmentIds ?? []).toHaveLength(1);
  await expect(page.getByTestId("agent-tool-card")).toHaveCount(0);
  await expect(page.getByText("¿Qué querés hacer con el archivo adjunto?", { exact: true })).toBeVisible();
});

test("FEAT-024 — Process multiple requested attachments", async ({ page }) => {
  const state = await openUs5Agent(page);
  const input = page.getByTestId("agent-attachment-input");
  await input.setInputFiles([
    { name: "resumen.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-us5") },
    { name: "debito.csv", mimeType: "text/csv", buffer: Buffer.from("Fecha;Descripción;Débito;Crédito;Referencia\n11/07/2026;TEST;10;;A-1") },
  ]);
  await expect(page.getByTestId("agent-attachment-chip")).toHaveCount(2);
  await page.getByRole("textbox", { name: "Mensaje para Agente IA" }).fill("Importá todos los adjuntos");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect.poll(() => state.postedMessages.at(-1)?.attachmentIds ?? []).toHaveLength(2);
  await expect(page.getByTestId("agent-tool-card").filter({ hasText: "card_import.upload_attachment" }))
    .toHaveAttribute("data-status", "succeeded");
  await expect(page.getByTestId("agent-tool-card").filter({ hasText: "debit_import.preview_attachment" }))
    .toHaveAttribute("data-status", "succeeded");
  await expect(page.getByTestId("agent-approval-card")).toHaveCount(0);
});


test("FEAT-024 — Reuse a valid attachment after an import failure", async ({ page }) => {
  const state = await openUs5Agent(page, { failFirstImport: true });
  const input = page.getByTestId("agent-attachment-input");
  await input.setInputFiles({
    name: "debito.csv", mimeType: "text/csv",
    buffer: Buffer.from("Fecha;Descripción;Débito;Crédito;Referencia\n11/07/2026;TEST;10;;A-1"),
  });
  const chip = page.getByTestId("agent-attachment-chip").filter({ hasText: "debito.csv" });
  await expect(chip).toHaveAttribute("data-status", "staged");

  const composer = page.getByRole("textbox", { name: "Mensaje para Agente IA" });
  await composer.fill("Importá este archivo");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByTestId("agent-tool-card").filter({ hasText: "debit_import.preview_attachment" }).last())
    .toHaveAttribute("data-status", "failed");
  await expect(chip).toHaveAttribute("data-status", "staged");
  const firstId = state.postedMessages.at(-1)?.attachmentIds[0];

  await composer.fill("Reintentá la importación del mismo archivo");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect.poll(() => state.postedMessages.at(-1)?.attachmentIds[0]).toBe(firstId);
  await expect(page.getByTestId("agent-tool-card").filter({ hasText: "debit_import.preview_attachment" }).last())
    .toHaveAttribute("data-status", "succeeded");
  await expect(page.getByText("Preview de débito listo para revisar.", { exact: true })).toBeVisible();
});


test("FEAT-024 — Reject an unsupported or oversized attachment", async ({ page }) => {
  const state = await openUs5Agent(page);
  const input = page.getByTestId("agent-attachment-input");

  await input.setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: Buffer.from("png") });
  const unsupported = page.getByTestId("agent-attachment-chip").filter({ hasText: "foto.png" });
  await expect(unsupported).toHaveAttribute("data-status", "error");
  await expect(unsupported).toContainText("PDF o CSV");
  expect(state.uploadRequests).toBe(0);
  await page.getByRole("button", { name: "Quitar foto.png" }).click();

  await input.setInputFiles({
    name: "enorme.csv",
    mimeType: "text/csv",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 65),
  });
  const oversized = page.getByTestId("agent-attachment-chip").filter({ hasText: "enorme.csv" });
  await expect(oversized).toHaveAttribute("data-status", "error");
  await expect(oversized).toContainText("10 MiB");
  expect(state.uploadRequests).toBe(0);
});

test("FEAT-024 — Require approval before definitive acceptance", async ({ page }) => {
  const state = await openUs5Agent(page);
  const input = page.getByTestId("agent-attachment-input");
  await input.setInputFiles({ name: "resumen.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-us5") });
  const composer = page.getByRole("textbox", { name: "Mensaje para Agente IA" });

  await composer.fill("Importá este resumen adjunto");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByText("Draft listo para revisar.", { exact: true })).toBeVisible();

  await composer.fill("Aceptá el draft definitivamente");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  const approval = page.getByTestId("agent-approval-card");
  await expect(approval).toBeVisible();
  await expect(approval).toHaveAttribute("data-risk-class", "R3");
  await expect(approval).toContainText("Materializa movimientos definitivos.");
  expect(state.approveRequests).toBe(0);
});
