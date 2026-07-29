# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\card-statement-import.spec.ts >> card statement import >> imports Galicia Visa PDF and renders the real preview
- Location: tests\e2e\card-statement-import.spec.ts:121:7

# Error details

```
Error: {"code":"INTERNAL_ERROR","message":"Internal server error"}

expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
              - button "Deuda futura" [ref=e44]:
                - img [ref=e45]
                - generic [ref=e47]: Deuda futura
          - region "Ingesta y calidad" [ref=e48]:
            - paragraph [ref=e49]: Ingesta y calidad
            - paragraph [ref=e50]: Carga, revisión y conciliación de fuentes.
            - generic [ref=e51]:
              - button "Importaciones" [ref=e52]:
                - img [ref=e53]
                - generic [ref=e57]: Importaciones
              - button "Conciliación" [ref=e58]:
                - img [ref=e59]
                - generic [ref=e66]: Conciliación
          - region "Planificación" [ref=e67]:
            - paragraph [ref=e68]: Planificación
            - paragraph [ref=e69]: Límites de gasto y metas personales.
            - generic [ref=e70]:
              - button "Presupuestos" [ref=e71]:
                - img [ref=e72]
                - generic [ref=e75]: Presupuestos
              - button "Objetivos" [ref=e76]:
                - img [ref=e77]
                - generic [ref=e81]: Objetivos
          - region "Análisis" [ref=e82]:
            - paragraph [ref=e83]: Análisis
            - paragraph [ref=e84]: Lectura, evidencia y explicación de los datos reales.
            - generic [ref=e85]:
              - button "Reportes" [ref=e86]:
                - img [ref=e87]
                - generic [ref=e89]: Reportes
              - button "Salud financiera" [ref=e90]:
                - img [ref=e91]
                - generic [ref=e94]: Salud financiera
              - button "Asesor IA" [ref=e95]:
                - img [ref=e96]
                - generic [ref=e98]: Asesor IA
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
        - generic [ref=e121]:
          - paragraph [ref=e122]:
            - img [ref=e123]
            - text: Salud financiera
          - paragraph [ref=e126]: 01 de jul de 2026 – 31 de jul de 2026
          - paragraph [ref=e127]:
            - img [ref=e128]
            - text: Calculando indicador real…
        - generic [ref=e130]: Datos locales. CajaApp no conecta cuentas bancarias ni toma decisiones financieras por vos.
    - generic [ref=e131]:
      - banner [ref=e132]:
        - generic [ref=e133]:
          - generic [ref=e134]:
            - generic [ref=e135]: CajaApp
            - generic [ref=e136]: Así están tus finanzas, Javi
          - generic [ref=e137]:
            - combobox "Seleccionar período" [ref=e138]:
              - generic: Mes actual
              - img
            - generic [ref=e139]: 01 de jul de 2026 – 31 de jul de 2026
            - button "Buscar en CajaApp" [ref=e140]:
              - img
              - generic [ref=e141]: Buscar
            - button "Centro de alertas, sin alertas activas" [ref=e142]:
              - img
            - button "Nuevo movimiento" [ref=e143]:
              - img
              - generic [ref=e144]: Nuevo movimiento
      - main [ref=e145]:
        - generic [ref=e146]:
          - paragraph [ref=e148]: Resumen, cuotas y consumos futuros
          - generic [ref=e151]:
            - img [ref=e153]
            - heading "No pudimos completar la importación" [level=2] [ref=e155]
            - paragraph [ref=e156]: Internal server error
            - generic [ref=e157]:
              - button "Reintentar" [ref=e158]:
                - img
                - text: Reintentar
              - button "Elegir otro PDF" [ref=e159]
      - contentinfo [ref=e160]:
        - generic [ref=e161]:
          - paragraph [ref=e162]: © 2026 CajaApp.
          - paragraph [ref=e163]: La información se procesa localmente en tu instalación.
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
  52  |     pageErrors: [],
  53  |     failedRequests: [],
  54  |     importResponses: [],
  55  |   };
  56  | 
  57  | 
  58  |   page.on("console", (message) => {
  59  |     evidence.console.push({
  60  |       type: message.type(),
  61  |       text: message.text(),
  62  |     });
  63  |   });
  64  | 
  65  | 
  66  |   page.on("pageerror", (error) => {
  67  |     evidence.pageErrors.push(error.stack ?? error.message);
  68  |   });
  69  | 
  70  | 
  71  |   page.on("requestfailed", (request) => {
  72  |     evidence.failedRequests.push({
  73  |       method: request.method(),
  74  |       url: request.url(),
  75  |       failure: request.failure()?.errorText,
  76  |     });
  77  |   });
  78  | 
  79  | 
  80  |   page.on("response", async (response) => {
  81  |     if (!response.url().includes("/api/card-statements/import")) {
  82  |       return;
  83  |     }
  84  | 
  85  | 
  86  |     let body: unknown;
  87  | 
  88  | 
  89  |     try {
  90  |       body = await response.json();
  91  |     } catch {
  92  |       body = await response.text().catch(() => undefined);
  93  |     }
  94  | 
  95  | 
  96  |     evidence.importResponses.push({
  97  |       method: response.request().method(),
  98  |       url: response.url(),
  99  |       status: response.status(),
  100 |       body,
  101 |     });
  102 |   });
  103 | 
  104 | 
  105 |   return evidence;
  106 | }
  107 | 
  108 | 
  109 | async function attachEvidence(
  110 |   testInfo: TestInfo,
  111 |   evidence: BrowserEvidence,
  112 | ): Promise<void> {
  113 |   await testInfo.attach("browser-evidence.json", {
  114 |     body: Buffer.from(JSON.stringify(evidence, null, 2), "utf8"),
  115 |     contentType: "application/json",
  116 |   });
  117 | }
  118 | 
  119 | 
  120 | test.describe("card statement import", () => {
  121 |   test("imports Galicia Visa PDF and renders the real preview", async ({
  122 |     page,
  123 |   }, testInfo) => {
  124 |     test.setTimeout(12 * 60 * 1000);
  125 |     const evidence = collectEvidence(page);
  126 |     const uniquePdfPath = await createUniquePdf(testInfo);
  127 | 
  128 | 
  129 |     try {
  130 |       await test.step("open card statements", async () => {
  131 |         await page.goto("/");
  132 |         await page.getByRole("button", { name: /tarjetas/i }).click();
  133 |         await expect(
  134 |           page.getByTestId("card-statement-file-input"),
  135 |         ).toBeAttached();
  136 |       });
  137 | 
  138 | 
  139 |       await test.step("select PDF and start import", async () => {
  140 |         await page
  141 |           .getByTestId("card-statement-file-input")
  142 |           .setInputFiles(uniquePdfPath);
  143 | 
  144 | 
  145 |         const importResponsePromise = page.waitForResponse(
  146 |           (response) =>
  147 |             response.request().method() === "POST" &&
  148 |             /\/api\/card-statements\/import$/.test(response.url()),
  149 |         );
  150 |         await page.getByTestId("card-statement-import-submit").click();
  151 |         const importResponse = await importResponsePromise;
> 152 |         expect(importResponse.ok(), await importResponse.text()).toBeTruthy();
      |                                                                  ^ Error: {"code":"INTERNAL_ERROR","message":"Internal server error"}
  153 | 
  154 | 
  155 |         await expect(
  156 |           page.getByTestId("card-statement-import-state"),
  157 |         ).toContainText(/procesando|analizando|extrayendo/i, {
  158 |           timeout: 10_000,
  159 |         });
  160 | 
  161 | 
  162 |         await page.screenshot({
  163 |           path: testInfo.outputPath("01-processing.png"),
  164 |           fullPage: true,
  165 |         });
  166 |       });
  167 | 
  168 | 
  169 |       await test.step("wait for real preview", async () => {
  170 |         await expect(page.getByTestId("card-statement-preview")).toBeVisible({
  171 |           timeout: 9 * 60 * 1000,
  172 |         });
  173 | 
  174 | 
  175 |         await expect(
  176 |           page.getByTestId("card-statement-import-state"),
  177 |         ).toHaveCount(0);
  178 |       });
  179 | 
  180 | 
  181 |       await test.step("validate extracted content", async () => {
  182 |         const bankNameText = await page
  183 |           .getByTestId("card-statement-bank-name")
  184 |           .innerText();
  185 |         const brandText = await page
  186 |           .getByTestId("card-statement-brand")
  187 |           .innerText();
  188 | 
  189 | 
  190 |         expect(bankNameText.toLowerCase()).toContain("galicia");
  191 |         expect(brandText.toLowerCase()).toContain("visa");
  192 | 
  193 | 
  194 |         const pesosText = await page
  195 |           .getByTestId("card-statement-total-pesos")
  196 |           .innerText();
  197 | 
  198 | 
  199 |         const dollarsText = await page
  200 |           .getByTestId("card-statement-total-dollars")
  201 |           .innerText();
  202 | 
  203 | 
  204 |         expect(parseFinancialAmount(pesosText)).toBeCloseTo(3_118_842.5, 2);
  205 |         expect(parseFinancialAmount(dollarsText)).toBeCloseTo(161.84, 2);
  206 | const groupCount = await page
  207 |           .getByTestId("card-statement-group")
  208 |           .count();
  209 |         expect(groupCount).toBe(4);
  210 | 
  211 | 
  212 | 
  213 | 
  214 |         const previewReadyResponse = evidence.importResponses.find(
  215 |           (item) =>
  216 |             item.status === 200 &&
  217 |             typeof item.body === "object" &&
  218 |             item.body !== null &&
  219 |             (item.body as { status?: string }).status === "preview_ready",
  220 |         );
  221 |         const preview = (
  222 |           previewReadyResponse?.body as
  223 |             | { preview?: { rows?: Array<{ rowType: string }> } }
  224 |             | undefined
  225 |         )?.preview;
  226 |         expect(preview, "El cuerpo de la respuesta debe incluir el preview autoritativo.").toBeDefined();
  227 |         const previewRows = preview?.rows ?? [];
  228 |         const renderableRows = previewRows.filter(
  229 |           (row) => !OMITTED_ROW_TYPES.has(row.rowType),
  230 |         );
  231 |         const rowCount = await page.getByTestId("card-statement-row").count();
  232 |         expect(rowCount).toBe(renderableRows.length);
  233 | 
  234 | 
  235 | 
  236 | 
  237 |         const transactionCount = previewRows.filter(
  238 |           (row) => row.rowType === "transaction",
  239 |         ).length;
  240 |         const taxCount = previewRows.filter((row) => row.rowType === "tax").length;
  241 |         const totalCount = previewRows.filter(
  242 |           (row) => row.rowType === "statement_total",
  243 |         ).length;
  244 |         const groupTotalCount = previewRows.filter(
  245 |           (row) => row.rowType === "group_total",
  246 |         ).length;
  247 |         const futureInstallmentCount = previewRows.filter(
  248 |           (row) => row.rowType === "future_installment_reference",
  249 |         ).length;
  250 |         const chargeCount = previewRows.filter((row) => row.rowType === "charge").length;
  251 |         const consolidatedRowCount = previewRows.filter(
  252 |           (row) => row.rowType === "consolidated_row",
```