import { expect, test } from "@playwright/test";


const API_BASE_URL = process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";


type TestRange = { from: string; to: string; today: string };


function currentRange(): TestRange {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Tucuman", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from, to: `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`, today: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}


function uiAdvisorFixture(range: TestRange, suffix: number) {
  const sourceId = `source-${suffix}`;
  return {
    id: `ui-fixture-${suffix}`,
    period: { from: range.from, to: range.to },
    mode: "analysis",
    question: "Explicá los factores financieros del período con evidencia.",
    currency: "ARS",
    scenario: null,
    context: {
      version: "ai-advisor-context.v1",
      fingerprint: "0".repeat(64),
      sourceCount: 2,
      financialHealthFormulaVersion: "fh-v1.0.0",
    },
    provider: {
      name: "playwright-fixture",
      model: "deterministic",
      requestId: `request-${suffix}`,
      durationMs: 1,
    },
    prompt: {
      version: "playwright-fixture-v1",
      sha256: "1".repeat(64),
    },
    answer: {
      schemaVersion: "ai-advisor-answer.v1",
      title: "Análisis financiero del período",
      answer: "El balance realizado del período surge de los movimientos registrados en CajaApp.",
      confidence: "high",
      claims: [{
        id: "claim-1",
        text: "El período contiene movimientos reales registrados.",
        kind: "fact",
        sourceIds: [sourceId],
      }],
      risks: [],
      alternatives: [],
      limitations: [],
      followUpQuestions: [],
      citations: [{
        id: sourceId,
        kind: "movements",
        label: "Movimientos del período",
        description: "Fuente determinística para validar la UI.",
        period: { from: range.from, to: range.to },
        currency: "ARS",
        value: "Movimientos reales del período",
        rule: null,
        action: { section: "movimientos", label: "Ver movimientos" },
      }],
    },
    createdAt: new Date().toISOString(),
    disclaimer: "Respuesta de prueba respaldada por una fuente controlada.",
  };
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


test("Asesor IA maneja respuestas inválidas, responde en UI y conserva acceso mobile", async ({ page, request }) => {
  test.setTimeout(240_000);
  const range = currentRange();
  const suffix = Date.now();
  const movementIds: string[] = [];
  let advisorAttempts = 0;

  await page.route("**/api/ai-advisor/ask", async (route) => {
    advisorAttempts += 1;
    if (advisorAttempts === 1) {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          code: "AI_RESPONSE_VALIDATION_FAILED",
          message: "La respuesta del proveedor no superó la validación de evidencia.",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(uiAdvisorFixture(range, suffix)),
    });
  });

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
    await expect(page.getByTestId("ai-advisor-context-summary")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("ai-advisor-question").fill("Explicá los factores financieros del período con evidencia.");
    await page.getByTestId("ai-advisor-submit").click();

    await expect(page.getByTestId("ai-advisor-error")).toBeVisible();
    await expect(page.getByTestId("ai-advisor-response")).toHaveCount(0);
    await page.getByTestId("ai-advisor-retry").click();

    const uiResponse = page.getByTestId("ai-advisor-response");
    await expect(uiResponse).toBeVisible();
    await expect(page.getByTestId("ai-advisor-error")).toHaveCount(0);
    await expect(page.getByTestId("ai-advisor-claim").first()).toBeVisible();
    await expect(page.getByTestId("ai-advisor-citation").first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    const mobileNav = page.getByTestId("finance-mobile-navigation");
    await expect(mobileNav).toBeVisible();
    await mobileNav.getByTestId("sidebar-nav-item-ai-advisor").click();
    await expect(mobileNav).not.toBeVisible();
    await expect(page.getByTestId("ai-advisor-section")).toBeVisible();
  } finally {
    for (const id of movementIds) await request.delete(`${API_BASE_URL}/api/movements/manual/${id}`);
  }
});
