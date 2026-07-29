# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: backup-restore.spec.ts >> Respaldo recupera errores y mantiene acciones accesibles en mobile
- Location: tests\backup-restore.spec.ts:212:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected substring: "Backups temporalmente no disponibles"
Error: strict mode violation: getByRole('alert') resolved to 2 elements:
    1) <div role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">…</div> aka getByTestId('backup-restore-section').getByRole('alert')
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
        - paragraph [ref=e33]: Backup portable y restauración segura de SQLite
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]:
              - generic [ref=e37]:
                - img [ref=e38]
                - text: Protección local de datos
              - heading "Respaldo y restauración" [level=1] [ref=e44]
              - paragraph [ref=e45]: Generá paquetes portables con snapshot SQLite consistente, manifiesto y checksums. Antes de restaurar se crea automáticamente un respaldo de seguridad.
            - button "Actualizar historial de respaldos" [ref=e46]:
              - img [ref=e47]
              - text: Actualizar
          - alert [ref=e52]:
            - paragraph [ref=e53]: No se pudieron cargar los respaldos. Backups temporalmente no disponibles
            - button "Reintentar carga de respaldos" [ref=e54]:
              - img [ref=e55]
              - text: Reintentar carga de respaldos
          - generic [ref=e60]:
            - generic [ref=e61]:
              - generic [ref=e62]:
                - img [ref=e64]
                - generic [ref=e67]:
                  - heading "Crear respaldo" [level=2] [ref=e68]
                  - paragraph [ref=e69]: Incluye datos confirmados que todavía estén en WAL.
              - generic [ref=e70]:
                - generic [ref=e71]:
                  - text: Etiqueta opcional
                  - textbox "Etiqueta opcional" [ref=e72]:
                    - /placeholder: "Ejemplo: antes de vacaciones"
                - button "Crear respaldo" [ref=e73]:
                  - img [ref=e74]
                  - text: Crear respaldo
            - generic [ref=e80]:
              - generic [ref=e81]:
                - img [ref=e83]
                - generic [ref=e86]:
                  - heading "Restaurar paquete" [level=2] [ref=e87]
                  - paragraph [ref=e88]: Sólo se aceptan paquetes compatibles e íntegros con extensión .cajaapp-backup.
              - generic [ref=e89]:
                - text: Seleccionar paquete de respaldo
                - button "Seleccionar paquete de respaldo" [ref=e90]
              - paragraph [ref=e91]: Ningún archivo seleccionado.
              - button "Restaurar con respaldo previo" [disabled] [ref=e92]:
                - img [ref=e93]
                - text: Restaurar con respaldo previo
          - generic [ref=e96]:
            - heading "Historial de respaldos" [level=2] [ref=e98]
            - list "Historial móvil de respaldos locales" [ref=e99]:
              - listitem [ref=e100]: No se pudieron cargar los respaldos.
          - generic [ref=e101]:
            - paragraph [ref=e102]:
              - img [ref=e103]
              - text: Integridad y foreign keys
            - paragraph [ref=e106]:
              - img [ref=e107]
              - text: SHA-256 de base y código
            - paragraph [ref=e111]:
              - img [ref=e112]
              - text: Operaciones serializadas
    - contentinfo [ref=e118]:
      - generic [ref=e119]:
        - paragraph [ref=e120]: © 2026 CajaApp.
        - paragraph [ref=e121]: La información se procesa localmente en tu instalación.
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
  207 |   await expect(page.getByTestId("backup-row-restored-1")).toContainText(
  208 |     "Paquete restaurado",
  209 |   );
  210 | });
  211 | 
  212 | test("Respaldo recupera errores y mantiene acciones accesibles en mobile", async ({
  213 |   page,
  214 | }: {
  215 |   page: Page;
  216 | }) => {
  217 |   const item = backupFixture(
  218 |     "backup-mobile",
  219 |     "manual",
  220 |     "created",
  221 |     "respaldo-mobile.cajaapp-backup",
  222 |   );
  223 |   const items: BackupItem[] = [item];
  224 |   let listAttempts = 0;
  225 |   let restoreCalled = false;
  226 |   let dismissedConfirmation = "";
  227 |   let acceptedConfirmation = "";
  228 | 
  229 |   await page.route("**/api/backup-restore**", async (route: Route) => {
  230 |     const request = route.request();
  231 |     const url = new URL(request.url());
  232 | 
  233 |     if (
  234 |       request.method() === "POST" &&
  235 |       url.pathname.endsWith("/backup-mobile/validate")
  236 |     ) {
  237 |       items[0] = {
  238 |         ...items[0],
  239 |         status: "validated",
  240 |         validatedAt: "2026-07-17T12:35:00.000Z",
  241 |       };
  242 |       await route.fulfill({
  243 |         status: 200,
  244 |         contentType: "application/json",
  245 |         body: JSON.stringify({
  246 |           valid: true,
  247 |           manifest: items[0].manifest,
  248 |           packageSha256: HASH,
  249 |         }),
  250 |       });
  251 |       return;
  252 |     }
  253 | 
  254 |     if (
  255 |       request.method() === "POST" &&
  256 |       url.pathname === "/api/backup-restore/restore"
  257 |     ) {
  258 |       restoreCalled = true;
  259 |       const restored = backupFixture(
  260 |         "restored-mobile",
  261 |         "restored_upload",
  262 |         "restored",
  263 |         "restored-mobile.cajaapp-backup",
  264 |       );
  265 |       const safety = backupFixture(
  266 |         "safety-mobile",
  267 |         "pre_restore",
  268 |         "created",
  269 |         "safety-mobile.cajaapp-backup",
  270 |       );
  271 |       items.unshift(restored, safety);
  272 |       await route.fulfill({
  273 |         status: 200,
  274 |         contentType: "application/json",
  275 |         body: JSON.stringify({
  276 |           restored: true,
  277 |           backup: restored,
  278 |           preRestoreBackup: safety,
  279 |         }),
  280 |       });
  281 |       return;
  282 |     }
  283 | 
  284 |     listAttempts += 1;
  285 |     if (listAttempts === 1) {
  286 |       await route.fulfill({
  287 |         status: 503,
  288 |         contentType: "application/json",
  289 |         body: JSON.stringify({ message: "Backups temporalmente no disponibles" }),
  290 |       });
  291 |       return;
  292 |     }
  293 | 
  294 |     await route.fulfill({
  295 |       status: 200,
  296 |       contentType: "application/json",
  297 |       body: JSON.stringify({
  298 |         items,
  299 |         activities: [],
  300 |         backupDirectory: "C:\\Users\\Javi\\AppData\\Local\\CajaAppV3\\backups",
  301 |       }),
  302 |     });
  303 |   });
  304 | 
  305 |   await openMobileSection(page);
  306 | 
> 307 |   await expect(page.getByRole("alert")).toContainText(
      |                                         ^ Error: expect(locator).toContainText(expected) failed
  308 |     "Backups temporalmente no disponibles",
  309 |   );
  310 |   const retry = page.getByRole("button", {
  311 |     name: "Reintentar carga de respaldos",
  312 |   });
  313 |   await retry.focus();
  314 |   await expect(retry).toBeFocused();
  315 |   await page.keyboard.press("Enter");
  316 | 
  317 |   const card = page.getByTestId("backup-card-backup-mobile");
  318 |   await expect(card).toBeVisible();
  319 |   await expect(card).toContainText("Manual");
  320 | 
  321 |   const validateButton = page.getByRole("button", {
  322 |     name: "Validar respaldo respaldo-mobile.cajaapp-backup",
  323 |   });
  324 |   await validateButton.focus();
  325 |   await expect(validateButton).toBeFocused();
  326 |   await page.keyboard.press("Enter");
  327 |   await expect(card).toContainText("Validado");
  328 |   await expect(
  329 |     page.getByRole("button", {
  330 |       name: "Descargar respaldo respaldo-mobile.cajaapp-backup",
  331 |     }),
  332 |   ).toBeVisible();
  333 | 
  334 |   const fileInput = page.getByLabel("Seleccionar paquete de respaldo");
  335 |   await fileInput.setInputFiles({
  336 |     name: "fixture-mobile.cajaapp-backup",
  337 |     mimeType: "application/octet-stream",
  338 |     buffer: Buffer.from("dummy-package"),
  339 |   });
  340 |   await expect(
  341 |     page.getByText("Archivo seleccionado: fixture-mobile.cajaapp-backup"),
  342 |   ).toBeVisible();
  343 | 
  344 |   page.once("dialog", async (dialog) => {
  345 |     dismissedConfirmation = dialog.message();
  346 |     await dialog.dismiss();
  347 |   });
  348 |   const restoreButton = page.getByRole("button", {
  349 |     name: "Restaurar con respaldo previo",
  350 |   });
  351 |   await restoreButton.focus();
  352 |   await expect(restoreButton).toBeFocused();
  353 |   await page.keyboard.press("Enter");
  354 |   await expect.poll(() => dismissedConfirmation).toContain(
  355 |     "reemplazará la base local",
  356 |   );
  357 |   expect(restoreCalled).toBe(false);
  358 | 
  359 |   page.once("dialog", async (dialog) => {
  360 |     acceptedConfirmation = dialog.message();
  361 |     await dialog.accept();
  362 |   });
  363 |   await page.keyboard.press("Enter");
  364 |   await expect.poll(() => acceptedConfirmation).toContain(
  365 |     "respaldo automático",
  366 |   );
  367 |   await expect.poll(() => restoreCalled).toBe(true);
  368 |   await expect(page.getByTestId("backup-card-safety-mobile")).toContainText(
  369 |     "Previo a restauración",
  370 |   );
  371 | });
  372 | 
```