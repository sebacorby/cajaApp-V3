import { expect, test } from "@playwright/test";




const SECTIONS = [
  "Inicio",
  "Movimientos",
  "Ingresos",
  "Tarjetas",
  "Deuda futura",
  "Presupuestos",
  "Objetivos",
  "Reportes",
  "Salud financiera",
  "Asesor IA",
  "Configuración",
];




const FORBIDDEN_RUNTIME_COPY =
  /prototipo demo|datos simulados|datos ficticios|fase posterior|fuera del MVP|2 cuentas bancarias conectadas|Actualizar contraseña|Gestionar cuentas|Cerrar sesión|Hello, world!|Próximamente|En desarrollo|Coming soon/i;




test("todas las secciones funcionales navegan sin promesas ficticias", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");




  for (const label of SECTIONS) {
    const button = page.getByRole("button", { name: label, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-current", "page");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main")).not.toContainText(
      FORBIDDEN_RUNTIME_COPY,
    );
  }




  await expect(
    page.getByRole("button", {
      name: /Actualizar contraseña|Gestionar cuentas|Cerrar sesión/i,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText("2 cuentas bancarias conectadas", { exact: false }),
  ).toHaveCount(0);
});




test("las once secciones están disponibles en navegación móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });




  for (const label of SECTIONS) {
    await test.step(`navegar a ${label} en mobile`, async () => {
      await page.goto("/");
      await page.getByRole("button", { name: "Abrir menú" }).click();
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main")).not.toContainText(
        FORBIDDEN_RUNTIME_COPY,
      );
    });
  }
});




test("header y navegación no exponen controles ficticios y aceptan teclado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");




  await expect(
    page.getByRole("button", {
      name: /notificaciones|campana|login|iniciar sesión|cerrar sesión|actualizar contraseña|gestionar cuentas/i,
    }),
  ).toHaveCount(0);




  await page.keyboard.press("Tab");
  const focusedTag = await page
    .locator(":focus")
    .evaluate((element) => element.tagName);
  expect(focusedTag).not.toBe("BODY");
});