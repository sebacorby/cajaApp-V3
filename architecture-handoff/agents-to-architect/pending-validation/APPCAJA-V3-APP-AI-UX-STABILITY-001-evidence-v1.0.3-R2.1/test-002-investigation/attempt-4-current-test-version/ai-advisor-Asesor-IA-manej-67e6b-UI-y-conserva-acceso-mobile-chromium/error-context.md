# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai-advisor.spec.ts >> Asesor IA maneja respuestas inválidas, responde en UI y conserva acceso mobile
- Location: tests\ai-advisor.spec.ts:121:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('ai-advisor-section')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByTestId('ai-advisor-section')

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
  - paragraph: No se pudo preparar el asesor IA
  - paragraph: "Invalid `prisma_js_1.prisma.movementCategoryRule.upsert()` invocation in C:\\Users\\javie\\Javier.s.corbella Dropbox\\Javier Corbella\\cajaApp-V3\\workspace\\backend\\dist\\modules\\movements\\categories.service.js:171:63 168 }); 169 const keywords = uniqueKeywords([...category.keywords]); 170 for (const [index, rule] of keywords.entries()) { → 171 await prisma_js_1.prisma.movementCategoryRule.upsert( Socket timeout (the database failed to respond to a query within the configured timeout— see https://pris.ly/d/sqlite-connector for more details)."
  - button "Reintentar"
- contentinfo:
  - paragraph: © 2026 CajaApp.
  - paragraph: La información se procesa localmente en tu instalación.
- region "Notifications (F8)":
  - list
