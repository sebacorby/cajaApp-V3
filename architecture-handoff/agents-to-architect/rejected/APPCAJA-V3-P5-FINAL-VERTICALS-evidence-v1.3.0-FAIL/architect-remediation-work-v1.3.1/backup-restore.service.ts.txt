import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { connectDatabase, disconnectDatabase, prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";

const PACKAGE_VERSION = "cajaapp-backup-v1";
const EXACT_ENTRIES = ["database.sqlite", "manifest.json"] as const;
const REQUIRED_TABLES = [
  "_prisma_migrations",
  "LocalAppSettings",
  "ReconciliationCase",
  "MonthClose",
  "BackupArchive",
  "BackupRestoreActivity",
] as const;

export interface BackupManifest {
  format: typeof PACKAGE_VERSION;
  createdAt: string;
  application: "CajaApp V3";
  database: {
    entry: "database.sqlite";
    sha256: string;
    sizeBytes: number;
    integrityCheck: "ok";
    foreignKeyViolations: number;
    tables: string[];
    migrations: string[];
  };
  source: {
    schemaSha256: string;
    migrationsSha256: string;
    nodeVersion: string;
  };
}

interface ValidationResult {
  manifest: BackupManifest;
  extractedDatabasePath: string;
  packageSha256: string;
  packageSizeBytes: number;
  temporaryDirectory: string;
}

let operationQueue: Promise<void> = Promise.resolve();

async function serialized<T>(work: () => Promise<T>): Promise<T> {
  const previous = operationQueue.catch(() => undefined);
  let release!: () => void;
  operationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function canonicalBackupFileName(date = new Date(), suffix = "manual"): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  const safeSuffix = suffix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "manual";
  return `cajaapp-v3-${stamp}-${safeSuffix}.cajaapp-backup`;
}

function databasePath(): string {
  const value = env.DATABASE_URL.replace(/^file:/, "");
  if (path.isAbsolute(value)) return path.normalize(value);
  return path.resolve(process.cwd(), "prisma", value.replace(/^[./]*/, ""));
}

function schemaPath(): string {
  return path.resolve(process.cwd(), "prisma", "schema.prisma");
}

function migrationsPath(): string {
  return path.resolve(process.cwd(), "prisma", "migrations");
}

function backupDirectory(): string {
  const localAppData = process.env.LOCALAPPDATA?.trim() ||
    path.join(process.env.USERPROFILE?.trim() || os.homedir(), "AppData", "Local");
  return path.join(localAppData, "CajaAppV3", "backups");
}

async function hashFile(filePath: string): Promise<string> {
  return sha256(await fs.readFile(filePath));
}

async function hashDirectory(directory: string): Promise<string> {
  const hash = createHash("sha256");
  async function visit(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(directory, absolute).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        hash.update(`D\0${relative}\0`);
        await visit(absolute);
      } else if (entry.isFile()) {
        hash.update(`F\0${relative}\0`);
        hash.update(await fs.readFile(absolute));
        hash.update("\0");
      }
    }
  }
  await visit(directory);
  return hash.digest("hex");
}

