import {
  expect,
  test,
  type Page,
  type Request,
  type Route,
} from "@playwright/test";
import type {
  ReconciliationItem,
  ReconciliationParticipant,
} from "../src/lib/finance/reconciliation-api";

const CASE_ID = "11111111-1111-4111-8111-111111111111";

function participant(role: "left" | "right"): ReconciliationParticipant {
  return {
    id: role === "left" ? "participant-left" : "participant-right",
    role,
    entityKey: role === "left" ? "movement:debit-csv:demo" : "salary-receipt:demo",
    entityType: role === "left" ? "movement" : "salary_receipt",
    sourceType: role === "left" ? "debit_csv" : "salary_receipt",
    sourceId: role === "left" ? "debit-row-demo" : "salary-receipt-demo",
    movementId:
      role === "left"
        ? "debit-csv:debit-row-demo"
        : "income-recurring:salary-source-demo:2026-06",
    description:
      role === "left"
        ? "Acreditación Empresa Demo"
        : "Recibo 2026-06 · Empresa Demo",
    occurredOn: "2026-06-30",
    currency: "ARS",
    amount: "1.162.000,00",
    excluded: false,
    metadata:
      role === "left"
        ? { origen: "Banco Demo", tipo: "income" }
        : { empleador: "Empresa Demo", periodo: "2026-06", version: 1 },
    navigation:
      role === "left"
        ? { section: "movimientos", label: "Abrir en Movimientos" }
        : { section: "ingresos", label: "Abrir en Ingresos" },
  };
}

function reconciliationCase(): ReconciliationItem {
  return {
    id: CASE_ID,
    fingerprint: "a".repeat(64),
    relationType: "salary_deposit",
    status: "open",
    resolution: null,
    confidence: 96,
    title: "Depósito bancario y recibo de sueldo con el mismo neto",
    rationale: [
      "El ingreso bancario coincide exactamente con el neto del recibo.",
      "Las fechas están separadas por 0 día(s).",
      "La sugerencia conserva el recibo como fuente autoritativa.",
    ],
    suggestedResolution: "exclude_left",
    currency: "ARS",
    amount: "1.162.000,00",
    occurredOn: "2026-06-30",
    excludedMovementId: null,
    isCurrent: true,
    lastDetectedAt: "2026-07-16T20:00:00.000Z",
    resolvedAt: null,
    createdAt: "2026-07-16T20:00:00.000Z",
    updatedAt: "2026-07-16T20:00:00.000Z",
    participants: [participant("left"), participant("right")],
  };
}

function response(item: ReturnType<typeof reconciliationCase>) {
  return {
    items: [item],
    summary: {
      total: 1,
      open: item.status === "open" ? 1 : 0,
      resolved: item.status === "resolved" ? 1 : 0,
      dismissed: item.status === "dismissed" ? 1 : 0,
      duplicates: 0,
      relations: 1,
      excluded: item.excludedMovementId ? 1 : 0,
      current: 1,
    },
    filteredSummary: {
      total: 1,
      open: item.status === "open" ? 1 : 0,
      resolved: item.status === "resolved" ? 1 : 0,
      dismissed: item.status === "dismissed" ? 1 : 0,
      duplicates: 0,
      relations: 1,
      excluded: item.excludedMovementId ? 1 : 0,
      current: 1,
    },
    pagination: { limit: 25, offset: 0, total: 1, hasMore: false },
  };
}

test("Conciliación detecta, explica y resuelve una relación entre fuentes", async ({
  page,
}: {
  page: Page;
}) => {
  let item = reconciliationCase();
  let resolutionBody: unknown = null;

  await page.route("**/api/reconciliation**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/scan") && request.method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          range: request.postDataJSON(),
          detected: 1,
          summary: response(item).summary,
          items: [item],
        }),
      });
      return;
    }

    if (url.pathname.endsWith(`/${CASE_ID}/resolve`)) {
      resolutionBody = request.postDataJSON();
      item = {
        ...item,
        status: "resolved",
        resolution: "exclude_left",
        excludedMovementId: item.participants[0].movementId,
        resolvedAt: "2026-07-16T20:05:00.000Z",
        updatedAt: "2026-07-16T20:05:00.000Z",
        participants: item.participants.map((entry) => ({
          ...entry,
          excluded: entry.role === "left",
        })),
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(item),
      });
      return;
    }

    if (url.pathname.endsWith(`/${CASE_ID}/reopen`)) {
      item = reconciliationCase();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(item),
      });
      return;
    }

    if (url.pathname.endsWith(`/${CASE_ID}`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(item),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response(item)),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /^Conciliación$/i }).click();

  await expect(page.getByTestId("reconciliation-section")).toBeVisible();
  await expect(page.getByTestId("reconciliation-summary-open")).toContainText("1");
  await expect(page.getByText("Depósito bancario y recibo de sueldo con el mismo neto")).toBeVisible();
  await expect(page.getByText("96%")).toBeVisible();

  await page
    .getByTestId("reconciliation-case-salary_deposit")
    .getByRole("button", { name: "Revisar" })
    .click();

  const detail = page.getByTestId("reconciliation-detail");
  await expect(detail).toContainText("Acreditación Empresa Demo");
  await expect(detail).toContainText("Recibo 2026-06 · Empresa Demo");
  await expect(detail).toContainText("Por qué se detectó");
  await expect(detail).toContainText("La fuente y su trazabilidad permanecen intactas");
  await expect(
    detail.getByRole("button", { name: "Abrir en Ingresos" }),
  ).toBeVisible();

  await page.getByTestId("reconciliation-exclude-left").click();
  await expect.poll(() => resolutionBody).toEqual({ action: "exclude_left" });
  await expect(page.getByRole("status")).toContainText("ya no se cuenta en Movimientos");
  await expect(detail).toContainText("Excluido del ledger");
  await expect(page.getByTestId("reconciliation-reopen")).toBeVisible();

  await page.getByTestId("reconciliation-reopen").click();
  await expect(page.getByRole("status")).toContainText("volvió a quedar pendiente");

  const scanRequest = page.waitForRequest((request: Request) => {
    const url = new URL(request.url());
    return url.pathname === "/api/reconciliation/scan";
  });
  await page.getByTestId("reconciliation-scan").click();
  await scanRequest;
  await expect(page.getByRole("status")).toContainText("Se detectó 1 caso");

  const filterRequest = page.waitForRequest((request: Request) => {
    const url = new URL(request.url());
    return (
      url.pathname === "/api/reconciliation" &&
      url.searchParams.get("relationType") === "salary_deposit"
    );
  });
  await page
    .getByTestId("reconciliation-relation")
    .selectOption("salary_deposit");
  await filterRequest;

  const searchRequest = page.waitForRequest((request: Request) => {
    const url = new URL(request.url());
    return (
      url.pathname === "/api/reconciliation" &&
      url.searchParams.get("search") === "Empresa Demo"
    );
  });
  await page.getByTestId("reconciliation-search").fill("Empresa Demo");
  await searchRequest;
  await expect(page.getByTestId("reconciliation-list")).toBeVisible();
});
