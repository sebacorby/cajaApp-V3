"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import type {
  CardStatementPreview,
  CardStatementRow,
} from "@/lib/finance/card-statements-api";
import {
  acceptCardImport,
  discardCardImport,
  getCardImportDraft,
  startCardImport,
  waitForCardImport,
  type CardImportStatus,
} from "@/lib/finance/card-import-api";
import { useFinanceUI } from "@/lib/finance/ui-store";

type ImportState = "idle" | "processing" | "preview" | "accepting" | "discarding" | "error";

function displayDate(value: string | null): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function rowDescription(row: CardStatementRow): string {
  return row.referenceRaw?.trim() || row.originalText.trim() || "Movimiento";
}

function issuerPeriod(row: CardStatementRow): string {
  return (
    row.referenceRaw?.trim() ||
    row.dateRaw?.trim() ||
    row.originalText.trim() ||
    "Período sin identificar"
  );
}

function Amount({ row }: { row: CardStatementRow }) {
  return (
    <div className="flex flex-col items-end gap-0.5 tabular-nums">
      {row.amountPesos ? (
        <span className="font-medium text-foreground">
          {formatFinancialAmount(row.amountPesos, "ARS")}
        </span>
      ) : null}
      {row.amountDollars ? (
        <span className="font-medium text-emerald-500">
          {formatFinancialAmount(row.amountDollars, "USD")}
        </span>
      ) : null}
      {!row.amountPesos && !row.amountDollars ? (
        <span className="text-muted-foreground">—</span>
      ) : null}
    </div>
  );
}

