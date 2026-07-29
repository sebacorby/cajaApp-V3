"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  acceptDebitImport,
  deleteDebitImportDraft,
  getDebitImport,
  listDebitImports,
  previewDebitCsv,
  reverseDebitImport,
  updateDebitImportRow,
  type DebitImportPreview,
  type DebitImportRow,
  type DebitImportSummary,
} from "@/lib/finance/debit-imports-api";
import type { MovementCategory } from "@/lib/finance/movements-api";

interface DebitCsvImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MovementCategory[];
  onAccepted: () => Promise<void> | void;
}

const PREVIEW_PAGE_SIZE = 50;

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: DebitImportSummary["status"]): string {
  if (status === "accepted") return "Aceptada";
  if (status === "reversed") return "Revertida";
  return "Borrador";
}

export function DebitCsvImportSheet({
  open,
  onOpenChange,
  categories,
  onAccepted,
}: DebitCsvImportSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DebitImportPreview | null>(null);
  const [history, setHistory] = useState<DebitImportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [dirtyRowIds, setDirtyRowIds] = useState<Set<string>>(new Set());

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await listDebitImports(20));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refreshHistory();
  }, [open, refreshHistory]);

  const selectedRows = useMemo(
    () =>
      preview?.rows.filter(
        (row) =>
          row.included &&
          row.status === "draft" &&
          !row.validationError &&
          !row.duplicateExisting,
      ) ?? [],
    [preview],
  );

  const totalPages = Math.max(
    1,
    Math.ceil((preview?.rows.length ?? 0) / PREVIEW_PAGE_SIZE),
  );
  const visibleRows = useMemo(() => {
    if (!preview) return [];
    const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    return preview.rows.slice(start, start + PREVIEW_PAGE_SIZE);
  }, [preview, previewPage]);

  const handleFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setMessage(null);
    setErrorMessage(null);
  }, []);

  const analyze = useCallback(async () => {
    if (!file) {
      setErrorMessage("Seleccioná un archivo CSV.");
      return;
    }
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const result = await previewDebitCsv(file);
      setPreview(result);
      setPreviewPage(1);
      setDirtyRowIds(new Set());
      setMessage(
        result.duplicateFile
          ? result.status === "accepted"
            ? "Este archivo ya fue importado y aceptado."
            : "Se recuperó el borrador existente para este archivo."
          : `Se detectaron ${result.rowCount} filas.`,
      );
      await refreshHistory();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo analizar el CSV.",
      );
    } finally {
      setLoading(false);
    }
  }, [file, refreshHistory]);

  const loadImport = useCallback(async (importId: string) => {
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const result = await getDebitImport(importId);
      setPreview(result);
      setPreviewPage(1);
      setDirtyRowIds(new Set());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo abrir la importación.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const patchLocalRow = useCallback(
    (rowId: string, patch: Partial<DebitImportRow>) => {
      setDirtyRowIds((current) => new Set(current).add(rowId));
      setPreview((current) =>
        current
          ? {
              ...current,
              rows: current.rows.map((row) =>
                row.id === rowId ? { ...row, ...patch } : row,
              ),
            }
          : current,
      );
    },
    [],
  );

  const saveRow = useCallback(
    async (row: DebitImportRow) => {
      if (!preview || !row.occurredOn) {
        setErrorMessage("La fila necesita una fecha válida.");
        return;
      }
      setSavingRowId(row.id);
      setErrorMessage(null);
      setMessage(null);
      try {
        const result = await updateDebitImportRow(preview.id, row.id, {
          occurredOn: row.occurredOn,
          description: row.description,
          reference: row.reference,
          movementType: row.movementType,
          currency: row.currency,
          amount: row.amount,
          categoryId: row.category.id,
          included: row.included,
        });
        setPreview(result);
        setDirtyRowIds((current) => {
          const next = new Set(current);
          next.delete(row.id);
          return next;
        });
        setMessage(`Fila ${row.rowNumber} guardada.`);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo guardar la fila.",
        );
      } finally {
        setSavingRowId(null);
      }
    },
    [preview],
  );

  const accept = useCallback(async () => {
    if (!preview) return;
    if (selectedRows.length === 0) {
      setErrorMessage("No hay filas válidas seleccionadas para aceptar.");
      return;
    }
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      let currentPreview = preview;
      for (const row of selectedRows.filter((item) => dirtyRowIds.has(item.id))) {
        if (!row.occurredOn) {
          throw new Error(`La fila ${row.rowNumber} necesita una fecha válida.`);
        }
        currentPreview = await updateDebitImportRow(currentPreview.id, row.id, {
          occurredOn: row.occurredOn,
          description: row.description,
          reference: row.reference,
          movementType: row.movementType,
          currency: row.currency,
          amount: row.amount,
          categoryId: row.category.id,
          included: row.included,
        });
      }
      const acceptedRowIds = currentPreview.rows
        .filter(
          (row) =>
            row.included &&
            row.status === "draft" &&
            !row.validationError &&
            !row.duplicateExisting,
        )
        .map((row) => row.id);
      const result = await acceptDebitImport(
        currentPreview.id,
        acceptedRowIds,
      );
      setPreview(result);
      setMessage(
        `Importación aceptada: ${result.result?.acceptedCount ?? result.acceptedCount} filas, ${result.result?.omittedCount ?? result.omittedCount} omitidas y ${result.result?.rejectedCount ?? result.rejectedCount} rechazadas.`,
      );
      await refreshHistory();
      await onAccepted();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo aceptar la importación.",
      );
    } finally {
      setLoading(false);
    }
  }, [dirtyRowIds, onAccepted, preview, refreshHistory, selectedRows]);

  const removeDraft = useCallback(async () => {
    if (!preview || preview.status !== "draft") return;
    if (!window.confirm(`¿Eliminar el borrador "${preview.fileName}"?`)) return;
    setLoading(true);
    try {
      await deleteDebitImportDraft(preview.id);
      setPreview(null);
      setDirtyRowIds(new Set());
      setFile(null);
      setMessage("Borrador eliminado.");
      await refreshHistory();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo eliminar.",
      );
    } finally {
      setLoading(false);
    }
  }, [preview, refreshHistory]);

  const reverse = useCallback(
    async (item: DebitImportSummary) => {
      if (!window.confirm(`¿Revertir la importación "${item.fileName}"?`)) return;
      setLoading(true);
      setErrorMessage(null);
      try {
        await reverseDebitImport(item.id);
        if (preview?.id === item.id) {
          setPreview(await getDebitImport(item.id));
        }
        await refreshHistory();
        await onAccepted();
        setMessage("Importación revertida. Sus movimientos ya no integran el ledger.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo revertir la importación.",
        );
      } finally {
        setLoading(false);
      }
    },
    [onAccepted, preview?.id, refreshHistory],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-6xl">
        <SheetHeader>
          <SheetTitle>Importar consumos de débito</SheetTitle>
          <SheetDescription>
            Cargá el CSV del banco, revisá las filas detectadas y recién después
            aceptalas. CajaApp no modifica el archivo original.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section className="rounded-xl border p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="debit-csv-file">Archivo CSV</Label>
                <Input
                  id="debit-csv-file"
                  data-testid="debit-csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFile}
                />
              </div>
              <Button
                type="button"
                onClick={() => void analyze()}
                disabled={loading || !file}
                data-testid="analyze-debit-csv"
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 size-4" />
                )}
                Analizar CSV
              </Button>
            </div>
          </section>

          {errorMessage ? (
            <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {message ? (
            <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>{message}</span>
            </div>
          ) : null}

          {preview ? (
            <section className="space-y-4" data-testid="debit-csv-preview">
              <div className="flex flex-col gap-3 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-medium">{preview.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {preview.rowCount} filas · separador{" "}
                    {preview.delimiter === "\t" ? "tabulación" : preview.delimiter} ·
                    encabezado en fila {preview.headerRow}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                    {selectedRows.length} seleccionadas
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                    {preview.rows.filter((row) => row.duplicateExisting).length} duplicadas
                  </span>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">
                    {preview.rows.filter((row) => row.validationError && !row.duplicateExisting).length} con error
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-2">Usar</th>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Descripción</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Moneda</th>
                      <th className="p-2">Importe</th>
                      <th className="p-2">Categoría</th>
                      <th className="p-2">Estado</th>
                      <th className="p-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => {
                      const disabled = !row.editable || row.duplicateExisting;
                      return (
                        <tr
                          key={row.id}
                          className="border-t align-top"
                          data-testid={`debit-row-${row.id}`}
                        >
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={row.included && !row.duplicateExisting}
                              disabled={disabled || Boolean(row.validationError)}
                              onChange={(event) =>
                                patchLocalRow(row.id, {
                                  included: event.target.checked,
                                })
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="date"
                              value={row.occurredOn ?? ""}
                              disabled={disabled}
                              onChange={(event) =>
                                patchLocalRow(row.id, {
                                  occurredOn: event.target.value || null,
                                })
                              }
                              data-testid="debit-row-date"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={row.description}
                              disabled={disabled}
                              onChange={(event) =>
                                patchLocalRow(row.id, {
                                  description: event.target.value,
                                })
                              }
                              data-testid="debit-row-description"
                            />
                            {row.reference ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Ref. {row.reference}
                              </p>
                            ) : null}
                          </td>
                          <td className="p-2">
                            <Select
                              value={row.movementType}
                              disabled={disabled}
                              onValueChange={(value) =>
                                patchLocalRow(row.id, {
                                  movementType: value as "income" | "expense",
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="expense">Egreso</SelectItem>
                                <SelectItem value="income">Ingreso</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Select
                              value={row.currency}
                              disabled={disabled}
                              onValueChange={(value) =>
                                patchLocalRow(row.id, {
                                  currency: value as "ARS" | "USD",
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ARS">ARS</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input
                              value={row.amount}
                              disabled={disabled}
                              onChange={(event) =>
                                patchLocalRow(row.id, {
                                  amount: event.target.value,
                                })
                              }
                              data-testid="debit-row-amount"
                            />
                          </td>
                          <td className="p-2">
                            <Select
                              value={row.category.id ?? "none"}
                              disabled={disabled}
                              onValueChange={(value) =>
                                patchLocalRow(row.id, {
                                  category:
                                    value === "none"
                                      ? { id: null, name: "Sin clasificar" }
                                      : {
                                          id: value,
                                          name:
                                            categories.find(
                                              (category) => category.id === value,
                                            )?.name ?? "Sin clasificar",
                                        },
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin clasificar</SelectItem>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <p className="text-xs">
                              {row.duplicateExisting
                                ? "Duplicada"
                                : row.validationError
                                  ? "Revisar"
                                  : row.status === "accepted"
                                    ? "Aceptada"
                                    : row.status === "omitted"
                                      ? "Omitida"
                                      : "Lista"}
                            </p>
                            {row.validationError ? (
                              <p className="mt-1 max-w-52 text-xs text-rose-700">
                                {row.validationError}
                              </p>
                            ) : null}
                          </td>
                          <td className="p-2">
                            {row.editable ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={savingRowId === row.id}
                                onClick={() => void saveRow(row)}
                                aria-label={`Guardar fila ${row.rowNumber}`}
                              >
                                {savingRowId === row.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Save className="size-4" />
                                )}
                              </Button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={previewPage <= 1}
                    onClick={() => setPreviewPage((value) => value - 1)}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {previewPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={previewPage >= totalPages}
                    onClick={() => setPreviewPage((value) => value + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              ) : null}

              {preview.status === "draft" ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void removeDraft()}
                    disabled={loading}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Eliminar borrador
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void accept()}
                    disabled={loading || selectedRows.length === 0}
                    data-testid="accept-debit-csv"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 size-4" />
                    )}
                    Aceptar {selectedRows.length} filas
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-3 border-t pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-4" />
                <h3 className="font-medium">Historial de importaciones</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void refreshHistory()}
                disabled={historyLoading}
              >
                <RefreshCw
                  className={`size-4 ${historyLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay importaciones CSV.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => void loadImport(item.id)}
                    >
                      <p className="truncate font-medium">{item.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)} · {statusLabel(item.status)} ·{" "}
                        {item.acceptedCount}/{item.rowCount} aceptadas
                      </p>
                    </button>
                    {item.status === "accepted" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void reverse(item)}
                      >
                        <RotateCcw className="mr-2 size-4" />
                        Revertir
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
