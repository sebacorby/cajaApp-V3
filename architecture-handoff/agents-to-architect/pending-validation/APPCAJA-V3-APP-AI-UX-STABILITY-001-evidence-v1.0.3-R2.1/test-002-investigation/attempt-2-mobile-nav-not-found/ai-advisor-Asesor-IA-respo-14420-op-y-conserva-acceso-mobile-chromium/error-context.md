# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai-advisor.spec.ts >> Asesor IA responde en UI desktop y conserva acceso mobile
- Location: tests\ai-advisor.spec.ts:60:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('finance-mobile-navigation')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByTestId('finance-mobile-navigation')

```

```yaml
- alert
- banner:
  - button "Abrir menú"
  - combobox "Seleccionar período": Mes actual
  - button "Buscar en CajaApp"
  - button "Centro de alertas, 1 activas": "1"
  - button "Nuevo"
- main:
  - paragraph: Resumen financiero general
  - heading "Resumen financiero" [level=2]
  - paragraph: 01 de jul de 2026 – 31 de jul de 2026 · datos calculados por el backend
  - button "Actualizar"
  - paragraph: Balance realizado
  - paragraph: $ 72.530,88
  - paragraph: $ 0,00
  - paragraph: Sin base comparable
  - paragraph: Balance esperado
  - paragraph: $ 72.530,88
  - paragraph: $ 0,00
  - paragraph: Incluye pendientes y proyecciones, separados de los movimientos realizados.
  - region "Tendencia real":
    - paragraph: Tendencia real
    - paragraph: Balance mensual realizado informado por el backend.
    - paragraph: ARS
    - text: 6 meses
    - paragraph: "feb 2026: $ 0,00 . jul 2026: $ 72.530,88"
    - list "Serie mensual del balance ARS":
      - listitem: "feb 2026: $ 0,00"
      - listitem: "mar 2026: $ 0,00"
      - listitem: "abr 2026: $ 0,00"
      - listitem: "may 2026: $ 0,00"
      - listitem: "jun 2026: $ 0,00"
      - listitem: "jul 2026: $ 72.530,88"
    - paragraph: USD
    - text: 6 meses
    - paragraph: "feb 2026: $ 0,00 . jul 2026: $ 0,00"
    - paragraph: Sin movimientos en USD dentro del histórico disponible.
    - list "Serie mensual del balance USD":
      - listitem: "feb 2026: $ 0,00"
      - listitem: "mar 2026: $ 0,00"
      - listitem: "abr 2026: $ 0,00"
      - listitem: "may 2026: $ 0,00"
      - listitem: "jun 2026: $ 0,00"
      - listitem: "jul 2026: $ 0,00"
    - button "Ver evolución en Reportes"
  - paragraph: Ingresos realizados
  - paragraph: $ 100.000,00
  - paragraph: $ 0,00
  - paragraph: Sin base comparable
  - paragraph: Egresos realizados
  - paragraph: $ 27.469,12
  - paragraph: $ 0,00
  - paragraph: Sin base comparable
  - paragraph: Compromisos
  - paragraph: $ 0,00
  - paragraph: $ 0,00
  - paragraph: 0 movimientos pendientes o proyectados
  - paragraph: Sin clasificar
  - paragraph: "4"
  - paragraph: Movimientos que requieren revisión de categoría.
  - text: Salud financiera
  - paragraph: Resultado determinístico por moneda. Fórmula fh-v1.0.0; el frontend no calcula el puntaje.
  - paragraph: ARS
  - paragraph: 86/100
  - paragraph: Resultado favorable
  - paragraph: Confianza baja · 70/100 puntos de fórmula disponibles
  - paragraph: USD
  - paragraph: No calculable
  - paragraph: No calculado
  - paragraph: Evidencia insuficiente · 25/100 puntos de fórmula disponibles
  - button "Ver fórmula y evidencia"
  - text: Resultado realizado y tasa de ahorro
  - paragraph: Calculado por el backend sólo con ingresos y egresos realizados. No incluye pendientes ni proyecciones.
  - paragraph: ARS
  - paragraph: $ 72.530,88
  - paragraph: "Tasa de ahorro: 72,53%"
  - paragraph: USD
  - paragraph: $ 0,00
  - paragraph: "Tasa de ahorro: Sin base comparable"
  - button "Ver movimientos del período"
  - text: Presupuestos activos
  - paragraph: Límites efectivos y consumo real para el período seleccionado.
  - text: No hay presupuestos activos aplicables a este período.
  - button "Crear presupuesto"
  - text: Objetivos activos
  - paragraph: Metas de planificación priorizadas por fecha objetivo y menor avance. Los aportes no reservan saldo.
  - text: No hay objetivos activos. Podés crear uno desde la sección Objetivos.
  - button "Crear objetivo"
  - text: Alertas basadas en reglas
  - paragraph: Cada alerta muestra el hecho y la regla que la disparó. No usa evaluación financiera de IA.
  - text: 1 activa
  - paragraph: Atención
  - heading "Movimientos sin clasificar" [level=3]
  - paragraph: 4 movimientos necesitan una categoría para mejorar reportes y control.
  - list:
    - listitem: "• Registros detectados: 4"
    - listitem: "• Regla: category = Sin clasificar"
  - button "Clasificar movimientos"
  - text: Evolución mensual
  - paragraph: Series realizadas y proyectadas informadas por el backend, con ARS y USD siempre separados.
  - group "Moneda del gráfico de evolución":
    - button "ARS" [pressed]
    - button "USD"
  - group "Vista de evolución mensual":
    - button "Barras" [pressed]
    - button "Área"
  - paragraph: feb 2026
  - paragraph: + $ 0,00
  - paragraph: − $ 0,00
  - paragraph: mar 2026
  - paragraph: + $ 0,00
  - paragraph: − $ 0,00
  - paragraph: abr 2026
  - paragraph: + $ 0,00
  - paragraph: − $ 0,00
  - paragraph: may 2026
  - paragraph: + $ 0,00
  - paragraph: − $ 0,00
  - paragraph: jun 2026
  - paragraph: + $ 0,00
  - paragraph: − $ 0,00
  - paragraph: jul 2026
  - paragraph: + $ 100.000,00
  - paragraph: − $ 27.469,12
  - group: Ver datos mensuales equivalentes
  - text: Gastos por categoría
  - paragraph: Sólo egresos realizados; importes y porcentajes provienen del backend.
  - group "Vista de gastos por categoría":
    - button "Lista" [pressed]
    - button "Donut"
  - text: Sin clasificar $ 27.469,12 · 100% Últimos movimientos
  - paragraph: Movimientos reales y pendientes del período.
  - button "Ver todos"
  - paragraph: Egreso asesor UAT 1784766929292
  - paragraph: 22-jul · Sin clasificar · Carga manual
  - paragraph: −$ 25.000,00
  - paragraph: Real
  - paragraph: Ingreso asesor UAT 1784766929292
  - paragraph: 22-jul · Sin clasificar · Carga manual
  - paragraph: +$ 100.000,00
  - paragraph: Real
  - paragraph: UAT centro alertas 1784670762969
  - paragraph: 21-jul · Sin clasificar · Carga manual
  - paragraph: −$ 1.234,56
  - paragraph: Real
  - paragraph: UAT centro alertas 1784670472085
  - paragraph: 21-jul · Sin clasificar · Carga manual
  - paragraph: −$ 1.234,56
  - paragraph: Real
  - text: Compromisos del período
  - paragraph: Pendientes y proyectados; no forman parte del balance realizado.
  - paragraph: No hay compromisos proyectados para este período.
