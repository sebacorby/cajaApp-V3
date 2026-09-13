import { expect, test } from "@playwright/test";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:11436";

test("Tarjetas muestra historial navegable y trazabilidad del resumen", async ({
  page,
  request,
}) => {
  const response = await request.get(
    `${API_BASE_URL}/api/card-statements/statements?limit=100&includeArchived=true`,
  );
  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as {
    statements: Array<{
      id: string;
      status: string;
      document: { fileName: string; sha256: string };
    }>;
  };
  await page.goto("/");
  await page.getByRole("button", { name: /^Tarjetas$/i }).click();

  const history = page.getByTestId("card-statement-history");
  await expect(history).toBeVisible();
  await expect(
    history.getByText("Historial de resúmenes", { exact: true }),
  ).toBeVisible();

  if (payload.statements.length === 0) {
    await expect(
      history.getByText(
        "No hay resúmenes que coincidan con la búsqueda y el estado seleccionados.",
        { exact: true },
      ),
    ).toBeVisible();
    return;
  }

  const statement = payload.statements[0];
  const search = history.getByPlaceholder("Banco, tarjeta, período o archivo");
  await search.fill(statement.document.fileName);

  const row = page.getByTestId(`card-statement-history-row-${statement.id}`);
  await expect(row).toBeVisible();
  await expect(
    row.getByText(statement.document.fileName, { exact: false }),
  ).toBeVisible();

  await row.getByRole("button", { name: "Trazabilidad" }).click();
  const traceability = page.getByTestId(
    `card-statement-traceability-${statement.id}`,
  );
  await expect(traceability).toBeVisible();
  await expect(
    traceability.getByText(`SHA-256: ${statement.document.sha256}`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    traceability.getByText("Cadena de versiones", { exact: true }),
  ).toBeVisible();
});
