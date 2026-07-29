import { expect, test, type Locator, type Page } from "@playwright/test";

const GROUPS = [
  {
    id: "operacion",
    label: "Operación",
    sections: ["dashboard", "movimientos", "ingresos", "tarjetas", "deuda"],
    labels: ["Inicio", "Movimientos", "Ingresos", "Tarjetas", "Deuda futura"],
  },
  {
    id: "ingesta-calidad",
    label: "Ingesta y calidad",
    sections: ["importaciones", "conciliacion"],
    labels: ["Importaciones", "Conciliación"],
  },
  {
    id: "planificacion",
    label: "Planificación",
    sections: ["presupuestos", "objetivos"],
    labels: ["Presupuestos", "Objetivos"],
  },
  {
    id: "analisis",
    label: "Análisis",
    sections: ["reportes", "salud", "asesor"],
    labels: ["Reportes", "Salud financiera", "Asesor IA"],
  },
  {
    id: "sistema",
    label: "Sistema",
    sections: ["cierres", "respaldo", "configuracion"],
    labels: ["Cierres", "Respaldo", "Configuración"],
  },
] as const;

const EXPECTED_SECTIONS = GROUPS.flatMap((group) => group.sections);
const EXPECTED_LABELS = GROUPS.flatMap((group) => group.labels);

async function assertInformationArchitecture(navigation: Locator): Promise<void> {
  await expect(navigation).toHaveAttribute("aria-label", "Navegación principal");

  for (const group of GROUPS) {
    const container = navigation.getByTestId(`sidebar-nav-group-${group.id}`);
    await expect(container).toBeVisible();
    await expect(container).toContainText(group.label);

    const sectionIds = await container
      .locator('[data-testid^="sidebar-nav-item-"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-section-id")));
    expect(sectionIds).toEqual([...group.sections]);
  }

  const allItems = navigation.locator('[data-testid^="sidebar-nav-item-"]');
  await expect(allItems).toHaveCount(15);
  expect(await allItems.allTextContents()).toEqual([...EXPECTED_LABELS]);
  expect(
    await allItems.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-section-id")),
    ),
  ).toEqual([...EXPECTED_SECTIONS]);
}

async function openMobileNavigation(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Abrir menú" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog.getByTestId("sidebar-navigation");
}

test("agrupa las quince secciones sin agregar pasos de navegación", async ({ page }) => {
  await page.goto("/");

  const navigation = page.locator("aside:visible").getByTestId("sidebar-navigation");
  await assertInformationArchitecture(navigation);

  const dashboard = navigation.getByTestId("sidebar-nav-item-dashboard");
  const movements = navigation.getByTestId("sidebar-nav-item-movimientos");
  await expect(dashboard).toHaveAttribute("aria-current", "page");

  await movements.click();
  await expect(movements).toHaveAttribute("aria-current", "page");
  await expect(dashboard).not.toHaveAttribute("aria-current", "page");

  await dashboard.focus();
  await page.keyboard.press("Tab");
  await expect(movements).toBeFocused();
});

test("mantiene la misma arquitectura y cierre de hoja en mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  let navigation = await openMobileNavigation(page);
  await assertInformationArchitecture(navigation);

  await navigation.getByTestId("sidebar-nav-item-configuracion").click();
  await expect(page.getByRole("dialog")).toBeHidden();

  navigation = await openMobileNavigation(page);
  await expect(
    navigation.getByTestId("sidebar-nav-item-configuracion"),
  ).toHaveAttribute("aria-current", "page");
});
