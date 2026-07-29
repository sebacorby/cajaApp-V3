# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: financial-health-compact.spec.ts >> Indicador compacto refleja score, banda, confianza, fórmula y período del payload
- Location: tests\financial-health-compact.spec.ts:138:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('financial-health-section')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByTestId('financial-health-section')

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
    - paragraph: 01 de jul de 2026 – 30 de sept de 2026
    - paragraph: ARS
    - paragraph: 61/100
    - paragraph: Expuesta
    - paragraph: Confianza alta
    - paragraph: USD
    - paragraph: Sin datos suficientes
    - paragraph: No calculable
    - paragraph: Confianza insuficiente
    - button "Abrir detalle de Salud financiera": Ver fórmula y evidencia
    - paragraph: Fórmula fh-v1.0.0. No reemplaza alertas ni calidad de datos.
  - text: Datos locales. CajaApp no conecta cuentas bancarias ni toma decisiones financieras por vos.
- banner:
  - text: CajaApp Así están tus finanzas, Javi
  - combobox "Seleccionar período": Trimestre actual
  - text: 01 de jul de 2026 – 30 de sept de 2026
  - button "Buscar en CajaApp": Buscar
  - button "Centro de alertas, sin alertas activas"
  - button "Nuevo movimiento"
- main:
  - paragraph: Fórmula determinística, evidencia e historial
  - paragraph: No se pudo calcular la salud financiera
  - paragraph: Failed to fetch
  - button "Reintentar"
- contentinfo:
  - paragraph: © 2026 CajaApp.
  - paragraph: La información se procesa localmente en tu instalación.
- region "Notifications (F8)":
  - list