```

# Test source

```ts
  62  |       citations: [{
  63  |         id: sourceId,
  64  |         kind: "movements",
  65  |         label: "Movimientos del período",
  66  |         description: "Fuente determinística para validar la UI.",
  67  |         period: { from: range.from, to: range.to },
  68  |         currency: "ARS",
  69  |         value: "Movimientos reales del período",
  70  |         rule: null,
  71  |         action: { section: "movimientos", label: "Ver movimientos" },
  72  |       }],
  73  |     },
  74  |     createdAt: new Date().toISOString(),
  75  |     disclaimer: "Respuesta de prueba respaldada por una fuente controlada.",
  76  |   };
  77  | }
  78  | 
  79  | 
  80  | test("Asesor IA mantiene fingerprint, claims y citas consistentes", async ({ request }) => {
  81  |   test.setTimeout(240_000);
  82  |   const range = currentRange();
  83  |   const suffix = Date.now();
  84  |   const movementIds: string[] = [];
  85  |   const interactionIds: string[] = [];
  86  | 
  87  |   try {
  88  |     for (const payload of [
  89  |       { type: "income", description: `Ingreso asesor UAT ${suffix}`, amount: "100000,00" },
  90  |       { type: "expense", description: `Egreso asesor UAT ${suffix}`, amount: "25000,00" },
  91  |     ]) {
  92  |       const response = await request.post(`${API_BASE_URL}/api/movements/manual`, { data: { occurredOn: range.today, sourceType: "manual_cash", categoryId: null, currency: "ARS", status: "actual", notes: "UAT APP-AI-ADVISOR-001", ...payload } });
  93  |       expect(response.ok()).toBeTruthy();
  94  |       const created = await response.json() as { sourceId: string };
  95  |       movementIds.push(created.sourceId);
  96  |     }
  97  | 
  98  |     const contextResponse = await request.get(`${API_BASE_URL}/api/ai-advisor/context?from=${range.from}&to=${range.to}`);
  99  |     expect(contextResponse.ok()).toBeTruthy();
  100 |     const context = await contextResponse.json() as { context: { sourceCount: number; sourceFingerprint: string }; provider: { configured: boolean } };
  101 |     expect(context.context.sourceCount).toBeGreaterThan(0);
  102 |     expect(context.context.sourceFingerprint).toHaveLength(64);
  103 |     expect(context.provider.configured).toBeTruthy();
  104 | 
  105 |     const askResponse = await request.post(`${API_BASE_URL}/api/ai-advisor/ask`, { data: { from: range.from, to: range.to, mode: "analysis", currency: "ARS", question: "Explicá el balance realizado y esperado usando sólo fuentes de CajaApp." } });
  106 |     expect(askResponse.ok()).toBeTruthy();
  107 |     const interaction = await askResponse.json() as { id: string; answer: { claims: Array<{ sourceIds: string[] }>; citations: Array<{ id: string }> }; context: { fingerprint: string }; provider: { requestId: string } };
  108 |     interactionIds.push(interaction.id);
  109 |     expect(interaction.context.fingerprint).toBe(context.context.sourceFingerprint);
  110 |     expect(interaction.provider.requestId).toBeTruthy();
  111 |     expect(interaction.answer.claims.length).toBeGreaterThan(0);
  112 |     const citationIds = new Set(interaction.answer.citations.map((item) => item.id));
  113 |     for (const claim of interaction.answer.claims) for (const sourceId of claim.sourceIds) expect(citationIds.has(sourceId)).toBeTruthy();
  114 |   } finally {
  115 |     for (const id of [...new Set(interactionIds)]) await request.delete(`${API_BASE_URL}/api/ai-advisor/history/${id}`);
  116 |     for (const id of movementIds) await request.delete(`${API_BASE_URL}/api/movements/manual/${id}`);
  117 |   }
  118 | });
  119 | 
  120 | 
  121 | test("Asesor IA maneja respuestas inválidas, responde en UI y conserva acceso mobile", async ({ page, request }) => {
  122 |   test.setTimeout(240_000);
  123 |   const range = currentRange();
  124 |   const suffix = Date.now();
  125 |   const movementIds: string[] = [];
  126 |   let advisorAttempts = 0;
  127 | 
  128 |   await page.route("**/api/ai-advisor/ask", async (route) => {
  129 |     advisorAttempts += 1;
  130 |     if (advisorAttempts === 1) {
  131 |       await route.fulfill({
  132 |         status: 422,
  133 |         contentType: "application/json",
  134 |         body: JSON.stringify({
  135 |           code: "AI_RESPONSE_VALIDATION_FAILED",
  136 |           message: "La respuesta del proveedor no superó la validación de evidencia.",
  137 |         }),
  138 |       });
  139 |       return;
  140 |     }
  141 | 
  142 |     await route.fulfill({
  143 |       status: 200,
  144 |       contentType: "application/json",
  145 |       body: JSON.stringify(uiAdvisorFixture(range, suffix)),
  146 |     });
  147 |   });
  148 | 
  149 |   try {
  150 |     for (const payload of [
  151 |       { type: "income", description: `Ingreso asesor UAT ${suffix}`, amount: "100000,00" },
  152 |       { type: "expense", description: `Egreso asesor UAT ${suffix}`, amount: "25000,00" },
  153 |     ]) {
  154 |       const response = await request.post(`${API_BASE_URL}/api/movements/manual`, { data: { occurredOn: range.today, sourceType: "manual_cash", categoryId: null, currency: "ARS", status: "actual", notes: "UAT APP-AI-ADVISOR-001", ...payload } });
  155 |       expect(response.ok()).toBeTruthy();
  156 |       const created = await response.json() as { sourceId: string };
  157 |       movementIds.push(created.sourceId);
  158 |     }
  159 | 
  160 |     await page.goto("/");
  161 |     await page.getByRole("button", { name: "Asesor IA", exact: true }).click();
> 162 |     await expect(page.getByTestId("ai-advisor-section")).toBeVisible();
      |                                                          ^ Error: expect(locator).toBeVisible() failed
  163 |     await expect(page.getByTestId("ai-advisor-context-summary")).toBeVisible({ timeout: 60_000 });
  164 |     await page.getByTestId("ai-advisor-question").fill("Explicá los factores financieros del período con evidencia.");
  165 |     await page.getByTestId("ai-advisor-submit").click();
  166 | 
  167 |     await expect(page.getByTestId("ai-advisor-error")).toBeVisible();
  168 |     await expect(page.getByTestId("ai-advisor-response")).toHaveCount(0);
  169 |     await page.getByTestId("ai-advisor-retry").click();
  170 | 
  171 |     const uiResponse = page.getByTestId("ai-advisor-response");
  172 |     await expect(uiResponse).toBeVisible();
  173 |     await expect(page.getByTestId("ai-advisor-error")).toHaveCount(0);
  174 |     await expect(page.getByTestId("ai-advisor-claim").first()).toBeVisible();
  175 |     await expect(page.getByTestId("ai-advisor-citation").first()).toBeVisible();
  176 | 
  177 |     await page.setViewportSize({ width: 390, height: 844 });
  178 |     await page.goto("/");
  179 |     await page.getByRole("button", { name: "Abrir menú" }).click();
  180 |     const mobileNav = page.getByTestId("finance-mobile-navigation");
  181 |     await expect(mobileNav).toBeVisible();
  182 |     await mobileNav.getByTestId("sidebar-nav-item-ai-advisor").click();
  183 |     await expect(mobileNav).not.toBeVisible();
  184 |     await expect(page.getByTestId("ai-advisor-section")).toBeVisible();
  185 |   } finally {
  186 |     for (const id of movementIds) await request.delete(`${API_BASE_URL}/api/movements/manual/${id}`);
  187 |   }
  188 | });
  189 | 
```