- contentinfo:
  - paragraph: © 2026 CajaApp.
  - paragraph: La información se procesa localmente en tu instalación.
- region "Notifications (F8)":
  - list
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | 
  4   | const API_BASE_URL = process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";
  5   | 
  6   | 
  7   | function currentRange(): { from: string; to: string; today: string } {
  8   |   const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Tucuman", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  9   |   const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  10  |   const year = Number(values.year);
  11  |   const month = Number(values.month);
  12  |   const day = Number(values.day);
  13  |   const from = `${year}-${String(month).padStart(2, "0")}-01`;
  14  |   const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  15  |   return { from, to: `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`, today: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
  16  | }
  17  | 
  18  | 
  19  | test("Asesor IA mantiene fingerprint, claims y citas consistentes", async ({ request }) => {
  20  |   test.setTimeout(240_000);
  21  |   const range = currentRange();
  22  |   const suffix = Date.now();
  23  |   const movementIds: string[] = [];
  24  |   const interactionIds: string[] = [];
  25  | 
  26  |   try {
  27  |     for (const payload of [
  28  |       { type: "income", description: `Ingreso asesor UAT ${suffix}`, amount: "100000,00" },
  29  |       { type: "expense", description: `Egreso asesor UAT ${suffix}`, amount: "25000,00" },
  30  |     ]) {
  31  |       const response = await request.post(`${API_BASE_URL}/api/movements/manual`, { data: { occurredOn: range.today, sourceType: "manual_cash", categoryId: null, currency: "ARS", status: "actual", notes: "UAT APP-AI-ADVISOR-001", ...payload } });
  32  |       expect(response.ok()).toBeTruthy();
  33  |       const created = await response.json() as { sourceId: string };
  34  |       movementIds.push(created.sourceId);
  35  |     }
  36  | 
  37  |     const contextResponse = await request.get(`${API_BASE_URL}/api/ai-advisor/context?from=${range.from}&to=${range.to}`);
  38  |     expect(contextResponse.ok()).toBeTruthy();
  39  |     const context = await contextResponse.json() as { context: { sourceCount: number; sourceFingerprint: string }; provider: { configured: boolean } };
  40  |     expect(context.context.sourceCount).toBeGreaterThan(0);
  41  |     expect(context.context.sourceFingerprint).toHaveLength(64);
  42  |     expect(context.provider.configured).toBeTruthy();
  43  | 
  44  |     const askResponse = await request.post(`${API_BASE_URL}/api/ai-advisor/ask`, { data: { from: range.from, to: range.to, mode: "analysis", currency: "ARS", question: "Explicá el balance realizado y esperado usando sólo fuentes de CajaApp." } });
  45  |     expect(askResponse.ok()).toBeTruthy();
  46  |     const interaction = await askResponse.json() as { id: string; answer: { claims: Array<{ sourceIds: string[] }>; citations: Array<{ id: string }> }; context: { fingerprint: string }; provider: { requestId: string } };
  47  |     interactionIds.push(interaction.id);
  48  |     expect(interaction.context.fingerprint).toBe(context.context.sourceFingerprint);
  49  |     expect(interaction.provider.requestId).toBeTruthy();
  50  |     expect(interaction.answer.claims.length).toBeGreaterThan(0);
  51  |     const citationIds = new Set(interaction.answer.citations.map((item) => item.id));
  52  |     for (const claim of interaction.answer.claims) for (const sourceId of claim.sourceIds) expect(citationIds.has(sourceId)).toBeTruthy();
  53  |   } finally {
  54  |     for (const id of [...new Set(interactionIds)]) await request.delete(`${API_BASE_URL}/api/ai-advisor/history/${id}`);
  55  |     for (const id of movementIds) await request.delete(`${API_BASE_URL}/api/movements/manual/${id}`);
  56  |   }
  57  | });
  58  | 
  59  | 
  60  | test("Asesor IA responde en UI desktop y conserva acceso mobile", async ({ page, request }) => {
  61  |   test.setTimeout(240_000);
  62  |   const range = currentRange();
  63  |   const suffix = Date.now();
  64  |   const movementIds: string[] = [];
  65  |   const interactionIds: string[] = [];
  66  | 
  67  |   try {
  68  |     for (const payload of [
  69  |       { type: "income", description: `Ingreso asesor UAT ${suffix}`, amount: "100000,00" },
  70  |       { type: "expense", description: `Egreso asesor UAT ${suffix}`, amount: "25000,00" },
  71  |     ]) {
  72  |       const response = await request.post(`${API_BASE_URL}/api/movements/manual`, { data: { occurredOn: range.today, sourceType: "manual_cash", categoryId: null, currency: "ARS", status: "actual", notes: "UAT APP-AI-ADVISOR-001", ...payload } });
  73  |       expect(response.ok()).toBeTruthy();
  74  |       const created = await response.json() as { sourceId: string };
  75  |       movementIds.push(created.sourceId);
  76  |     }
  77  | 
  78  |     await page.goto("/");
  79  |     await page.getByRole("button", { name: "Asesor IA", exact: true }).click();
  80  |     await expect(page.getByTestId("ai-advisor-section")).toBeVisible();
  81  |     await expect(page.getByTestId("ai-advisor-context-summary")).toBeVisible();
  82  |     await page.getByTestId("ai-advisor-question").fill("Explicá los factores financieros del período con evidencia.");
  83  |     await page.getByTestId("ai-advisor-submit").click();
  84  |     const uiResponse = page.getByTestId("ai-advisor-response");
  85  |     await expect(uiResponse).toBeVisible({ timeout: 180_000 });
  86  |     const uiInteractionId = await uiResponse.getAttribute("data-interaction-id");
  87  |     if (uiInteractionId) interactionIds.push(uiInteractionId);
  88  |     await expect(page.getByTestId("ai-advisor-claim").first()).toBeVisible();
  89  |     await expect(page.getByTestId("ai-advisor-citation").first()).toBeVisible();
  90  | 
  91  |     await page.setViewportSize({ width: 390, height: 844 });
  92  |     await page.goto("/");
  93  |     const mobileNav = page.getByTestId("finance-mobile-navigation");
> 94  |     await expect(mobileNav).toBeVisible();
      |                             ^ Error: expect(locator).toBeVisible() failed
  95  |     await mobileNav.getByTestId("sidebar-nav-item-ai-advisor").click();
  96  |     await expect(page.getByTestId("ai-advisor-section")).toBeVisible();
  97  |   } finally {
  98  |     for (const id of [...new Set(interactionIds)]) await request.delete(`${API_BASE_URL}/api/ai-advisor/history/${id}`);
  99  |     for (const id of movementIds) await request.delete(`${API_BASE_URL}/api/movements/manual/${id}`);
  100 |   }
  101 | });
  102 | 
```