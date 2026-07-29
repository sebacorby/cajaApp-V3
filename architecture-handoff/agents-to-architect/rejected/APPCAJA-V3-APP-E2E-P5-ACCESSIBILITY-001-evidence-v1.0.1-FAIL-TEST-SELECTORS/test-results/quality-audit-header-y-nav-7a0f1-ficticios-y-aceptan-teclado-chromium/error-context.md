# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: quality-audit.spec.ts >> header y navegación no exponen controles ficticios y aceptan teclado
- Location: tests\quality-audit.spec.ts:94:5

# Error details

```
Error: locator.evaluate: Error: strict mode violation: locator(':focus') resolved to 2 elements:
    1) <nextjs-portal></nextjs-portal> aka locator('nextjs-portal')
    2) <button id="next-logo" aria-haspopup="menu" data-next-mark="true" aria-expanded="false" aria-label="Open Next.js Dev Tools" data-nextjs-dev-tools-button="true" aria-controls="nextjs-dev-tools-menu">…</button> aka getByRole('button', { name: 'Open Next.js Dev Tools' })

Call log:
  - waiting for locator(':focus')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - paragraph [ref=e3]: Cargando preferencias de privacidad…
  - button "Open Next.js Dev Tools" [ref=e9] [cursor=pointer]:
    - img [ref=e10]
  - alert [ref=e13]
```

# Test source

```ts
  9   |   "Conciliación",
  10  |   "Cierres",
  11  |   "Respaldo",
  12  |   "Deuda futura",
  13  |   "Presupuestos",
  14  |   "Objetivos",
  15  |   "Reportes",
  16  |   "Salud financiera",
  17  |   "Asesor IA",
  18  |   "Configuración",
  19  | ];
  20  | 
  21  | const FORBIDDEN_RUNTIME_COPY =
  22  |   /prototipo demo|datos simulados|datos ficticios|fase posterior|fuera del MVP|2 cuentas bancarias conectadas|Actualizar contraseña|Gestionar cuentas|Cerrar sesión|Hello, world!|Próximamente|En desarrollo|Coming soon/i;
  23  | 
  24  | test("todas las secciones funcionales navegan sin promesas ficticias", async ({
  25  |   page,
  26  | }) => {
  27  |   await page.setViewportSize({ width: 1440, height: 900 });
  28  |   await page.goto("/");
  29  | 
  30  |   for (const label of SECTIONS) {
  31  |     const button = page.getByRole("button", { name: label, exact: true });
  32  |     await button.click();
  33  |     await expect(button).toHaveAttribute("aria-current", "page");
  34  |     await expect(page.locator("main")).toBeVisible();
  35  |     await expect(page.locator("main")).not.toContainText(
  36  |       FORBIDDEN_RUNTIME_COPY,
  37  |     );
  38  |   }
  39  | 
  40  |   await expect(
  41  |     page.getByRole("button", {
  42  |       name: /Actualizar contraseña|Gestionar cuentas|Cerrar sesión/i,
  43  |     }),
  44  |   ).toHaveCount(0);
  45  |   await expect(
  46  |     page.getByText("2 cuentas bancarias conectadas", { exact: false }),
  47  |   ).toHaveCount(0);
  48  | });
  49  | 
  50  | test("las quince secciones están disponibles en navegación móvil", async ({
  51  |   page,
  52  | }) => {
  53  |   await page.setViewportSize({ width: 390, height: 844 });
  54  | 
  55  |   for (const label of SECTIONS) {
  56  |     await test.step(`navegar a ${label} en mobile`, async () => {
  57  |       await page.goto("/");
  58  |       await page.getByRole("button", { name: "Abrir menú" }).click();
  59  |       await page.getByRole("button", { name: label, exact: true }).click();
  60  |       await expect(page.locator("main")).toBeVisible();
  61  |       await expect(page.locator("main")).not.toContainText(
  62  |         FORBIDDEN_RUNTIME_COPY,
  63  |       );
  64  |     });
  65  |   }
  66  | });
  67  | 
  68  | test("Cierres y Respaldo exponen controles críticos con nombres accesibles", async ({
  69  |   page,
  70  | }) => {
  71  |   await page.setViewportSize({ width: 1440, height: 900 });
  72  |   await page.goto("/");
  73  | 
  74  |   await page.getByRole("button", { name: "Cierres", exact: true }).click();
  75  |   await expect(page.getByLabel("Mes a cerrar")).toBeVisible();
  76  |   await expect(
  77  |     page.getByRole("button", { name: "Actualizar cierres mensuales" }),
  78  |   ).toBeVisible();
  79  |   await expect(
  80  |     page.getByRole("table", { name: "Historial de cierres mensuales" }),
  81  |   ).toBeVisible();
  82  | 
  83  |   await page.getByRole("button", { name: "Respaldo", exact: true }).click();
  84  |   await expect(page.getByLabel("Etiqueta opcional")).toBeVisible();
  85  |   await expect(page.getByLabel("Seleccionar paquete de respaldo")).toBeVisible();
  86  |   await expect(
  87  |     page.getByRole("button", { name: "Actualizar historial de respaldos" }),
  88  |   ).toBeVisible();
  89  |   await expect(
  90  |     page.getByRole("table", { name: "Historial de respaldos locales" }),
  91  |   ).toBeVisible();
  92  | });
  93  | 
  94  | test("header y navegación no exponen controles ficticios y aceptan teclado", async ({
  95  |   page,
  96  | }) => {
  97  |   await page.setViewportSize({ width: 1440, height: 900 });
  98  |   await page.goto("/");
  99  | 
  100 |   await expect(
  101 |     page.getByRole("button", {
  102 |       name: /notificaciones|campana|login|iniciar sesión|cerrar sesión|actualizar contraseña|gestionar cuentas/i,
  103 |     }),
  104 |   ).toHaveCount(0);
  105 | 
  106 |   await page.keyboard.press("Tab");
  107 |   const focusedTag = await page
  108 |     .locator(":focus")
> 109 |     .evaluate((element) => element.tagName);
      |      ^ Error: locator.evaluate: Error: strict mode violation: locator(':focus') resolved to 2 elements:
  110 |   expect(focusedTag).not.toBe("BODY");
  111 | });
  112 | 
```