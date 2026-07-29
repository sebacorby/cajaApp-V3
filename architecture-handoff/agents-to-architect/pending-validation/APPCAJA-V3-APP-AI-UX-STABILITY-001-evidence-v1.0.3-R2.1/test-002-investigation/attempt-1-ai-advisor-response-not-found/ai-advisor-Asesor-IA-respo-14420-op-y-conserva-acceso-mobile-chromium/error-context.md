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

Locator: getByTestId('ai-advisor-response')
Expected: visible
Timeout: 180000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 180000ms
  - waiting for getByTestId('ai-advisor-response')

```

```yaml
- alert
- complementary:
  - text: CajaApp Finanzas personales
  - navigation "Navegación principal":
    - region "Operación":
      - paragraph: Operación
      - paragraph: Consulta y registro cotidiano de tus finanzas.
      - button "Inicio"
      - button "Movimientos"
      - button "Ingresos"
      - button "Tarjetas"
      - button "Deuda futura"
    - region "Ingesta y calidad":
      - paragraph: Ingesta y calidad
      - paragraph: Carga, revisión y conciliación de fuentes.
      - button "Importaciones"
      - button "Conciliación"
    - region "Planificación":
      - paragraph: Planificación
      - paragraph: Límites de gasto y metas personales.
      - button "Presupuestos"
      - button "Objetivos"
    - region "Análisis":
      - paragraph: Análisis
      - paragraph: Lectura, evidencia y explicación de los datos reales.
      - button "Reportes"
      - button "Salud financiera"
      - button "Asesor IA"
    - region "Sistema":
      - paragraph: Sistema
      - paragraph: Cierres, resguardo y preferencias de la instalación local.
      - button "Cierres"
      - button "Respaldo"
      - button "Configuración"
  - region "Salud financiera":
    - paragraph: Salud financiera
    - paragraph: 01 de jul de 2026 – 31 de jul de 2026
    - paragraph: ARS
    - paragraph: 86/100
    - paragraph: Resultado favorable
    - paragraph: Confianza baja
    - paragraph: USD
    - paragraph: Sin datos suficientes
    - paragraph: No calculable
    - paragraph: Evidencia insuficiente
    - button "Abrir detalle de Salud financiera": Ver fórmula y evidencia
    - paragraph: Fórmula fh-v1.0.0. No reemplaza alertas ni calidad de datos.
  - region "Calidad del dato":
    - paragraph: Calidad del dato
    - paragraph: 01 de jul de 2026 – 31 de jul de 2026
    - button "Actualizar calidad del dato"
    - button "Sin clasificar 4 movimientos"
    - button "Alertas activas 1 regla"
    - button "Último dato actualizado 22-jul, 09:31 p. m."
    - paragraph: Indicadores técnicos, sin puntaje ni diagnóstico financiero.
  - text: Datos locales. CajaApp no conecta cuentas bancarias ni toma decisiones financieras por vos.
- banner:
  - text: CajaApp Así están tus finanzas, Javi
  - combobox "Seleccionar período": Mes actual
  - text: 01 de jul de 2026 – 31 de jul de 2026
  - button "Buscar en CajaApp": Buscar
  - button "Centro de alertas, 1 activas": "1"
  - button "Nuevo movimiento"
- main:
  - paragraph: Explicaciones trazables y simulaciones aisladas
  - heading "Asesor IA" [level=2]
  - paragraph: 01 de jul de 2026 – 31 de jul de 2026 · explica cálculos existentes y cita siempre el dato de origen
  - button "Actualizar contexto"
  - alert: La IA recibe datos normalizados, no documentos originales. No calcula saldos autoritativos, no modifica registros y no ejecuta decisiones. La respuesta explica datos de CajaApp y puede plantear simulaciones. No modifica registros, no ejecuta operaciones y no sustituye asesoramiento financiero, contable, impositivo o legal profesional.
  - alert: "La afirmación claim-5 contiene valores no presentes en sus fuentes citadas: 100.00%"
  - paragraph: ARS
  - paragraph: 86/100
  - paragraph: Resultado favorable · low
  - paragraph: USD
  - paragraph: N/C
  - paragraph: No calculado · insufficient
  - paragraph: Alertas
  - paragraph: "1"
  - paragraph: 0 críticas
  - paragraph: Fuentes
  - paragraph: "29"
  - paragraph: 4 movimientos sin clasificar
  - text: Consulta trazable
  - paragraph: La pregunta se trata como texto no confiable y no puede cambiar los límites del sistema.
  - button "¿Qué factores explican el resultado financiero del período?"
  - button "¿Qué riesgos ya detectados por CajaApp conviene revisar primero?"
  - button "¿Cómo evolucionaron los egresos frente al período anterior?"
  - button "¿Qué compromisos futuros tienen mayor impacto en el balance esperado?"
  - button "¿Qué datos faltantes reducen la confianza del análisis?"
  - text: Pregunta
  - textbox "Pregunta":
    - /placeholder: Preguntá sobre tendencias, riesgos ya calculados, compromisos o calidad del dato
    - text: Explicá los factores financieros del período con evidencia.
  - paragraph: 59/1200
  - button "Explicación"
  - button "Simulación"
  - combobox "Moneda del análisis":
    - option "ARS" [selected]
    - option "USD"
  - button "Consultar con evidencia"
  - text: Historial local
  - paragraph: Guarda pregunta, contexto estructurado, versión del prompt, modelo y respuesta validada. Nunca guarda documentos originales.
  - article:
    - paragraph: Período sin registros financieros
    - paragraph: test
    - paragraph: 21 de jul de 2026, 03:16 p. m. · ollama/kimi-k2.7-code
    - button "Abrir"
    - button "Eliminar consulta del asesor"
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
> 85  |     await expect(uiResponse).toBeVisible({ timeout: 180_000 });
      |                              ^ Error: expect(locator).toBeVisible() failed
  86  |     const uiInteractionId = await uiResponse.getAttribute("data-interaction-id");
  87  |     if (uiInteractionId) interactionIds.push(uiInteractionId);
  88  |     await expect(page.getByTestId("ai-advisor-claim").first()).toBeVisible();
  89  |     await expect(page.getByTestId("ai-advisor-citation").first()).toBeVisible();
  90  | 
  91  |     await page.setViewportSize({ width: 390, height: 844 });
  92  |     await page.goto("/");
  93  |     const mobileNav = page.getByTestId("finance-mobile-navigation");
  94  |     await expect(mobileNav).toBeVisible();
  95  |     await mobileNav.getByTestId("sidebar-nav-item-ai-advisor").click();
  96  |     await expect(page.getByTestId("ai-advisor-section")).toBeVisible();
  97  |   } finally {
  98  |     for (const id of [...new Set(interactionIds)]) await request.delete(`${API_BASE_URL}/api/ai-advisor/history/${id}`);
  99  |     for (const id of movementIds) await request.delete(`${API_BASE_URL}/api/movements/manual/${id}`);
  100 |   }
  101 | });
  102 | 
```