async function runPython(script: string, args: string[], timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(env.PYTHON_EXECUTABLE, ["-c", script, ...args], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new ValidationError("La operación SQLite excedió el tiempo máximo."));
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new ValidationError(`No se pudo ejecutar Python: ${String(error)}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new ValidationError(stderr.trim() || `Python terminó con código ${code}.`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

const SNAPSHOT_SCRIPT = String.raw`
import json, sqlite3, sys
source_path, target_path = sys.argv[1], sys.argv[2]
source = sqlite3.connect(f"file:{source_path}?mode=ro", uri=True)
target = sqlite3.connect(target_path)
try:
    source.backup(target)
    target.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    integrity = target.execute("PRAGMA integrity_check").fetchall()
    foreign_keys = target.execute("PRAGMA foreign_key_check").fetchall()
    tables = sorted(row[0] for row in target.execute("SELECT name FROM sqlite_master WHERE type='table'"))
    migrations = []
    if '_prisma_migrations' in tables:
        migrations = [row[0] for row in target.execute("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name")]
    target.commit()
    print(json.dumps({"integrity": [row[0] for row in integrity], "foreignKeys": len(foreign_keys), "tables": tables, "migrations": migrations}))
finally:
    target.close()
    source.close()
`;

const INSPECT_SCRIPT = String.raw`
import json, sqlite3, sys
path = sys.argv[1]
connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
try:
    integrity = connection.execute("PRAGMA integrity_check").fetchall()
    foreign_keys = connection.execute("PRAGMA foreign_key_check").fetchall()
    tables = sorted(row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'"))
    migrations = []
    if '_prisma_migrations' in tables:
        migrations = [row[0] for row in connection.execute("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name")]
    print(json.dumps({"integrity": [row[0] for row in integrity], "foreignKeys": len(foreign_keys), "tables": tables, "migrations": migrations}))
finally:
    connection.close()
`;

const CREATE_PACKAGE_SCRIPT = String.raw`
import sys, zipfile
package_path, database_path, manifest_path = sys.argv[1:4]
with zipfile.ZipFile(package_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    archive.write(database_path, 'database.sqlite')
    archive.write(manifest_path, 'manifest.json')
`;

const EXTRACT_PACKAGE_SCRIPT = String.raw`
import json, pathlib, sys, zipfile
package_path, output_dir = sys.argv[1:3]
expected = {'database.sqlite', 'manifest.json'}
with zipfile.ZipFile(package_path, 'r') as archive:
    names = archive.namelist()
    normalized = set()
    for name in names:
        pure = pathlib.PurePosixPath(name)
        if pure.is_absolute() or '..' in pure.parts or '\\' in name:
            raise RuntimeError('Entrada insegura en el paquete')
        normalized.add(str(pure))
    if normalized != expected or len(names) != 2:
        raise RuntimeError('El paquete debe contener exactamente database.sqlite y manifest.json')
    for member in names:
        archive.extract(member, output_dir)
print(json.dumps(sorted(normalized)))
`;

function assertInspection(value: unknown): {
  integrity: string[];
  foreignKeys: number;
  tables: string[];
  migrations: string[];
} {
  const inspection = value as {
    integrity?: unknown;
    foreignKeys?: unknown;
    tables?: unknown;
    migrations?: unknown;
  };
  const integrity = Array.isArray(inspection.integrity)
    ? inspection.integrity.map(String)
    : [];
  const foreignKeys = Number(inspection.foreignKeys);
  const tables = Array.isArray(inspection.tables) ? inspection.tables.map(String) : [];
  const migrations = Array.isArray(inspection.migrations)
    ? inspection.migrations.map(String)
    : [];
  if (integrity.length !== 1 || integrity[0] !== "ok") {
    throw new ValidationError(`PRAGMA integrity_check falló: ${integrity.join(", ") || "sin resultado"}.`);
  }
  if (!Number.isInteger(foreignKeys) || foreignKeys !== 0) {
    throw new ValidationError(`PRAGMA foreign_key_check detectó ${foreignKeys} violaciones.`);
  }
  for (const table of REQUIRED_TABLES) {
    if (!tables.includes(table)) throw new ValidationError(`El backup no contiene la tabla requerida ${table}.`);
  }
  return { integrity, foreignKeys, tables, migrations };
}

export function assertBackupManifest(value: unknown): BackupManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("manifest.json no contiene un objeto válido.");
  }
  const manifest = value as Partial<BackupManifest>;
  if (manifest.format !== PACKAGE_VERSION || manifest.application !== "CajaApp V3") {
    throw new ValidationError("Versión o aplicación del backup no soportada.");
  }
  if (!manifest.database || manifest.database.entry !== "database.sqlite") {
    throw new ValidationError("El manifiesto no referencia database.sqlite.");
  }
  if (!/^[a-f0-9]{64}$/.test(manifest.database.sha256 || "")) {
    throw new ValidationError("Checksum SHA-256 de la base inválido.");
  }
  if (!manifest.createdAt || Number.isNaN(Date.parse(manifest.createdAt))) {
    throw new ValidationError("La fecha de creación del manifiesto es inválida.");
  }
  if (!Number.isSafeInteger(manifest.database.sizeBytes) || manifest.database.sizeBytes <= 0) {
    throw new ValidationError("El tamaño declarado de la base es inválido.");
  }
  if (manifest.database.integrityCheck !== "ok" || manifest.database.foreignKeyViolations !== 0) {
    throw new ValidationError("El manifiesto no acredita integridad SQLite y claves foráneas.");
  }
  if (!Array.isArray(manifest.database.tables) || !Array.isArray(manifest.database.migrations)) {
    throw new ValidationError("El manifiesto no contiene inventarios de tablas y migraciones.");
  }
  if (!manifest.source || !/^[a-f0-9]{64}$/.test(manifest.source.schemaSha256 || "") ||
      !/^[a-f0-9]{64}$/.test(manifest.source.migrationsSha256 || "") ||
      typeof manifest.source.nodeVersion !== "string") {
    throw new ValidationError("Checksums de schema o migraciones inválidos.");
  }
  return manifest as BackupManifest;
}

function mapArchive(record: any) {
  return {
    id: record.id,
    fileName: record.fileName,
    kind: record.kind,
    status: record.status,
    sizeBytes: record.sizeBytes,
    sha256: record.sha256,
    manifest: JSON.parse(record.manifestJson) as BackupManifest,
    createdAt: record.createdAt.toISOString(),
    validatedAt: record.validatedAt?.toISOString() ?? null,
    restoredAt: record.restoredAt?.toISOString() ?? null,
  };
}

export class BackupRestoreService {
  async list() {
    const [archives, activities] = await Promise.all([
      prisma.backupArchive.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.backupRestoreActivity.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return {
      items: archives.map(mapArchive),
      activities: activities.map((activity: any) => ({
        id: activity.id,
        backupId: activity.backupId,
        action: activity.action,
        status: activity.status,
        detail: activity.detailJson ? JSON.parse(activity.detailJson) : null,
        createdAt: activity.createdAt.toISOString(),
      })),
      backupDirectory: backupDirectory(),
    };
  }

  async create(label?: string) {
    return serialized(() => this.createUnlocked("manual", label));
  }

  private async createUnlocked(kind: "manual" | "pre_restore", label?: string) {
    const directory = backupDirectory();
    await fs.mkdir(directory, { recursive: true });
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cajaapp-backup-create-"));
    const databaseSnapshot = path.join(tempDirectory, "database.sqlite");
    const manifestPath = path.join(tempDirectory, "manifest.json");
    const fileName = canonicalBackupFileName(new Date(), label || kind);
    const packagePath = path.join(directory, fileName);

    try {
      const inspection = assertInspection(
        JSON.parse(await runPython(SNAPSHOT_SCRIPT, [databasePath(), databaseSnapshot])),
      );
      const databaseBytes = await fs.readFile(databaseSnapshot);
      const manifest: BackupManifest = {
        format: PACKAGE_VERSION,
        createdAt: new Date().toISOString(),
        application: "CajaApp V3",
        database: {
          entry: "database.sqlite",
          sha256: sha256(databaseBytes),
          sizeBytes: databaseBytes.byteLength,
          integrityCheck: "ok",
          foreignKeyViolations: 0,
          tables: inspection.tables,
          migrations: inspection.migrations,
        },
        source: {
          schemaSha256: await hashFile(schemaPath()),
          migrationsSha256: await hashDirectory(migrationsPath()),
          nodeVersion: process.version,
        },
      };
      await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      await runPython(CREATE_PACKAGE_SCRIPT, [packagePath, databaseSnapshot, manifestPath]);
      const packageBytes = await fs.readFile(packagePath);
      const archive = await prisma.backupArchive.create({
        data: {
          fileName,
          storagePath: packagePath,
          kind,
          status: "created",
          sizeBytes: packageBytes.byteLength,
          sha256: sha256(packageBytes),
          manifestJson: JSON.stringify(manifest),
          activities: {
            create: {
              action: "create",
              status: "success",
              detailJson: JSON.stringify({ kind, label: label || null }),
            },
          },
        },
      });
      return mapArchive(archive);
    } finally {
      await fs.rm(tempDirectory, { recursive: true, force: true });
    }
  }

  async download(backupId: string): Promise<{ fileName: string; buffer: Buffer }> {
    return serialized(async () => {
      const record = await prisma.backupArchive.findUnique({ where: { id: backupId } });
      if (!record) throw new NotFoundError("Backup archive");
      const buffer = await fs.readFile(record.storagePath).catch(() => null);
      if (!buffer) throw new ValidationError("El archivo físico del backup ya no está disponible.");
      if (sha256(buffer) !== record.sha256) throw new ValidationError("El archivo almacenado cambió desde su creación.");
      return { fileName: record.fileName, buffer };
    });
  }

  async validateStored(backupId: string) {
    return serialized(async () => {
      const record = await prisma.backupArchive.findUnique({ where: { id: backupId } });
      if (!record) throw new NotFoundError("Backup archive");
      const validated = await this.validatePackage(record.storagePath);
      try {
        await prisma.backupArchive.update({
          where: { id: backupId },
          data: {
            status: "validated",
            validatedAt: new Date(),
            activities: {
              create: { action: "validate", status: "success", detailJson: JSON.stringify({ packageSha256: validated.packageSha256 }) },
            },
          },
        });
        return { valid: true, manifest: validated.manifest, packageSha256: validated.packageSha256 };
      } finally {
        await fs.rm(validated.temporaryDirectory, { recursive: true, force: true });
      }
    });
  }

  private async validatePackage(packagePath: string): Promise<ValidationResult> {
    const packageBytes = await fs.readFile(packagePath).catch(() => null);
    if (!packageBytes) throw new ValidationError("No se pudo leer el paquete de backup.");
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cajaapp-backup-validate-"));
    try {
      const entries = JSON.parse(await runPython(EXTRACT_PACKAGE_SCRIPT, [packagePath, temporaryDirectory])) as string[];
      if (entries.join("|") !== EXACT_ENTRIES.slice().sort().join("|")) {
        throw new ValidationError("Entradas inesperadas en el backup.");
      }
      const extractedDatabasePath = path.join(temporaryDirectory, "database.sqlite");
      const manifest = assertBackupManifest(
        JSON.parse(await fs.readFile(path.join(temporaryDirectory, "manifest.json"), "utf8")),
      );
      const databaseBytes = await fs.readFile(extractedDatabasePath);
      if (databaseBytes.byteLength !== manifest.database.sizeBytes || sha256(databaseBytes) !== manifest.database.sha256) {
        throw new ValidationError("El checksum o tamaño de database.sqlite no coincide con el manifiesto.");
      }
      const inspection = assertInspection(
        JSON.parse(await runPython(INSPECT_SCRIPT, [extractedDatabasePath])),
      );
      if (manifest.source.schemaSha256 !== await hashFile(schemaPath())) {
        throw new ValidationError("El backup fue creado con un schema.prisma diferente al instalado.");
      }
      if (manifest.source.migrationsSha256 !== await hashDirectory(migrationsPath())) {
        throw new ValidationError("El backup fue creado con un conjunto de migraciones diferente al instalado.");
      }
      const inspectedTables = [...inspection.tables].sort();
      const declaredTables = [...manifest.database.tables].map(String).sort();
      if (JSON.stringify(inspectedTables) !== JSON.stringify(declaredTables)) {
        throw new ValidationError("El inventario de tablas no coincide con database.sqlite.");
      }
      const inspectedMigrations = [...inspection.migrations].sort();
      const declaredMigrations = [...manifest.database.migrations].map(String).sort();
      if (JSON.stringify(inspectedMigrations) !== JSON.stringify(declaredMigrations)) {
        throw new ValidationError("El inventario de migraciones no coincide con database.sqlite.");
      }
      return {
        manifest,
        extractedDatabasePath,
        packageSha256: sha256(packageBytes),
        packageSizeBytes: packageBytes.byteLength,
        temporaryDirectory,
      };
    } catch (error) {
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  async restore(originalFileName: string, buffer: Buffer) {
    return serialized(async () => {
      const uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cajaapp-restore-upload-"));
      const uploadedPath = path.join(uploadDirectory, path.basename(originalFileName));
      await fs.writeFile(uploadedPath, buffer);
      await fs.mkdir(backupDirectory(), { recursive: true });
      const persistedFileName = canonicalBackupFileName(new Date(), "restored");
      const persistedPackagePath = path.join(backupDirectory(), persistedFileName);
      let validation: ValidationResult | null = null;
      let safety: ReturnType<typeof mapArchive> | null = null;
      const dbPath = databasePath();
      const originalPath = `${dbPath}.restore-original-${randomUUID()}`;
      const candidatePath = `${dbPath}.restore-candidate-${randomUUID()}`;
      let originalMoved = false;
      let candidateMoved = false;
      let restoreSucceeded = false;

      try {
        validation = await this.validatePackage(uploadedPath);
        await fs.copyFile(uploadedPath, persistedPackagePath);
        safety = await this.createUnlocked("pre_restore", `before-${path.basename(originalFileName, ".cajaapp-backup")}`);
        await fs.copyFile(validation.extractedDatabasePath, candidatePath);
        await disconnectDatabase();
        await fs.rm(`${dbPath}-wal`, { force: true });
        await fs.rm(`${dbPath}-shm`, { force: true });
        await fs.rename(dbPath, originalPath);
        originalMoved = true;
        await fs.rename(candidatePath, dbPath);
        candidateMoved = true;
        await connectDatabase();

        const postInspection = assertInspection(
          JSON.parse(await runPython(INSPECT_SCRIPT, [dbPath])),
        );
        const now = new Date();
        const restoredArchive = await prisma.backupArchive.upsert({
          where: { fileName: persistedFileName },
          create: {
            fileName: persistedFileName,
            storagePath: persistedPackagePath,
            kind: "restored_upload",
            status: "restored",
            sizeBytes: validation.packageSizeBytes,
            sha256: validation.packageSha256,
            manifestJson: JSON.stringify(validation.manifest),
            validatedAt: now,
            restoredAt: now,
          },
          update: { status: "restored", validatedAt: now, restoredAt: now },
        });
        const persistedSafety = await prisma.backupArchive.upsert({
          where: { fileName: safety.fileName },
          create: {
            fileName: safety.fileName,
            storagePath: path.join(backupDirectory(), safety.fileName),
            kind: "pre_restore",
            status: "created",
            sizeBytes: safety.sizeBytes,
            sha256: safety.sha256,
            manifestJson: JSON.stringify(safety.manifest),
          },
          update: {},
        });
        await prisma.backupRestoreActivity.create({
          data: {
            backupId: restoredArchive.id,
            action: "restore",
            status: "success",
            detailJson: JSON.stringify({
              sourceFileName: originalFileName,
              persistedFileName,
              preRestoreBackupId: persistedSafety.id,
              preRestoreFileName: safety.fileName,
              tables: postInspection.tables.length,
            }),
          },
        });
        await fs.rm(originalPath, { force: true });
        originalMoved = false;
        restoreSucceeded = true;
        return {
          restored: true,
          backup: mapArchive(restoredArchive),
          preRestoreBackup: mapArchive(persistedSafety),
        };
      } catch (error) {
        await disconnectDatabase().catch(() => undefined);
        if (candidateMoved) await fs.rm(dbPath, { force: true }).catch(() => undefined);
        if (originalMoved) await fs.rename(originalPath, dbPath).catch(() => undefined);
        await fs.rm(candidatePath, { force: true }).catch(() => undefined);
        await fs.rm(`${dbPath}-wal`, { force: true }).catch(() => undefined);
        await fs.rm(`${dbPath}-shm`, { force: true }).catch(() => undefined);
        await connectDatabase().catch(() => undefined);
        await prisma.backupRestoreActivity.create({
          data: {
            action: "restore",
            status: "failed",
            detailJson: JSON.stringify({ fileName: originalFileName, error: String(error) }),
          },
        }).catch(() => undefined);
        throw error;
      } finally {
        if (validation) await fs.rm(validation.temporaryDirectory, { recursive: true, force: true });
        await fs.rm(uploadDirectory, { recursive: true, force: true });
        if (!restoreSucceeded) await fs.rm(persistedPackagePath, { force: true }).catch(() => undefined);
        await fs.rm(candidatePath, { force: true }).catch(() => undefined);
        await fs.rm(originalPath, { force: true }).catch(() => undefined);
      }
    });
  }
}

export const backupRestoreService = new BackupRestoreService();
