"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import type { IncomeSourceRecord } from "@/lib/finance/incomes-api";
import {
  acceptSalaryReceiptDraft,
  importSalaryReceipt,
  listSalaryReceipts,
  reverseSalaryReceipt,
  updateSalaryReceiptDraft,
  type SalaryReceiptDraft,
  type SalaryReceiptItem,
  type SalaryReceiptItemKind,
  type SalaryReceiptPreview,
  type SalaryReceiptRecord,
} from "@/lib/finance/salary-receipts-api";

const ITEM_KIND_LABELS: Record<SalaryReceiptItemKind, string> = {
  earning: "Haber",
  deduction: "Descuento",
  employer_contribution: "Contribución patronal",
  information: "Informativo",
};

function isValidAmountInput(value: string): boolean {
  const compact = value.trim().replace(/\s/g, "");
  return (
    /^\d+(?:[.,]\d{1,2})?$/.test(compact) ||
    /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(compact) ||
    /^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(compact)
  );
}

function emptyItem(index: number): SalaryReceiptItem {
  return {
    id: `manual-${Date.now()}-${index}`,
    displayOrder: index + 1,
    kind: "earning",
    code: null,
    label: "",
    amount: "0.00",
    sourcePage: null,
    originalText: "Agregado manualmente en CajaApp",
    confidence: null,
  };
}

function statusLabel(status: string): string {
  if (status === "accepted") return "Aceptado";
  if (status === "superseded") return "Reemplazado";
  if (status === "reversed") return "Anulado";
  return status;
}

