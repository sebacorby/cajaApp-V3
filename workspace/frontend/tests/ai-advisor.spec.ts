import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";

const PROVIDER_PORT = Number(process.env.CAJAAPP_AGENT_FAKE_PROVIDER_PORT ?? 11501);
let providerServer: Server;

type AdvisorProviderPayload = {
  allowedSourceIds?: string[];
  outputContract?: { schemaVersion?: string };
};

test.beforeAll(async () => {
  providerServer = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => {
      try {
        const body = JSON.parse(raw || "{}") as { messages?: Array<{ role?: string; content?: string }> };
        const userMessage = [...(body.messages ?? [])].reverse().find((message) => message.role === "user");
        const payload = JSON.parse(userMessage?.content ?? "{}") as AdvisorProviderPayload;
        const sourceId = payload.allowedSourceIds?.[0];
        if (!sourceId) {
          response.writeHead(422, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: { message: "Missing allowed source for deterministic advisor test." } }));
          return;
        }
        const output = {
          schemaVersion: payload.outputContract?.schemaVersion ?? "advisor-response-v1.0.0",
          title: "Lectura determinística del período",
          answer: "La evidencia disponible permite describir el período usando fuentes vigentes de CajaApp.",
          confidence: "medium",
          claims: [{ id: "claim-e2e", text: "La lectura se apoya en una fuente vigente de CajaApp.", kind: "fact", sourceIds: [sourceId] }],
          risks: [], alternatives: [], limitations: [], followUpQuestions: [],
        };
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({
          id: "advisor-e2e", model: "fake-agent",
          choices: [{ finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(output) } }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }));
      } catch {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { message: "Invalid deterministic advisor request." } }));
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    providerServer.once("error", reject);
    providerServer.listen(PROVIDER_PORT, "127.0.0.1", () => {
      providerServer.off("error", reject);
      resolve();
    });
  });
});

test.afterAll(async () => new Promise<void>((resolve) => providerServer.close(() => resolve())));


const API_BASE_URL = process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";


function currentRange(): { from: string; to: string; today: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Tucuman", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from, to: `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`, today: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}


test("Asesor IA mantiene fingerprint, claims y citas consistentes", async ({ request }) => {
  test.setTimeout(240_000);
  const range = currentRange();
  const suffix = Date.now();
  const movementIds: string[] = [];
  const interactionIds: string[] = [];

  try {
    for (const payload of [
      { type: "income", description: `Ingreso asesor UAT ${suffix}`, amount: "100000,00" },
      { type: "expense", description: `Egreso asesor UAT ${suffix}`, amount: "25000,00" },
    ]) {
      const response = await request.post(`${API_BASE_URL}/api/movements/manual`, { data: { occurredOn: range.today, sourceType: "manual_cash", categoryId: null, currency: "ARS", status: "actual", notes: "UAT APP-AI-ADVISOR-001", ...payload } });
      expect(response.ok()).toBeTruthy();
      const created = await response.json() as { sourceId: string };
      movementIds.push(created.sourceId);
    }

    const contextResponse = await request.get(`${API_BASE_URL}/api/ai-advisor/context?from=${range.from}&to=${range.to}`);
    expect(contextResponse.ok()).toBeTruthy();
    const context = await contextResponse.json() as { context: { sourceCount: number; sourceFingerprint: string }; provider: { configured: boolean } };
    expect(context.context.sourceCount).toBeGreaterThan(0);
    expect(context.context.sourceFingerprint).toHaveLength(64);
    expect(context.provider.configured).toBeTruthy();

    const askResponse = await request.post(`${API_BASE_URL}/api/ai-advisor/ask`, { data: { from: range.from, to: range.to, mode: "analysis", currency: "ARS", question: "Explicá el balance realizado y esperado usando sólo fuentes de CajaApp." } });
    expect(askResponse.ok()).toBeTruthy();
    const interaction = await askResponse.json() as { id: string; answer: { claims: Array<{ sourceIds: string[] }>; citations: Array<{ id: string }> }; context: { fingerprint: string }; provider: { requestId: string } };
    interactionIds.push(interaction.id);
    expect(interaction.context.fingerprint).toBe(context.context.sourceFingerprint);
    expect(interaction.provider.requestId).toBeTruthy();
    expect(interaction.answer.claims.length).toBeGreaterThan(0);
    const citationIds = new Set(interaction.answer.citations.map((item) => item.id));
    for (const claim of interaction.answer.claims) for (const sourceId of claim.sourceIds) expect(citationIds.has(sourceId)).toBeTruthy();
  } finally {
    for (const id of [...new Set(interactionIds)]) await request.delete(`${API_BASE_URL}/api/ai-advisor/history/${id}`);
    for (const id of movementIds) await request.delete(`${API_BASE_URL}/api/movements/manual/${id}`);
  }
});


test("Asesor IA responde en UI desktop y conserva acceso mobile", async ({ page, request }) => {
  test.setTimeout(240_000);
  const range = currentRange();
  const suffix = Date.now();
  const movementIds: string[] = [];
  const interactionIds: string[] = [];

  try {
    for (const payload of [
      { type: "income", description: `Ingreso asesor UAT ${suffix}`, amount: "100000,00" },
      { type: "expense", description: `Egreso asesor UAT ${suffix}`, amount: "25000,00" },
    ]) {
      const response = await request.post(`${API_BASE_URL}/api/movements/manual`, { data: { occurredOn: range.today, sourceType: "manual_cash", categoryId: null, currency: "ARS", status: "actual", notes: "UAT APP-AI-ADVISOR-001", ...payload } });
      expect(response.ok()).toBeTruthy();
      const created = await response.json() as { sourceId: string };
      movementIds.push(created.sourceId);
    }

    await page.goto("/");
    await page.getByRole("button", { name: "Asesor IA", exact: true }).click();
    await expect(page.getByTestId("ai-advisor-section")).toBeVisible();
    await expect(page.getByTestId("ai-advisor-context-summary")).toBeVisible();
    await page.getByTestId("ai-advisor-question").fill("Explicá los factores financieros del período con evidencia.");
    await page.getByTestId("ai-advisor-submit").click();
    const uiResponse = page.getByTestId("ai-advisor-response");
    await expect(uiResponse).toBeVisible({ timeout: 180_000 });
    const uiInteractionId = await uiResponse.getAttribute("data-interaction-id");
    if (uiInteractionId) interactionIds.push(uiInteractionId);
    await expect(page.getByTestId("ai-advisor-claim").first()).toBeVisible();
    await expect(page.getByTestId("ai-advisor-citation").first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Asesor IA", exact: true }).click();
    await expect(page.getByTestId("ai-advisor-section")).toBeVisible();
  } finally {
    for (const id of [...new Set(interactionIds)]) await request.delete(`${API_BASE_URL}/api/ai-advisor/history/${id}`);
    for (const id of movementIds) await request.delete(`${API_BASE_URL}/api/movements/manual/${id}`);
  }
});
