"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteRowsButton } from "@/components/finance/transactions/DeleteRowsButton";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  fetchFutureDebt,
  type FutureDebtCard,
  type FutureDebtMonth,
  type FutureDebtPendingRow,
  type FutureDebtResponse,
  type FutureDebtRow,
} from "@/lib/finance/future-debt-api";
import { cn } from "@/lib/utils";

const HORIZON_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] as const;
type HorizonOption = (typeof HORIZON_OPTIONS)[number];

const CHECKBOX_CLASS =
  "size-4 border-2 border-slate-500 bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary";

function formatMonthLabel(months: number): string {
  return `${months} ${months === 1 ? "mes" : "meses"}`;
}

function formatAmount(value: string, currency: "ARS" | "USD"): string {
  return formatFinancialAmount(value, currency);
}

function areAllSelected(ids: readonly string[], selectedIds: Set<string>): boolean {
  return ids.length > 0 && ids.every((id) => selectedIds.has(id));
}

function scopeIds(rows: readonly { id: string }[]): string[] {
  return rows.map((row) => row.id);
}

function SummaryChips({ summary }: { summary: FutureDebtResponse["summary"] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm"
        data-testid="future-debt-summary-ars"
        data-currency="ARS"
      >
        <span className="font-medium text-foreground">ARS</span>
        <span className="font-semibold tabular-nums text-foreground">
          {formatAmount(summary.ars, "ARS")}
        </span>
      </div>
      <div
        className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm"
        data-testid="future-debt-summary-usd"
        data-currency="USD"
      >
        <span className="font-medium text-foreground">USD</span>
        <span className="font-semibold tabular-nums text-emerald-800">
          {formatAmount(summary.usd, "USD")}
        </span>
      </div>
    </div>
  );
}

function FutureDebtEmpty() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center"
      data-testid="future-debt-empty"
    >
      <p className="text-sm font-medium text-foreground">
        No hay deuda futura confirmada para el horizonte seleccionado
      </p>
      <p className="text-xs text-slate-600">
        Las cuotas confirmadas aparecerán acá cuando existan períodos futuros persistidos.
      </p>
    </div>
  );
}

interface DebtRowProps {
  row: FutureDebtRow;
  checked: boolean;
  onToggle: (id: string) => void;
}

function DebtRow({ row, checked, onToggle }: DebtRowProps) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30" data-testid="future-debt-row">
      <td className="w-10 px-3 py-2">
        <Checkbox
          checked={checked}
          onCheckedChange={() => onToggle(row.id)}
          aria-label={`Seleccionar fila ${row.description}`}
          className={CHECKBOX_CLASS}
        />
      </td>
      <td className="px-3 py-2">
        <div className="font-medium text-foreground">{row.description}</div>
        {row.cardLabel ? (
          <div className="text-xs text-slate-600">{row.cardLabel}</div>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-foreground">
        {row.installmentLabel}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums",
          row.currency === "USD" ? "text-emerald-800" : "text-foreground",
        )}
      >
        {formatAmount(row.amount, row.currency)}
      </td>
      <td className="px-3 py-2 text-xs font-medium text-slate-700">{row.sourceLabel}</td>
      <td className="px-3 py-2">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
            row.status === "confirmed"
              ? "bg-emerald-100 text-emerald-900"
              : "bg-amber-100 text-amber-950",
          )}
        >
          {row.status === "confirmed" ? "Confirmado" : "Estimado"}
        </span>
      </td>
    </tr>
  );
}

interface CardProps {
  card: FutureDebtCard;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleScope: (ids: readonly string[]) => void;
}

