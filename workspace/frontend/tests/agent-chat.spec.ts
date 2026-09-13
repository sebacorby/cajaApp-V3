import { expect, test } from "@playwright/test";

const API_BASE_URL = process.env.CAJAAPP_API_BASE_URL ?? "http://127.0.0.1:11436";

test("Agente IA: launcher global, minimizar/reabrir y mobile", async ({ page }) => {
  await page.route(`${API_BASE_URL}/api/agent/conversations**`, async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        id: "11111111-1111-4111-8111-111111111111", title: "Nuevo chat", status: "active",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), archivedAt: null,
      }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], nextCursor: null }) });
  });

  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Abrir Agente IA" });
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute("data-testid", "agent-launcher");
  await launcher.click();
  await expect(page.getByTestId("agent-chat-panel")).toBeVisible();
  await expect(page.getByText("¿Qué querés hacer?")).toBeVisible();

  await page.getByRole("button", { name: "Minimizar Agente IA" }).click();
  await expect(page.getByTestId("agent-chat-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir Agente IA" }).click();
  await expect(page.getByTestId("agent-chat-panel")).toBeVisible();

  await page.getByRole("button", { name: /^Movimientos$/ }).click();
  await expect(page.getByTestId("agent-chat-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar Agente IA" })).toBeVisible();

  await page.getByRole("button", { name: "Cerrar Agente IA" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir Agente IA" }).click();
  const mobilePanel = page.getByTestId("agent-chat-panel");
  await expect(mobilePanel).toBeVisible();
  await expect(mobilePanel).toHaveAttribute("data-mobile", "true");
  await expect(page.getByRole("textbox", { name: "Mensaje para Agente IA" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar Agente IA" }).click();
  await expect(page.getByRole("button", { name: "Abrir Agente IA" })).toBeVisible();
});
