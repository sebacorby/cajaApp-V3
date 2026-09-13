import { describe, expect, it } from "vitest";
import {
  assertBackupManifest,
  canonicalBackupFileName,
} from "../../src/modules/backup-restore/backup-restore.service.js";

const hash = "a".repeat(64);

describe("backup/restore contract", () => {
  it("creates canonical names with milliseconds and extension", () => {
    expect(canonicalBackupFileName(new Date("2026-07-17T12:34:56.789Z"), "Prueba manual"))
      .toBe("cajaapp-v3-2026-07-17T12-34-56-789Z-prueba-manual.cajaapp-backup");
  });

  it("accepts a strict valid manifest", () => {
    const manifest = assertBackupManifest({
      format: "cajaapp-backup-v1",
      createdAt: "2026-07-17T12:34:56.789Z",
      application: "CajaApp V3",
      database: {
        entry: "database.sqlite",
        sha256: hash,
        sizeBytes: 100,
        integrityCheck: "ok",
        foreignKeyViolations: 0,
        tables: ["MonthClose"],
        migrations: ["20260716233000_add_month_close"],
      },
      source: { schemaSha256: hash, migrationsSha256: hash, nodeVersion: "v24.18.0" },
    });
    expect(manifest.database.entry).toBe("database.sqlite");
  });

  it("rejects invalid checksums and unsupported manifests", () => {
    expect(() => assertBackupManifest({
      format: "cajaapp-backup-v1",
      application: "CajaApp V3",
      database: { entry: "database.sqlite", sha256: "bad" },
      source: { schemaSha256: hash, migrationsSha256: hash },
    })).toThrow(/Checksum/);
    expect(() => assertBackupManifest({ format: "other" })).toThrow(/Versión/);
  });
});