```

# Test source

```ts
  95  |         note: "Los objetivos no representan reservas de saldo.",
  96  |         activeGoals: 0,
  97  |         nearestActiveTargetDate: null,
  98  |         currencies: {
  99  |           ARS: {
  100 |             targetAmount: "0",
  101 |             contributedAmount: "0",
  102 |             remainingAmount: "0",
  103 |             progressPercent: "0",
  104 |           },
  105 |           USD: {
  106 |             targetAmount: "0",
  107 |             contributedAmount: "0",
  108 |             remainingAmount: "0",
  109 |             progressPercent: "0",
  110 |           },
  111 |         },
  112 |       },
  113 |       comparison: null,
  114 |       disclaimer: "Indicador informativo basado en datos locales.",
  115 |     },
  116 |     history: [],
  117 |     snapshotId: null,
  118 |     snapshotCreated: false,
  119 |   };
  120 | }
  121 | 
  122 | async function mockFinancialHealth(
  123 |   page: Page,
  124 |   resolve: (from: string, to: string) => ReturnType<typeof healthPayload>,
  125 | ): Promise<void> {
  126 |   await page.route("**/api/financial-health?**", async (route: Route) => {
  127 |     const url = new URL(route.request().url());
  128 |     const from = url.searchParams.get("from") ?? "";
  129 |     const to = url.searchParams.get("to") ?? "";
  130 |     await route.fulfill({
  131 |       status: 200,
  132 |       contentType: "application/json",
  133 |       body: JSON.stringify(resolve(from, to)),
  134 |     });
  135 |   });
  136 | }
  137 | 
  138 | test("Indicador compacto refleja score, banda, confianza, fórmula y período del payload", async ({
  139 |   page,
  140 | }) => {
  141 |   const month = currentMonthRange();
  142 | 
  143 |   await mockFinancialHealth(page, (from, to) =>
  144 |     healthPayload({
  145 |       from,
  146 |       to,
  147 |       arsScore: from === month.from && to === month.to ? 73 : 61,
  148 |       arsStatus: "calculated",
  149 |       arsBand:
  150 |         from === month.from && to === month.to ? "stable" : "exposed",
  151 |       arsBandLabel:
  152 |         from === month.from && to === month.to ? "Estable" : "Expuesta",
  153 |     }),
  154 |   );
  155 | 
  156 |   await page.goto("/");
  157 | 
  158 |   let compact = page.locator('[data-testid="sidebar-financial-health"]:visible');
  159 |   await expect(compact).toHaveAttribute("data-status", "ready");
  160 |   await expect(compact).toHaveAttribute("data-formula-version", "fh-v1.0.0");
  161 |   await expect(compact).toHaveAttribute("data-period-from", month.from);
  162 |   await expect(compact).toHaveAttribute("data-period-to", month.to);
  163 | 
  164 |   const ars = compact.getByTestId("sidebar-financial-health-ars");
  165 |   await expect(ars).toHaveAttribute("data-score", "73");
  166 |   await expect(ars).toHaveAttribute("data-band", "stable");
  167 |   await expect(ars).toHaveAttribute("data-confidence", "high");
  168 |   await expect(ars).toContainText("73/100");
  169 |   await expect(ars).toContainText("Estable");
  170 |   await expect(ars).toContainText("Confianza alta");
  171 | 
  172 |   const usd = compact.getByTestId("sidebar-financial-health-usd");
  173 |   await expect(usd).toHaveAttribute("data-score", "not-calculated");
  174 |   await expect(usd).toHaveAttribute("data-status", "insufficient_data");
  175 |   await expect(usd).toContainText("Sin datos suficientes");
  176 |   await expect(usd).toContainText("Confianza insuficiente");
  177 |   await expect(compact).toContainText(
  178 |     "No reemplaza alertas ni calidad de datos",
  179 |   );
  180 | 
  181 |   await page.getByLabel("Seleccionar período").click();
  182 |   await page.getByRole("option", { name: "Trimestre actual" }).click();
  183 | 
  184 |   compact = page.locator('[data-testid="sidebar-financial-health"]:visible');
  185 |   await expect(compact.getByTestId("sidebar-financial-health-ars")).toHaveAttribute(
  186 |     "data-score",
  187 |     "61",
  188 |   );
  189 |   await expect(compact.getByTestId("sidebar-financial-health-ars")).toHaveAttribute(
  190 |     "data-band",
  191 |     "exposed",
  192 |   );
  193 | 
  194 |   await compact.getByTestId("sidebar-financial-health-open").click();
> 195 |   await expect(page.getByTestId("financial-health-section")).toBeVisible();
      |                                                              ^ Error: expect(locator).toBeVisible() failed
  196 |   await expect(page.getByTestId("financial-health-section")).toHaveAttribute(
  197 |     "data-formula-version",
  198 |     "fh-v1.0.0",
  199 |   );
  200 | 
  201 |   await page.setViewportSize({ width: 390, height: 844 });
  202 |   await page.getByRole("button", { name: "Abrir menú" }).click();
  203 |   const mobileCompact = page.locator(
  204 |     '[data-testid="sidebar-financial-health"]:visible',
  205 |   );
  206 |   await expect(mobileCompact).toBeVisible();
  207 |   await expect(mobileCompact.getByTestId("sidebar-financial-health-ars")).toHaveAttribute(
  208 |     "data-score",
  209 |     "61",
  210 |   );
  211 | });
  212 | 
  213 | test("Indicador compacto muestra un estado explícito cuando ninguna moneda es calculable", async ({
  214 |   page,
  215 | }) => {
  216 |   await mockFinancialHealth(page, (from, to) =>
  217 |     healthPayload({
  218 |       from,
  219 |       to,
  220 |       arsScore: null,
  221 |       arsStatus: "insufficient_data",
  222 |       arsBand: "not_calculated",
  223 |       arsBandLabel: "No calculado",
  224 |     }),
  225 |   );
  226 | 
  227 |   await page.goto("/");
  228 | 
  229 |   const compact = page.locator('[data-testid="sidebar-financial-health"]:visible');
  230 |   await expect(compact).toHaveAttribute("data-status", "insufficient_data");
  231 |   await expect(compact).toContainText(
  232 |     "Sin datos suficientes para calcular el indicador",
  233 |   );
  234 |   await expect(compact.getByTestId("sidebar-financial-health-ars")).toContainText(
  235 |     "Sin datos suficientes",
  236 |   );
  237 |   await expect(compact.getByTestId("sidebar-financial-health-usd")).toContainText(
  238 |     "Sin datos suficientes",
  239 |   );
  240 |   await expect(compact.getByTestId("sidebar-financial-health-open")).toBeEnabled();
  241 | });
  242 | 
```