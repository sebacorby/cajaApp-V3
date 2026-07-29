"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  DatabaseBackup,
  Download,
  FileCheck2,
  HardDriveDownload,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  createBackup,
  downloadBackup,
  listBackups,
  restoreBackup,
  validateBackup,
  type BackupItem,
} from "@/lib/finance/backup-restore-api";
import { USER_TIMEZONE } from "@/lib/finance/ui-store";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950";

function dateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: USER_TIMEZONE,
  }).format(new Date(value));
}

function bytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(item: BackupItem): string {
  if (item.status === "restored") return "Restaurado";
  if (item.status === "validated") return "Validado";
  return "Creado";
}

function kindLabel(item: BackupItem): string {
  if (item.kind === "pre_restore") return "Previo a restauración";
  if (item.kind === "restored_upload") return "Paquete restaurado";
  return "Manual";
}

export function RespaldoSection() {
  const [items, setItems] = useState<BackupItem[]>([]);
  const [backupDirectory, setBackupDirectory] = useState("");
  const [label, setLabel] = useState("");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listBackups();
      setItems(response.items);
      setBackupDirectory(response.backupDirectory);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setWorking("create");
    setMessage(null);
    try {
      const created = await createBackup(label.trim() || undefined);
      setLabel("");
      setMessage({
        kind: "success",
        text: `Respaldo ${created.fileName} creado correctamente.`,
      });
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setWorking(null);
    }
  }

  async function handleValidate(item: BackupItem) {
    setWorking(`validate:${item.id}`);
    setMessage(null);
    try {
      await validateBackup(item.id);
      setMessage({
        kind: "success",
        text: `Integridad verificada para ${item.fileName}.`,
      });
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setWorking(null);
    }
  }

  async function handleDownload(item: BackupItem) {
    setWorking(`download:${item.id}`);
    setMessage(null);
    try {
      const result = await downloadBackup(item.id);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage({
        kind: "success",
        text: `Descarga preparada: ${result.fileName}.`,
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setWorking(null);
    }
  }

  async function handleRestore() {
    if (!restoreFile) return;
    const confirmed = window.confirm(
      "La restauración reemplazará la base local. CajaApp generará primero un respaldo automático del estado actual. ¿Continuar?",
    );
    if (!confirmed) return;

    setWorking("restore");
    setMessage(null);
    try {
      const result = await restoreBackup(restoreFile);
      setMessage({
        kind: "success",
        text: `Restauración completada. Respaldo previo: ${result.preRestoreBackup.fileName}.`,
      });
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setWorking(null);
    }
  }

  function actions(item: BackupItem, surface: "desktop" | "mobile") {
    const validating = working === `validate:${item.id}`;
    const downloading = working === `download:${item.id}`;
    return (
      <div className="flex flex-wrap gap-2">
        <button
          data-testid={surface === "desktop" ? `validate-backup-${item.id}` : `validate-backup-mobile-${item.id}`}
          aria-label={`Validar respaldo ${item.fileName}`}
          aria-busy={validating}
          type="button"
          disabled={Boolean(working)}
          onClick={() => void handleValidate(item)}
          className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border p-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900 ${FOCUS_RING}`}
        >
          {validating ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <FileCheck2 aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
        <button
          data-testid={surface === "desktop" ? `download-backup-${item.id}` : `download-backup-mobile-${item.id}`}
          aria-label={`Descargar respaldo ${item.fileName}`}
          aria-busy={downloading}
          type="button"
          disabled={Boolean(working)}
          onClick={() => void handleDownload(item)}
          className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border p-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900 ${FOCUS_RING}`}
        >
          {downloading ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Download aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }

  const retryButton = (
    <button
      data-testid="retry-backups"
      type="button"
      onClick={() => void load()}
      className={`mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-950 dark:text-rose-200 dark:hover:bg-rose-950/30 ${FOCUS_RING}`}
    >
      <RefreshCw aria-hidden="true" className="h-4 w-4" />
      Reintentar carga de respaldos
    </button>
  );

  return (
    <section
      className="space-y-6"
      data-testid="backup-restore-section"
      aria-busy={loading || Boolean(working)}
    >
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between dark:border-slate-800 dark:bg-slate-950">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-400">
            <DatabaseBackup aria-hidden="true" className="h-4 w-4" />
            Protección local de datos
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
            Respaldo y restauración
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Generá paquetes portables con snapshot SQLite consistente,
            manifiesto y checksums. Antes de restaurar se crea automáticamente
            un respaldo de seguridad.
          </p>
          {backupDirectory ? (
            <p className="mt-2 break-all text-xs text-slate-500">
              Destino local: {backupDirectory}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Actualizar historial de respaldos"
          disabled={loading}
          onClick={() => void load()}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900 ${FOCUS_RING}`}
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Actualizar
        </button>
      </header>

      {message ? (
        <div
          role={message.kind === "error" ? "alert" : "status"}
          aria-live={message.kind === "error" ? "assertive" : "polite"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <p>No se pudieron cargar los respaldos. {loadError}</p>
          {retryButton}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <HardDriveDownload aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Crear respaldo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Incluye datos confirmados que todavía estén en WAL.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label
              htmlFor="backup-label"
              className="grid min-w-0 flex-1 gap-1 text-sm font-medium"
            >
              Etiqueta opcional
              <input
                id="backup-label"
                data-testid="backup-label"
                value={label}
                maxLength={80}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Ejemplo: antes de vacaciones"
                className={`min-w-0 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 ${FOCUS_RING}`}
              />
            </label>
            <button
              data-testid="create-backup"
              type="button"
              disabled={Boolean(working)}
              aria-busy={working === "create"}
              onClick={() => void handleCreate()}
              className={`inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 ${FOCUS_RING}`}
            >
              {working === "create" ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <DatabaseBackup aria-hidden="true" className="h-4 w-4" />
              )}
              Crear respaldo
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
              <RotateCcw aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Restaurar paquete</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Sólo se aceptan paquetes compatibles e íntegros con extensión
                .cajaapp-backup.
              </p>
            </div>
          </div>
          <label
            htmlFor="restore-backup-input"
            className="mt-5 grid gap-2 text-sm font-medium"
          >
            Seleccionar paquete de respaldo
            <input
              id="restore-backup-input"
              ref={fileInputRef}
              data-testid="restore-backup-input"
              type="file"
              accept=".cajaapp-backup"
              onChange={(event) =>
                setRestoreFile(event.target.files?.[0] ?? null)
              }
              className={`block w-full rounded-lg border border-amber-300 bg-white p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:font-semibold file:text-amber-900 dark:border-amber-800 dark:bg-slate-950 ${FOCUS_RING}`}
            />
          </label>
          <p className="mt-2 min-h-5 text-xs text-slate-600" aria-live="polite">
            {restoreFile
              ? `Archivo seleccionado: ${restoreFile.name}`
              : "Ningún archivo seleccionado."}
          </p>
          <button
            data-testid="restore-backup"
            type="button"
            disabled={!restoreFile || Boolean(working)}
            aria-busy={working === "restore"}
            onClick={() => void handleRestore()}
            className={`mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
          >
            {working === "restore" ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Upload aria-hidden="true" className="h-4 w-4" />
            )}
            Restaurar con respaldo previo
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b p-5 dark:border-slate-800">
          <h2 className="font-semibold">Historial de respaldos</h2>
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table
            className="min-w-full text-sm"
            aria-label="Historial de respaldos locales"
          >
            <caption className="sr-only">
              Respaldos locales con estado, tamaño, fecha y acciones de validación
              y descarga.
            </caption>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
              <tr>
                <th scope="col" className="px-5 py-3">Archivo</th>
                <th scope="col" className="px-5 py-3">Tipo</th>
                <th scope="col" className="px-5 py-3">Estado</th>
                <th scope="col" className="px-5 py-3">Tamaño</th>
                <th scope="col" className="px-5 py-3">Creado</th>
                <th scope="col" className="px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    role="status"
                    aria-live="polite"
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Cargando respaldos…
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-rose-800"
                  >
                    No se pudieron cargar los respaldos.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Todavía no hay respaldos.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} data-testid={`backup-row-${item.id}`}>
                    <td className="max-w-sm px-5 py-4">
                      <p className="truncate font-medium" title={item.fileName}>
                        {item.fileName}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {item.sha256.slice(0, 16)}…
                      </p>
                    </td>
                    <td className="px-5 py-4">{kindLabel(item)}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                        {statusLabel(item)}
                      </span>
                    </td>
                    <td className="px-5 py-4">{bytes(item.sizeBytes)}</td>
                    <td className="px-5 py-4">{dateTime(item.createdAt)}</td>
                    <td className="px-5 py-4">{actions(item, "desktop")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ul
          className="divide-y dark:divide-slate-800 sm:hidden"
          aria-label="Historial móvil de respaldos locales"
        >
          {loading ? (
            <li
              role="status"
              aria-live="polite"
              className="p-6 text-center text-sm text-slate-500"
            >
              Cargando respaldos…
            </li>
          ) : loadError ? (
            <li className="p-6 text-center text-sm text-rose-800">
              No se pudieron cargar los respaldos.
            </li>
          ) : items.length === 0 ? (
            <li className="p-6 text-center text-sm text-slate-500">
              Todavía no hay respaldos.
            </li>
          ) : (
            items.map((item) => (
              <li
                key={item.id}
                data-testid={`backup-card-${item.id}`}
                className="space-y-4 p-4"
              >
                <div>
                  <p className="break-all font-semibold">{item.fileName}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {item.sha256.slice(0, 16)}…
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Tipo</dt>
                    <dd>{kindLabel(item)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Estado</dt>
                    <dd>{statusLabel(item)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Tamaño</dt>
                    <dd>{bytes(item.sizeBytes)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Creado</dt>
                    <dd>{dateTime(item.createdAt)}</dd>
                  </div>
                </dl>
                {actions(item, "mobile")}
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-950">
        <p className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-600" />
          Integridad y foreign keys
        </p>
        <p className="flex items-center gap-2">
          <FileCheck2 aria-hidden="true" className="h-4 w-4 text-emerald-600" />
          SHA-256 de base y código
        </p>
        <p className="flex items-center gap-2">
          <DatabaseBackup aria-hidden="true" className="h-4 w-4 text-emerald-600" />
          Operaciones serializadas
        </p>
      </div>
    </section>
  );
}
