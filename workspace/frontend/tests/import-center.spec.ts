import { expect, test } from "@playwright/test";

const LIST_RESPONSE = {
  items: [
    {
      id: "salary_receipt:11111111-1111-4111-8111-111111111111",
      kind: "salary_receipt",
      entityId: "11111111-1111-4111-8111-111111111111",
      documentId: "21111111-1111-4111-8111-111111111111",
      fileName: "recibo-junio.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      sha256: "a".repeat(64),
      pageCount: 1,
      status: "accepted",
      title: "Recibo 2026-06 · Empresa Demo",
      subtitle: "Persona Demo · recibo-junio.pdf",
      periodKey: "2026-06",
      createdAt: "2026-07-16T10:00:00.000Z",
      updatedAt: "2026-07-16T11:00:00.000Z",
      completedAt: "2026-07-16T11:00:00.000Z",
      requiresAction: false,
      correctionCount: 0,
      version: 1,
      active: true,
      error: null,
      issues: [],
      ai: {
        status: "completed",
        provider: "ollama",
        model: "modelo-demo",
        completedAt: "2026-07-16T11:00:00.000Z",
        warnings: [],
      },
      navigation: { section: "ingresos", label: "Abrir en Ingresos" },
      metadata: {
        empleador: "Empresa Demo",
        empleado: "Persona Demo",
        periodo: "2026-06",
        neto: "1162000.00",
        ingresoReal: true,
        baseFutura: true,
      },
    },
    {
      id: "card_statement:22222222-2222-4222-8222-222222222222",
      kind: "card_statement",
      entityId: "22222222-2222-4222-8222-222222222222",
      documentId: "32222222-2222-4222-8222-222222222222",
      fileName: "tarjeta-julio.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4096,
      sha256: "b".repeat(64),
      pageCount: 3,
      status: "needs_review",
      title: "Resumen de tarjeta pendiente",
      subtitle: "tarjeta-julio.pdf",
      periodKey: null,
      createdAt: "2026-07-16T09:00:00.000Z",
      updatedAt: "2026-07-16T09:30:00.000Z",
      completedAt: "2026-07-16T09:30:00.000Z",
      requiresAction: true,
      correctionCount: 0,
      version: null,
      active: true,
      error: null,
      issues: ["Revisar fecha de cierre"],
      ai: {
        status: "completed",
        provider: "ollama",
        model: "modelo-demo",
        completedAt: "2026-07-16T09:30:00.000Z",
        warnings: ["Revisar fecha de cierre"],
      },
      navigation: { section: "tarjetas", label: "Abrir en Tarjetas" },
      metadata: { banco: "Banco Demo" },
    },
    {
      id: "debit_csv:33333333-3333-4333-8333-333333333333",
      kind: "debit_csv",
      entityId: "33333333-3333-4333-8333-333333333333",
      documentId: null,
      fileName: "movimientos.csv",
      mimeType: "text/csv",
      sizeBytes: null,
      sha256: "c".repeat(64),
      pageCount: null,
      status: "failed",
      title: "Movimientos débito",
      subtitle: "movimientos.csv",
      periodKey: null,
      createdAt: "2026-07-15T10:00:00.000Z",
      updatedAt: "2026-07-15T10:10:00.000Z",
      completedAt: null,
      requiresAction: true,
      correctionCount: 0,
      version: null,
      active: false,
      error: {
        message: "Fecha inválida en una fila",
        stage: "csv_validation",
        details: [],
      },
      issues: [],
      ai: null,
      navigation: { section: "movimientos", label: "Abrir en Movimientos" },
      metadata: { filas: 10, rechazadas: 1 },
    },
  ],
  summary: {
    total: 3,
    processing: 0,
    needsReview: 1,
    accepted: 1,
    failed: 1,
    corrected: 0,
    reversed: 0,
  },
  pagination: {
    limit: 25,
    offset: 0,
    total: 3,
    hasMore: false,
  },
};

test("Centro de importaciones unifica historial, detalle y filtros", async ({
  page,
}) => {
  await page.route("**/api/import-center**", async (route) => {
    const url = new URL(route.request().url());
    const isDetail =
      /\/api\/import-center\/(card_statement|salary_receipt|debit_csv)\//.test(
        url.pathname,
      );
    const body = isDetail
      ? LIST_RESPONSE.items.find((item) =>
          url.pathname.endsWith(item.entityId),
        )
      : LIST_RESPONSE;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /^Importaciones$/i }).click();

  await expect(page.getByTestId("import-center-section")).toBeVisible();
  await expect(page.getByTestId("import-summary-total")).toContainText("3");
  await expect(page.getByTestId("import-summary-review")).toContainText("1");
  await expect(page.getByTestId("import-summary-failed")).toContainText("1");
  await expect(page.getByText("Recibo 2026-06 · Empresa Demo")).toBeVisible();
  await expect(page.getByText("Resumen de tarjeta pendiente")).toBeVisible();
  await expect(page.getByText("Fecha inválida en una fila")).toBeVisible();

  await page
    .getByTestId("import-center-item-salary_receipt")
    .getByRole("button", { name: "Ver detalle" })
    .click();

  const detail = page.getByTestId("import-center-detail");
  await expect(detail).toContainText("Extracción IA");
  await expect(detail).toContainText("ollama");
  await expect(detail).toContainText("recibo-junio.pdf");
  await expect(detail).toContainText("1162000.00");

  const requestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname === "/api/import-center" &&
      url.searchParams.get("kind") === "salary_receipt"
    );
  });
  await page.getByTestId("import-center-kind").selectOption("salary_receipt");
  await requestPromise;

  await page.getByTestId("import-center-search").fill("Empresa Demo");
  await expect(page.getByTestId("import-center-list")).toBeVisible();
});
