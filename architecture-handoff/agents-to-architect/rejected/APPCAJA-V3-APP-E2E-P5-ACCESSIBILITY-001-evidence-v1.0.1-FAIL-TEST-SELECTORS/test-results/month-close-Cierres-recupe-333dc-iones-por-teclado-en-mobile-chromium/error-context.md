# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: month-close.spec.ts >> Cierres recupera errores y conserva acciones por teclado en mobile
- Location: tests\month-close.spec.ts:181:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected substring: "Servicio temporalmente no disponible"
Error: strict mode violation: getByRole('alert') resolved to 2 elements:
    1) <div role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">…</div> aka getByTestId('month-close-section').getByRole('alert')
    2) <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div> aka locator('[id="__next-route-announcer__"]')

Call log:
  - Expect "toContainText" with timeout 30000ms
  - waiting for getByRole('alert')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e14]:
    - banner [ref=e15]:
      - generic [ref=e16]:
        - button "Abrir menú" [active] [ref=e17]:
          - img
        - img [ref=e21]
        - generic [ref=e24]:
          - combobox "Seleccionar período" [ref=e25]:
            - generic: Mes actual
            - img
          - button "Buscar en CajaApp" [ref=e26]:
            - img
          - button "Centro de alertas, sin alertas activas" [ref=e27]:
            - img
          - button "Nuevo" [ref=e28]:
            - img
            - generic [ref=e29]: Nuevo
    - main [ref=e30]:
      - generic [ref=e31]:
        - paragraph [ref=e33]: Snapshots mensuales versionados y reversibles
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]:
              - generic [ref=e37]:
                - img [ref=e38]
                - text: Historial contable local
              - heading "Cierres mensuales" [level=1] [ref=e41]
              - paragraph [ref=e42]: Congelá un snapshot determinístico del mes. Los importes se guardan por moneda y estado, y el cierre se bloquea mientras Conciliación tenga casos actuales abiertos.
            - button "Actualizar cierres mensuales" [ref=e43]:
              - img [ref=e44]
              - text: Actualizar
          - alert [ref=e49]:
            - paragraph [ref=e50]: No se pudieron cargar los cierres. Servicio temporalmente no disponible
            - button "Reintentar carga de cierres" [ref=e51]:
              - img [ref=e52]
              - text: Reintentar carga de cierres
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]:
                - generic [ref=e60]:
                  - text: Mes a cerrar
                  - textbox "Mes a cerrar" [ref=e61]: 2026-06
                - button "Cerrar mes" [ref=e62]:
                  - img [ref=e63]
                  - text: Cerrar mes
              - list "Historial móvil de cierres mensuales" [ref=e67]:
                - listitem [ref=e68]: No se pudieron cargar los cierres.
            - complementary [ref=e69]:
              - generic [ref=e71]:
                - img [ref=e72]
                - text: Seleccioná un cierre para inspeccionar el snapshot.
    - contentinfo [ref=e75]:
      - generic [ref=e76]:
        - paragraph [ref=e77]: © 2026 CajaApp.
        - paragraph [ref=e78]: La información se procesa localmente en tu instalación.
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
  138 |       }),
  139 |     });
  140 |   });
  141 | 
  142 |   await openDesktopSection(page);
  143 | 
  144 |   const table = page.getByRole("table", {
  145 |     name: "Historial de cierres mensuales",
  146 |   });
  147 |   await expect(table).toContainText("Todavía no hay cierres mensuales.");
  148 | 
  149 |   await page.getByLabel("Mes a cerrar").fill("2026-06");
  150 |   await page.getByTestId("create-month-close").click();
  151 |   await expect.poll(() => createBody).toEqual({ monthKey: "2026-06" });
  152 |   await expect(
  153 |     page.getByRole("status").filter({ hasText: "Cierre 2026-06 v1 creado" }),
  154 |   ).toBeVisible();
  155 | 
  156 |   const row = page.getByTestId("month-close-row-2026-06");
  157 |   await expect(row).toContainText("$ 765,44");
  158 |   await expect(row).toContainText("US$ 20,50");
  159 |   await expect(row).toContainText("3");
  160 |   await expect(page.getByTestId("month-close-detail")).toContainText(
  161 |     "Objetivos",
  162 |   );
  163 |   await expect(page.getByTestId("month-close-detail")).toContainText(
  164 |     "Huella aaaaaaaaaaaaaaaa",
  165 |   );
  166 | 
  167 |   let confirmation = "";
  168 |   page.once("dialog", async (dialog) => {
  169 |     confirmation = dialog.message();
  170 |     await dialog.accept();
  171 |   });
  172 |   await page.getByTestId("reopen-2026-06").click();
  173 |   await expect.poll(() => confirmation).toContain("¿Reabrir 2026-06 v1?");
  174 |   await expect(
  175 |     page.getByRole("status").filter({ hasText: "fue reabierto" }),
  176 |   ).toBeVisible();
  177 |   await expect(row).toContainText("Reabierto");
  178 |   await expect(page.getByTestId("reopen-2026-06")).toHaveCount(0);
  179 | });
  180 | 
  181 | test("Cierres recupera errores y conserva acciones por teclado en mobile", async ({
  182 |   page,
  183 | }: {
  184 |   page: Page;
  185 | }) => {
  186 |   let item = closeFixture();
  187 |   let listAttempts = 0;
  188 |   let confirmation = "";
  189 | 
  190 |   await page.route("**/api/month-close**", async (route: Route) => {
  191 |     const request = route.request();
  192 |     const url = new URL(request.url());
  193 | 
  194 |     if (
  195 |       request.method() === "POST" &&
  196 |       url.pathname.endsWith(`/${CLOSE_ID}/reopen`)
  197 |     ) {
  198 |       item = closeFixture("reopened");
  199 |       await route.fulfill({
  200 |         status: 200,
  201 |         contentType: "application/json",
  202 |         body: JSON.stringify(item),
  203 |       });
  204 |       return;
  205 |     }
  206 | 
  207 |     if (url.pathname.endsWith(`/${CLOSE_ID}`)) {
  208 |       await route.fulfill({
  209 |         status: 200,
  210 |         contentType: "application/json",
  211 |         body: JSON.stringify(item),
  212 |       });
  213 |       return;
  214 |     }
  215 | 
  216 |     listAttempts += 1;
  217 |     if (listAttempts === 1) {
  218 |       await route.fulfill({
  219 |         status: 503,
  220 |         contentType: "application/json",
  221 |         body: JSON.stringify({ message: "Servicio temporalmente no disponible" }),
  222 |       });
  223 |       return;
  224 |     }
  225 | 
  226 |     await route.fulfill({
  227 |       status: 200,
  228 |       contentType: "application/json",
  229 |       body: JSON.stringify({
  230 |         items: [item],
  231 |         pagination: { limit: 100, offset: 0, total: 1, hasMore: false },
  232 |       }),
  233 |     });
  234 |   });
  235 | 
  236 |   await openMobileSection(page);
  237 | 
> 238 |   await expect(page.getByRole("alert")).toContainText(
      |                                         ^ Error: expect(locator).toContainText(expected) failed
  239 |     "Servicio temporalmente no disponible",
  240 |   );
  241 |   const retry = page.getByRole("button", {
  242 |     name: "Reintentar carga de cierres",
  243 |   });
  244 |   await retry.focus();
  245 |   await expect(retry).toBeFocused();
  246 |   await page.keyboard.press("Enter");
  247 | 
  248 |   const card = page.getByTestId(`month-close-card-${CLOSE_ID}`);
  249 |   await expect(card).toBeVisible();
  250 |   await expect(card).toContainText("Saldo ARS");
  251 |   await expect(card).toContainText("Saldo USD");
  252 | 
  253 |   const detailButton = page.getByRole("button", {
  254 |     name: "Ver detalle del cierre 2026-06 versión 1",
  255 |   });
  256 |   await detailButton.focus();
  257 |   await expect(detailButton).toBeFocused();
  258 |   await page.keyboard.press("Enter");
  259 |   await expect(page.getByTestId("month-close-detail")).toContainText(
  260 |     "Detalle histórico",
  261 |   );
  262 | 
  263 |   page.once("dialog", async (dialog) => {
  264 |     confirmation = dialog.message();
  265 |     await dialog.accept();
  266 |   });
  267 |   const reopenButton = page.getByRole("button", {
  268 |     name: "Reabrir cierre 2026-06 versión 1",
  269 |   });
  270 |   await reopenButton.focus();
  271 |   await expect(reopenButton).toBeFocused();
  272 |   await page.keyboard.press("Enter");
  273 | 
  274 |   await expect.poll(() => confirmation).toContain("snapshot queda en el historial");
  275 |   await expect(card).toContainText("Reabierto");
  276 | });
  277 | 
```