export function CardStatementImporter() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingDraftId = useFinanceUI((state) => state.pendingCardStatementDraftId);
  const clearPendingDraft = useFinanceUI((state) => state.clearPendingCardStatementDraft);

  const [state, setState] = useState<ImportState>("idle");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<CardStatementPreview | null>(null);
  const [progress, setProgress] = useState<CardImportStatus["progress"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = (keepSuccess = false) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setDraftId(null);
    setFileName(null);
    setPreview(null);
    setProgress(null);
    setError(null);
    if (!keepSuccess) setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!pendingDraftId) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setState("processing");
    setError(null);
    setDraftId(pendingDraftId);

    void getCardImportDraft(pendingDraftId, controller.signal)
      .then((draft) => {
        setPreview(draft.preview);
        setState("preview");
        clearPendingDraft();
      })
      .catch((caught) => {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "No se pudo abrir la importación pendiente.");
        setState("error");
      });

    return () => controller.abort();
  }, [pendingDraftId, clearPendingDraft]);

  const financialRows = useMemo(() => {
    if (!preview) return [];
    const acceptedTypes = new Set([
      "transaction",
      "tax",
      "charge",
      "group_total",
      "statement_total",
      "consolidated_row",
    ]);
    return preview.rows.filter((row) => acceptedTypes.has(row.rowType));
  }, [preview]);

  const issuerRows = useMemo(
    () => preview?.futureInstallmentsBlock.filter((row) => row.rowType === "future_installment_reference") ?? [],
    [preview],
  );

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Seleccioná un archivo PDF de resumen de tarjeta.");
      setState("error");
      return;
    }

    reset();
    const controller = new AbortController();
    abortRef.current = controller;
    setFileName(file.name);
    setState("processing");

    try {
      const started = await startCardImport(file, controller.signal);
      setDraftId(started.draftId);
      const result = await waitForCardImport(
        started.draftId,
        controller.signal,
        (status) => setProgress(status.progress ?? null),
      );
      setPreview(result);
      setState("preview");
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "No se pudo procesar el resumen.");
      setState("error");
    }
  };

  const handleAccept = async () => {
    if (!draftId || !preview) return;
    setState("accepting");
    setError(null);
    try {
      await acceptCardImport(draftId, preview);
      setSuccess("Resumen consolidado. Pagos de tarjeta fue actualizado con este nuevo punto de partida.");
      reset(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo aceptar el resumen.");
      setState("preview");
    }
  };

  const handleDiscard = async () => {
    if (!draftId) {
      reset();
      return;
    }
    setState("discarding");
    setError(null);
    try {
      await discardCardImport(draftId);
      reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo descartar la importación.");
      setState(preview ? "preview" : "error");
    }
  };

  return (
    <section className="space-y-5" data-testid="card-statement-importer">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tarjetas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Importá un resumen cuando necesites establecer o actualizar el punto de partida. Después de aceptarlo, la información consolidada queda en Importaciones y sus pagos en Pagos de tarjeta.
        </p>
      </div>

      {success ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      {state === "idle" ? (
        <div
          className="flex min-h-[330px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
        >
          <FileUp className="mb-4 size-11 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Importar resumen de tarjeta</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Arrastrá el PDF acá o elegilo desde tu equipo. CajaApp extraerá los datos para que los revises antes de consolidarlos.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button className="mt-5" onClick={() => fileInputRef.current?.click()}>
            Elegir PDF
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Esta pantalla no conserva dashboards ni resúmenes anteriores: su función es únicamente importar y validar.
          </p>
        </div>
      ) : null}

      {state === "processing" ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border bg-card px-6 text-center">
          <Loader2 className="mb-4 size-9 animate-spin text-primary" />
          <h2 className="font-semibold text-foreground">Procesando resumen</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {progress?.message || "Extrayendo y normalizando los datos del PDF…"}
          </p>
          {fileName ? <p className="mt-2 text-xs text-muted-foreground">{fileName}</p> : null}
        </div>
      ) : null}

      {state === "error" ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="font-semibold text-destructive">No pudimos completar la importación</h2>
          <p className="mt-2 text-sm text-destructive/90">{error}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => reset()}>
              <RefreshCcw className="mr-2 size-4" /> Elegir otro PDF
            </Button>
          </div>
        </div>
      ) : null}

      {preview && (state === "preview" || state === "accepting" || state === "discarding") ? (
        <div className="space-y-5">
          <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Emisor</p>
              <p className="mt-1 font-semibold text-foreground">
                {[preview.source.brand, preview.source.bankName].filter(Boolean).join(" · ") || "Sin identificar"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total ARS</p>
              <p className="mt-1 font-semibold text-foreground">
                {preview.summary.totalPesos ? formatFinancialAmount(preview.summary.totalPesos, "ARS") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total USD</p>
              <p className="mt-1 font-semibold text-emerald-500">
                {preview.summary.totalDollars ? formatFinancialAmount(preview.summary.totalDollars, "USD") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vencimiento</p>
              <p className="mt-1 font-semibold text-foreground">{displayDate(preview.summary.currentDueDate)}</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold text-foreground">Datos que se consolidarán</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Revisá consumos, impuestos y cargos. Al aceptar, este resumen pasa a ser la verdad histórica del período.
              </p>
            </div>
            <div className="max-h-[430px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Descripción</th>
                    <th className="px-4 py-2 font-medium">Cuota</th>
                    <th className="px-4 py-2 text-right font-medium">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {financialRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 text-muted-foreground">{displayDate(row.dateIso)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{rowDescription(row)}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{row.rowType.replaceAll("_", " ")}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.installmentRaw || "—"}</td>
                      <td className="px-4 py-3 text-right"><Amount row={row} /></td>
                    </tr>
                  ))}
                  {financialRows.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No se detectaron filas financieras para revisar.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold text-foreground">Cuotas informadas por el emisor</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Se guardan como referencia para validar las proyecciones de CajaApp. No se suman como consumos ni como deuda adicional.
              </p>
            </div>
            {issuerRows.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted-foreground">
                Este resumen no presenta una referencia futura explícita o no pudo identificarse con seguridad.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Período informado</th>
                      <th className="px-4 py-2 text-right font-medium">ARS</th>
                      <th className="px-4 py-2 text-right font-medium">USD</th>
                      <th className="px-4 py-2 font-medium">Página</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuerRows.map((row) => (
                      <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                        <td className="px-4 py-3 font-medium text-foreground">{issuerPeriod(row)}</td>
                        <td className="px-4 py-3 text-right">{row.amountPesos ? formatFinancialAmount(row.amountPesos, "ARS") : "—"}</td>
                        <td className="px-4 py-3 text-right text-emerald-500">{row.amountDollars ? formatFinancialAmount(row.amountDollars, "USD") : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.sourcePage ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={state === "accepting" || state === "discarding"} onClick={() => void handleDiscard()}>
              {state === "discarding" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
              Descartar
            </Button>
            <Button disabled={state === "accepting" || state === "discarding"} onClick={() => void handleAccept()}>
              {state === "accepting" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
              Aceptar resumen
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