export function SalaryReceiptsPanel({
  sources,
  onAccepted,
}: {
  sources: IncomeSourceRecord[];
  onAccepted: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<SalaryReceiptDraft | null>(null);
  const [preview, setPreview] = useState<SalaryReceiptPreview | null>(null);
  const [receipts, setReceipts] = useState<SalaryReceiptRecord[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [useAsFutureBase, setUseAsFutureBase] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const salarySources = useMemo(
    () => sources.filter((source) => source.kind === "salary"),
    [sources],
  );

  const loadReceipts = useCallback(async () => {
    try {
      setReceipts(await listSalaryReceipts(12));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial de recibos.");
    }
  }, []);

  useEffect(() => {
    void loadReceipts();
  }, [loadReceipts]);

  const resetDraft = useCallback(() => {
    setDraft(null);
    setPreview(null);
    setSelectedSourceId("");
    setUseAsFutureBase(true);
    setError(null);
    setMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const imported = await importSalaryReceipt(file);
      if (!imported.preview) throw new Error("El backend no devolvió un borrador editable.");
      setDraft(imported);
      setPreview(imported.preview);
      const employer = imported.preview.source.employerName.toLocaleLowerCase("es");
      const matching = salarySources.find((source) =>
        (source.employer ?? "").toLocaleLowerCase("es") === employer,
      );
      setSelectedSourceId(matching?.id ?? "");
      setMessage("Recibo interpretado. Revisá los datos antes de aceptarlo.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No se pudo importar el recibo.");
    } finally {
      setUploading(false);
    }
  }, [salarySources]);

  const updateSource = useCallback(
    <K extends keyof SalaryReceiptPreview["source"]>(key: K, value: SalaryReceiptPreview["source"][K]) => {
      setPreview((current) => current ? { ...current, source: { ...current.source, [key]: value } } : current);
    },
    [],
  );

  const updateItem = useCallback((index: number, patch: Partial<SalaryReceiptItem>) => {
    setPreview((current) => {
      if (!current) return current;
      const items = current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      );
      return { ...current, items };
    });
  }, []);

  const addItem = useCallback(() => {
    setPreview((current) => {
      if (!current) return current;
      return { ...current, items: [...current.items, emptyItem(current.items.length)] };
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setPreview((current) => {
      if (!current || current.items.length <= 1) return current;
      const items = current.items
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({ ...item, displayOrder: itemIndex + 1 }));
      return { ...current, items };
    });
  }, []);

  const validatePreview = useCallback((): string | null => {
    if (!preview) return "No hay un borrador para guardar.";
    if (!preview.source.employerName.trim()) return "Ingresá el empleador.";
    if (!preview.source.employeeName.trim()) return "Ingresá el empleado.";
    if (!/^\d{4}-\d{2}$/.test(preview.source.periodMonthKey)) return "Seleccioná un período válido.";
    if (preview.items.some((item) => !item.label.trim())) return "Todos los conceptos deben tener descripción.";
    if (preview.items.some((item) => !isValidAmountInput(item.amount))) {
      return "Ingresá importes válidos, sin valores negativos.";
    }
    return null;
  }, [preview]);

  const saveDraft = useCallback(async (): Promise<SalaryReceiptDraft | null> => {
    if (!draft || !preview) return null;
    const validation = validatePreview();
    if (validation) {
      setError(validation);
      return null;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSalaryReceiptDraft(draft.id, preview);
      setDraft(updated);
      setPreview(updated.preview);
      setMessage("Borrador guardado.");
      return updated;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el borrador.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [draft, preview, validatePreview]);

  const acceptDraft = useCallback(async () => {
    if (!draft || !preview) return;
    setAccepting(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await saveDraft();
      if (!saved) return;
      const accepted = await acceptSalaryReceiptDraft(saved.id, {
        sourceId: selectedSourceId || null,
        useAsFutureBase,
      });
      setMessage(
        `Recibo ${accepted.periodMonthKey} aceptado. El neto ya figura como ingreso real${useAsFutureBase ? " y nueva base proyectada" : ""}.`,
      );
      setDraft(null);
      setPreview(null);
      setSelectedSourceId("");
      if (inputRef.current) inputRef.current.value = "";
      await Promise.all([loadReceipts(), Promise.resolve(onAccepted())]);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "No se pudo aceptar el recibo.");
    } finally {
      setAccepting(false);
    }
  }, [draft, preview, loadReceipts, onAccepted, saveDraft, selectedSourceId, useAsFutureBase]);

  const handleReverse = useCallback(async (receipt: SalaryReceiptRecord) => {
    if (!window.confirm(`¿Anular el recibo de ${receipt.periodMonthKey}? Se eliminará el ingreso generado.`)) return;
    setReversingId(receipt.id);
    setError(null);
    try {
      await reverseSalaryReceipt(receipt.id);
      await Promise.all([loadReceipts(), Promise.resolve(onAccepted())]);
      setMessage("Recibo anulado y movimientos vinculados eliminados.");
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : "No se pudo anular el recibo.");
    } finally {
      setReversingId(null);
    }
  }, [loadReceipts, onAccepted]);

  return (
    <Card className="shadow-sm" data-testid="salary-receipts-panel">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="size-5 text-primary" />
            Recibos de sueldo
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Importá el PDF, revisá los conceptos y convertí el neto en un ingreso real sin duplicarlo.
          </p>
        </div>
        {draft ? (
          <Button variant="ghost" size="sm" onClick={resetDraft} aria-label="Descartar borrador">
            <X className="size-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        {message ? (
          <div className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300" role="status">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}

        {!preview ? (
          <div className="rounded-xl border border-dashed p-7 text-center">
            <Upload className="mx-auto size-9 text-muted-foreground" />
            <p className="mt-3 font-medium">Seleccioná un recibo PDF</p>
            <p className="mt-1 text-sm text-muted-foreground">
              CajaApp extrae los datos; vos los confirmás antes de incorporarlos.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFile}
              data-testid="salary-receipt-file"
            />
            <Button className="mt-4" onClick={() => inputRef.current?.click()} disabled={uploading} data-testid="import-salary-receipt">
              {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              {uploading ? "Interpretando recibo..." : "Importar recibo"}
            </Button>
          </div>
        ) : (
          <div className="space-y-5" data-testid="salary-receipt-preview">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Empleador">
                <Input value={preview.source.employerName} onChange={(event: ChangeEvent<HTMLInputElement>) => updateSource("employerName", event.target.value)} />
              </Field>
              <Field label="CUIT empleador">
                <Input value={preview.source.employerTaxId ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => updateSource("employerTaxId", event.target.value || null)} />
              </Field>
              <Field label="Empleado">
                <Input value={preview.source.employeeName} onChange={(event: ChangeEvent<HTMLInputElement>) => updateSource("employeeName", event.target.value)} />
              </Field>
              <Field label="CUIL empleado">
                <Input value={preview.source.employeeTaxId ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => updateSource("employeeTaxId", event.target.value || null)} />
              </Field>
              <Field label="Período">
                <Input type="month" value={preview.source.periodMonthKey} onChange={(event: ChangeEvent<HTMLInputElement>) => updateSource("periodMonthKey", event.target.value)} />
              </Field>
              <Field label="Fecha de pago">
                <Input type="date" value={preview.source.payDate ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => updateSource("payDate", event.target.value || null)} />
              </Field>
              <Field label="Moneda">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={preview.source.currency}
                  onChange={(event) => updateSource("currency", event.target.value as "ARS" | "USD")}
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </Field>
              <Field label="Archivo">
                <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm" title={draft?.document.fileName}>
                  <span className="truncate">{draft?.document.fileName}</span>
                </div>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <AmountSummary label="Bruto" value={preview.summary.grossAmount} currency={preview.source.currency} />
              <AmountSummary label="Descuentos" value={preview.summary.deductionsAmount} currency={preview.source.currency} />
              <AmountSummary label="Neto a cobrar" value={preview.summary.netAmount} currency={preview.source.currency} emphasized />
            </div>

            {preview.warnings.length > 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
                <p className="font-medium">Revisiones sugeridas</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Conceptos del recibo</p>
                  <p className="text-sm text-muted-foreground">El backend recalcula los totales al guardar el borrador.</p>
                </div>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-2 size-4" />
                  Concepto
                </Button>
              </div>
              <div className="space-y-2">
                {preview.items.map((item, index) => (
                  <div key={item.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[9rem_7rem_minmax(0,1fr)_9rem_2.5rem] md:items-end">
                    <Field label="Tipo">
                      <select
                        className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                        value={item.kind}
                        onChange={(event) => updateItem(index, { kind: event.target.value as SalaryReceiptItemKind })}
                      >
                        {Object.entries(ITEM_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                    <Field label="Código">
                      <Input value={item.code ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => updateItem(index, { code: event.target.value || null })} />
                    </Field>
                    <Field label="Descripción">
                      <Input value={item.label} onChange={(event: ChangeEvent<HTMLInputElement>) => updateItem(index, { label: event.target.value })} />
                    </Field>
                    <Field label="Importe">
                      <Input value={item.amount} inputMode="decimal" onChange={(event: ChangeEvent<HTMLInputElement>) => updateItem(index, { amount: event.target.value })} />
                    </Field>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={preview.items.length <= 1}
                      aria-label={`Eliminar ${item.label || `concepto ${index + 1}`}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Field label="Fuente salarial vinculada">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedSourceId}
                  onChange={(event) => setSelectedSourceId(event.target.value)}
                >
                  <option value="">Crear o detectar automáticamente</option>
                  {salarySources.map((source) => (
                    <option key={source.id} value={source.id}>{source.name}{source.employer ? ` · ${source.employer}` : ""}</option>
                  ))}
                </select>
              </Field>
              <label className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={useAsFutureBase}
                  onChange={(event) => setUseAsFutureBase(event.target.checked)}
                />
                <span>
                  <strong className="block">Usar el neto como nueva base</strong>
                  <span className="text-muted-foreground">La proyección salarial futura partirá de este recibo. El mes importado siempre queda como valor real.</span>
                </span>
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => void saveDraft()} disabled={saving || accepting}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Guardar borrador
              </Button>
              <Button onClick={() => void acceptDraft()} disabled={saving || accepting} data-testid="accept-salary-receipt">
                {accepting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                Aceptar e incorporar
              </Button>
            </div>
          </div>
        )}

        <div className="border-t pt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-medium">Historial reciente</p>
              <p className="text-sm text-muted-foreground">Cada reemplazo conserva su versión y trazabilidad.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void loadReceipts()}>
              <RotateCcw className="mr-2 size-4" />
              Actualizar
            </Button>
          </div>
          {receipts.length > 0 ? (
            <div className="space-y-2">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{receipt.periodMonthKey} · {receipt.employerName}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">v{receipt.version} · {statusLabel(receipt.status)}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {receipt.employeeName} · Neto {formatFinancialAmount(receipt.netAmount, receipt.currency)}
                    </p>
                  </div>
                  {receipt.status === "accepted" && receipt.isActiveForPeriod ? (
                    <Button variant="outline" size="sm" onClick={() => void handleReverse(receipt)} disabled={reversingId === receipt.id}>
                      {reversingId === receipt.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                      Anular
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              Todavía no hay recibos aceptados.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AmountSummary({
  label,
  value,
  currency,
  emphasized = false,
}: {
  label: string;
  value: string;
  currency: "ARS" | "USD";
  emphasized?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${emphasized ? "border-primary/40 bg-primary/5" : "bg-muted/20"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${emphasized ? "text-primary" : ""}`}>{formatFinancialAmount(value, currency)}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
