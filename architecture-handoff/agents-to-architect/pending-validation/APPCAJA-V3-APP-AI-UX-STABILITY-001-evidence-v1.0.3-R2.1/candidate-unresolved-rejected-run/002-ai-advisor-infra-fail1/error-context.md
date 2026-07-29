# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai-advisor.spec.ts >> Asesor IA responde en UI desktop y conserva acceso mobile
- Location: tests\ai-advisor.spec.ts:60:5

# Error details

```
Error: apiRequestContext.delete: connect ECONNREFUSED 127.0.0.1:11436
Call log:
  - → DELETE http://127.0.0.1:11436/api/movements/manual/8c241190-a373-4f17-b697-9be53240d6d0
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - complementary [ref=e5]:
      - generic [ref=e7]:
        - generic [ref=e9]:
          - img [ref=e11]
          - generic [ref=e14]:
            - generic [ref=e15]: CajaApp
            - generic [ref=e16]: Finanzas personales
        - navigation "Navegación principal" [ref=e17]:
          - region "Operación" [ref=e18]:
            - paragraph [ref=e19]: Operación
            - paragraph [ref=e20]: Consulta y registro cotidiano de tus finanzas.
            - generic [ref=e21]:
              - button "Inicio" [ref=e22]:
                - img [ref=e23]
                - generic [ref=e28]: Inicio
              - button "Movimientos" [ref=e29]:
                - img [ref=e30]
                - generic [ref=e33]: Movimientos
              - button "Ingresos" [ref=e34]:
                - img [ref=e35]
                - generic [ref=e38]: Ingresos
              - button "Tarjetas" [ref=e39]:
                - img [ref=e40]
                - generic [ref=e42]: Tarjetas
              - button "Deuda futura" [ref=e43]:
                - img [ref=e44]
                - generic [ref=e46]: Deuda futura
          - region "Ingesta y calidad" [ref=e47]:
            - paragraph [ref=e48]: Ingesta y calidad
            - paragraph [ref=e49]: Carga, revisión y conciliación de fuentes.
            - generic [ref=e50]:
              - button "Importaciones" [ref=e51]:
                - img [ref=e52]
                - generic [ref=e56]: Importaciones
              - button "Conciliación" [ref=e57]:
                - img [ref=e58]
                - generic [ref=e65]: Conciliación
          - region "Planificación" [ref=e66]:
            - paragraph [ref=e67]: Planificación
            - paragraph [ref=e68]: Límites de gasto y metas personales.
            - generic [ref=e69]:
              - button "Presupuestos" [ref=e70]:
                - img [ref=e71]
                - generic [ref=e74]: Presupuestos
              - button "Objetivos" [ref=e75]:
                - img [ref=e76]
                - generic [ref=e80]: Objetivos
          - region "Análisis" [ref=e81]:
            - paragraph [ref=e82]: Análisis
            - paragraph [ref=e83]: Lectura, evidencia y explicación de los datos reales.
            - generic [ref=e84]:
              - button "Reportes" [ref=e85]:
                - img [ref=e86]
                - generic [ref=e88]: Reportes
              - button "Salud financiera" [ref=e89]:
                - img [ref=e90]
                - generic [ref=e93]: Salud financiera
              - button "Asesor IA" [active] [ref=e94]:
                - img [ref=e95]
                - generic [ref=e97]: Asesor IA
          - region "Sistema" [ref=e99]:
            - paragraph [ref=e100]: Sistema
            - paragraph [ref=e101]: Cierres, resguardo y preferencias de la instalación local.
            - generic [ref=e102]:
              - button "Cierres" [ref=e103]:
                - img [ref=e104]
                - generic [ref=e107]: Cierres
              - button "Respaldo" [ref=e108]:
                - img [ref=e109]
                - generic [ref=e115]: Respaldo
              - button "Configuración" [ref=e116]:
                - img [ref=e117]
                - generic [ref=e120]: Configuración
        - region "Salud financiera" [ref=e121]:
          - paragraph [ref=e122]:
            - img [ref=e123]
            - text: Salud financiera
          - paragraph [ref=e126]: Indicador no disponible
          - paragraph [ref=e127]: Failed to fetch
          - button "Reintentar" [ref=e128]:
            - img
            - text: Reintentar
        - generic [ref=e129]: Datos locales. CajaApp no conecta cuentas bancarias ni toma decisiones financieras por vos.
    - generic [ref=e130]:
      - banner [ref=e131]:
        - generic [ref=e132]:
          - generic [ref=e133]:
            - generic [ref=e134]: CajaApp
            - generic [ref=e135]: Así están tus finanzas, Javi
          - generic [ref=e136]:
            - combobox "Seleccionar período" [ref=e137]:
              - generic: Mes actual
              - img
            - generic [ref=e138]: 01 de jul de 2026 – 31 de jul de 2026
            - button "Buscar en CajaApp" [ref=e139]:
              - img
              - generic [ref=e140]: Buscar
            - button "Centro de alertas, sin alertas activas" [ref=e141]:
              - img
            - button "Nuevo movimiento" [ref=e142]:
              - img
              - generic [ref=e143]: Nuevo movimiento
      - main [ref=e144]:
        - generic [ref=e145]:
          - paragraph [ref=e147]: Explicaciones trazables y simulaciones aisladas
          - 'generic "Asesor IA: estados reales" [ref=e148]':
            - generic [ref=e151]:
              - img [ref=e152]
              - paragraph [ref=e154]: No se pudo preparar el asesor IA
              - paragraph [ref=e155]: Internal server error
              - button "Reintentar" [ref=e156]
      - contentinfo [ref=e157]:
        - generic [ref=e158]:
          - paragraph [ref=e159]: © 2026 CajaApp.
          - paragraph [ref=e160]: La información se procesa localmente en tu instalación.
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
  94  |     await expect(mobileNav).toBeVisible();
  95  |     await mobileNav.getByTestId("sidebar-nav-item-ai-advisor").click();
  96  |     await expect(page.getByTestId("ai-advisor-section")).toBeVisible();
  97  |   } finally {
  98  |     for (const id of [...new Set(interactionIds)]) await request.delete(`${API_BASE_URL}/api/ai-advisor/history/${id}`);
> 99  |     for (const id of movementIds) await request.delete(`${API_BASE_URL}/api/movements/manual/${id}`);
      |                                                       ^ Error: apiRequestContext.delete: connect ECONNREFUSED 127.0.0.1:11436
  100 |   }
  101 | });
  102 | 
```