function FutureDebtCardPanel({ card, selectedIds, onToggleRow, onToggleScope }: CardProps) {
  const cardRowIds = useMemo(() => scopeIds(card.rows), [card.rows]);
  const cardSelected = areAllSelected(cardRowIds, selectedIds);

  return (
    <div className="overflow-hidden rounded-lg border" data-testid="future-debt-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={cardSelected}
            onCheckedChange={() => onToggleScope(cardRowIds)}
            aria-label={`Seleccionar filas de ${card.cardLabel}`}
            className={CHECKBOX_CLASS}
          />
          <div>
            <div className="font-semibold text-foreground">{card.cardLabel}</div>
            <div className="text-xs text-slate-600">{card.holderName}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span data-testid="future-debt-card-total-ars" data-currency-ars={card.totals.ars}>
            <span className="font-medium text-slate-700">ARS: </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatAmount(card.totals.ars, "ARS")}
            </span>
          </span>
          <span data-testid="future-debt-card-total-usd" data-currency-usd={card.totals.usd}>
            <span className="font-medium text-slate-700">USD: </span>
            <span className="font-semibold tabular-nums text-emerald-800">
              {formatAmount(card.totals.usd, "USD")}
            </span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-muted/20 text-left text-xs text-slate-700">
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2 font-semibold">Descripción</th>
              <th className="px-3 py-2 text-right font-semibold">Cuota</th>
              <th className="px-3 py-2 text-right font-semibold">Monto</th>
              <th className="px-3 py-2 font-semibold">Origen</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {card.rows.map((row) => (
              <DebtRow
                key={row.id}
                row={row}
                checked={selectedIds.has(row.id)}
                onToggle={onToggleRow}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface MonthProps {
  month: FutureDebtMonth;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleScope: (ids: readonly string[]) => void;
}

function FutureDebtMonthPanel({ month, selectedIds, onToggleRow, onToggleScope }: MonthProps) {
  return (
    <section
      className="overflow-hidden rounded-xl border bg-background"
      data-testid="future-debt-month"
      data-month-key={month.monthKey}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground">{month.label}</h3>
          {month.dataQuality.status === "partial" ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">
              Datos incompletos
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span data-testid="future-debt-month-total-ars">
            <span className="font-medium text-slate-700">ARS: </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatAmount(month.totals.ars, "ARS")}
            </span>
          </span>
          <span data-testid="future-debt-month-total-usd">
            <span className="font-medium text-slate-700">USD: </span>
            <span className="font-semibold tabular-nums text-emerald-800">
              {formatAmount(month.totals.usd, "USD")}
            </span>
          </span>
        </div>
      </div>
      <div className="space-y-3 p-3">
        {month.cards.map((card) => (
          <FutureDebtCardPanel
            key={card.cardId}
            card={card}
            selectedIds={selectedIds}
            onToggleRow={onToggleRow}
            onToggleScope={onToggleScope}
          />
        ))}
      </div>
    </section>
  );
}

interface PendingProps {
  rows: FutureDebtPendingRow[];
  diagnostics: string[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleScope: (ids: readonly string[]) => void;
}

function FutureDebtPending({ rows, diagnostics, selectedIds, onToggleRow, onToggleScope }: PendingProps) {
  const pendingIds = useMemo(() => scopeIds(rows), [rows]);
  const allPendingSelected = areAllSelected(pendingIds, selectedIds);

  if (rows.length === 0) return null;

  return (
    <section
      className="overflow-hidden rounded-xl border border-amber-300 bg-amber-50/40"
      data-testid="future-debt-pendientes"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-300 bg-amber-100/70 px-4 py-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={allPendingSelected}
            onCheckedChange={() => onToggleScope(pendingIds)}
            aria-label="Seleccionar todas las filas pendientes"
            className={CHECKBOX_CLASS}
          />
          <div>
            <h3 className="font-semibold text-amber-950">Pendientes de clasificar</h3>
            <p className="text-xs font-medium text-amber-900">
              Estas filas no se suman como deuda confirmada hasta resolver su referencia.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-950">
          {rows.length} {rows.length === 1 ? "fila" : "filas"}
        </span>
      </div>

      <div className="divide-y divide-amber-200">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid gap-2 px-4 py-3 md:grid-cols-[32px_1fr_auto] md:items-center"
            data-testid="future-debt-pending-row"
          >
            <Checkbox
              checked={selectedIds.has(row.id)}
              onCheckedChange={() => onToggleRow(row.id)}
              aria-label={`Seleccionar fila pendiente ${row.description}`}
              className={CHECKBOX_CLASS}
            />
            <div className="min-w-0">
              <div className="font-semibold text-foreground">{row.description}</div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-700">
                <span>{row.monthKey}</span>
                <span>{row.installmentLabel}</span>
                <span>{row.sourceLabel}</span>
              </div>
              <div className="mt-1 text-xs font-semibold text-amber-950">
                {row.diagnostic}: {row.diagnosticDetail}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold tabular-nums text-foreground">
                {row.currency ? formatAmount(row.amount, row.currency) : row.amount}
              </div>
              <span className="inline-flex rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-950">
                {row.diagnostic}
              </span>
            </div>
          </div>
        ))}
      </div>

      {diagnostics.length > 0 ? (
        <div className="border-t border-amber-300 px-4 py-2 text-xs font-medium text-amber-950">
          {diagnostics.join(" · ")}
        </div>
      ) : null}
    </section>
  );
}

function FutureDebtDiagnostics({ diagnostics }: { diagnostics: FutureDebtResponse["diagnostics"] }) {
  const hasIssues =
    diagnostics.duplicateOccurrences > 0 ||
    diagnostics.invalidInstallmentRows > 0 ||
    diagnostics.missingCurrencyRows > 0 ||
    diagnostics.missingCardRows > 0 ||
    diagnostics.warnings.length > 0;

  if (!hasIssues) return null;

  return (
    <section
      className="rounded-xl border border-blue-300 bg-blue-50/50 p-4 text-sm"
      data-testid="future-debt-diagnostics"
    >
      <h4 className="font-semibold text-blue-950">Diagnósticos de integridad</h4>
      <div className="mt-2 grid gap-1 text-xs font-medium text-blue-950 sm:grid-cols-2 lg:grid-cols-4">
        <span>Duplicados: {diagnostics.duplicateOccurrences}</span>
        <span>Cuotas inválidas: {diagnostics.invalidInstallmentRows}</span>
        <span>Moneda faltante: {diagnostics.missingCurrencyRows}</span>
        <span>Tarjeta faltante: {diagnostics.missingCardRows}</span>
      </div>
      {diagnostics.warnings.length > 0 ? (
        <div className="mt-2 text-xs text-blue-900">{diagnostics.warnings.join(" · ")}</div>
      ) : null}
    </section>
  );
}

export function FutureDebtView() {
  const queryClient = useQueryClient();
  const [horizonOption, setHorizonOption] = useState<HorizonOption>(6);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const query = useQuery({
    queryKey: ["future-debt", horizonOption],
    queryFn: ({ signal }) =>
      fetchFutureDebt(
        {
          months: horizonOption,
          includeCurrentPeriod: false,
        },
        signal,
      ),
  });

  const data = query.data;

  const allRowIds = useMemo(() => {
    if (!data) return [];
    return [
      ...data.months.flatMap((month) =>
        month.cards.flatMap((card) => card.rows.map((row) => row.id)),
      ),
      ...data.pendientes.rows.map((row) => row.id),
    ];
  }, [data]);

  const allSelected = areAllSelected(allRowIds, selectedIds);

  const handleToggleRow = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleScope = useCallback((ids: readonly string[]) => {
    if (ids.length === 0) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      const scopeSelected = ids.every((id) => current.has(id));
      for (const id of ids) {
        if (scopeSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const handleHorizonChange = useCallback((value: string) => {
    const months = Number(value) as HorizonOption;
    if (!HORIZON_OPTIONS.includes(months)) return;
    setSelectedIds(new Set());
    setHorizonOption(months);
  }, []);

  const handleDeleted = useCallback(() => {
    setSelectedIds(new Set());
    void queryClient.invalidateQueries({ queryKey: ["future-debt"] });
  }, [queryClient]);

  const handleDeleteError = useCallback((message: string) => {
    console.error("Error deleting future-debt rows:", message);
  }, []);

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="future-debt-section">
        <Loader2 className="size-6 animate-spin text-foreground" />
      </div>
    );
  }

  if (query.isError || !data) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive"
        data-testid="future-debt-section"
      >
        Error al cargar la deuda futura: {query.error instanceof Error ? query.error.message : "respuesta inválida"}
      </div>
    );
  }

  const hasConfirmedRows = data.months.some((month) => month.cards.some((card) => card.rows.length > 0));

  return (
    <div className="space-y-5" data-testid="future-debt-section">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Deuda futura</h2>
          <p className="text-sm font-medium text-slate-600">
            Cuotas ya asumidas, agrupadas por período y tarjeta.
          </p>
        </div>
        <SummaryChips summary={data.summary} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3">
        <div className="flex items-center gap-3">
          <Select value={String(horizonOption)} onValueChange={handleHorizonChange}>
            <SelectTrigger className="w-[150px]" data-testid="future-debt-horizon">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZON_OPTIONS.map((months) => (
                <SelectItem key={months} value={String(months)}>
                  {formatMonthLabel(months)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs font-medium text-slate-600">
            Desde {data.range.from} hasta {data.range.to}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {allRowIds.length > 0 ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => handleToggleScope(allRowIds)}
                aria-label="Seleccionar todas las filas de deuda futura"
                className={CHECKBOX_CLASS}
              />
              Seleccionar todo
            </label>
          ) : null}
          <DeleteRowsButton
            selectedIds={selectedIds}
            onDeleted={handleDeleted}
            onError={handleDeleteError}
          />
        </div>
      </div>

      {!hasConfirmedRows && data.pendientes.rows.length === 0 ? <FutureDebtEmpty /> : null}

      {data.months.map((month) => (
        <FutureDebtMonthPanel
          key={month.monthKey}
          month={month}
          selectedIds={selectedIds}
          onToggleRow={handleToggleRow}
          onToggleScope={handleToggleScope}
        />
      ))}

      <FutureDebtPending
        rows={data.pendientes.rows}
        diagnostics={data.pendientes.diagnostics}
        selectedIds={selectedIds}
        onToggleRow={handleToggleRow}
        onToggleScope={handleToggleScope}
      />

      <FutureDebtDiagnostics diagnostics={data.diagnostics} />
    </div>
  );
}

export default FutureDebtView;
