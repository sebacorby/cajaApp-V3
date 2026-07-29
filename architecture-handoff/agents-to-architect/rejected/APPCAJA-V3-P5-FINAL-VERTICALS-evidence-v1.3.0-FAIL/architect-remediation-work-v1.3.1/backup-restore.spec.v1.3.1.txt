import { expect, test, type Page, type Route } from "@playwright/test";
import type { BackupItem } from "../src/lib/finance/backup-restore-api";

const HASH = "b".repeat(64);

function backupFixture(id: string, kind: BackupItem["kind"], status: BackupItem["status"], fileName: string): BackupItem {
  return {
    id,
    fileName,
    kind,
    status,
    sizeBytes: 4096,
    sha256: HASH,
    manifest: {
      format: "cajaapp-backup-v1",
      createdAt: "2026-07-17T12:34:56.789Z",
      application: "CajaApp V3",
      database: {
        entry: "database.sqlite",
        sha256: "a".repeat(64),
        sizeBytes: 2048,
        integrityCheck: "ok",
        foreignKeyViolations: 0,
        tables: ["MonthClose", "BackupArchive"],
        migrations: ["20260716233000_add_month_close", "20260717001000_add_backup_restore"],
      },
      source: { schemaSha256: HASH, migrationsSha256: HASH, nodeVersion: "v24.18.0" },
    },
    createdAt: "2026-07-17T12:34:56.789Z",
    validatedAt: status === "validated" ? "2026-07-17T12:35:00.000Z" : null,
    restoredAt: status === "restored" ? "2026-07-17T12:40:00.000Z" : null,
  };
}

test("Respaldo crea, valida y restaura con backup previo", async ({ page }: { page: Page }) => {
  const items: BackupItem[] = [];
  let createBody: unknown = null;
  let restoreCalled = false;

  await page.route("**/api/backup-restore**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname === "/api/backup-restore") {
      createBody = request.postDataJSON();
      const created = backupFixture("backup-1", "manual", "created", "cajaapp-v3-2026-07-17T12-34-56-789Z-prueba.cajaapp-backup");
      items.unshift(created);
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) });
      return;
    }
    if (request.method() === "POST" && url.pathname.endsWith("/backup-1/validate")) {
      items[0] = { ...items[0], status: "validated", validatedAt: "2026-07-17T12:35:00.000Z" };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ valid: true, manifest: items[0].manifest, packageSha256: HASH }) });
      return;
    }
    if (request.method() === "POST" && url.pathname === "/api/backup-restore/restore") {
      restoreCalled = true;
      const restored = backupFixture("restored-1", "restored_upload", "restored", "cajaapp-v3-2026-07-17T12-40-00-000Z-restored.cajaapp-backup");
      const safety = backupFixture("safety-1", "pre_restore", "created", "cajaapp-v3-2026-07-17T12-39-59-000Z-before-prueba.cajaapp-backup");
      items.unshift(restored, safety);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ restored: true, backup: restored, preRestoreBackup: safety }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items, activities: [], backupDirectory: "C:\\Users\\Javi\\AppData\\Local\\CajaAppV3\\backups" }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /^Respaldo$/i }).click();
  const section = page.getByTestId("backup-restore-section");
  await expect(section).toBeVisible();
  await page.getByTestId("backup-label").fill("Prueba");
  await page.getByTestId("create-backup").click();
  await expect.poll(() => createBody).toEqual({ label: "Prueba" });
  await expect(section.getByRole("alert")).toContainText("creado correctamente");
  await expect(page.getByTestId("backup-row-backup-1")).toContainText("Manual");

  await page.getByTestId("validate-backup-backup-1").click();
  await expect(section.getByRole("alert")).toContainText("Integridad verificada");
  await expect(page.getByTestId("backup-row-backup-1")).toContainText("Validado");

  page.on("dialog", (dialog) => void dialog.accept());
  await page.getByTestId("restore-backup-input").setInputFiles({
    name: "fixture.cajaapp-backup",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("dummy-package"),
  });
  await page.getByTestId("restore-backup").click();
  await expect.poll(() => restoreCalled).toBe(true);
  await expect(section.getByRole("alert")).toContainText("Respaldo previo");
  await expect(page.getByTestId("backup-row-safety-1")).toContainText("Previo a restauración");
  await expect(page.getByTestId("backup-row-restored-1")).toContainText("Paquete restaurado");
});
