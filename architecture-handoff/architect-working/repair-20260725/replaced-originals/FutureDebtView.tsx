"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  fetchFutureDebt,
  type FutureDebtResponse,
  type FutureDebtMonth,
  type FutureDebtCard,
  type FutureDebtRow,
  type FutureDebtPendingRow,
} from "@/lib/finance/future-debt-api";
import { DeleteRowsButton } from "@/components/finance/transactions/DeleteRowsButton";
import { cn } from "@/lib/utils";

const HORIZON_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] as const;
type HorizonOption = (typeof HORIZON_OPTIONS)[number];

// ─── Formatting helpers ────────────────────────────────────────────────────────

function formatMonthLabel(months: number): string {
  return `${months} ${months === 1 ? "mes" : "meses"}`;
}

function formatArgentinePesos(value: string): string {
  return formatFinancialAmount(value, "ARS");
}

function formatDollars(value: string): string {
  return formatFinancialAmount(value, "USD");
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function FutureDebtEmpty({ summary }: { summary: FutureDebtResponse["summary"] }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center"
      data-testid="future-debt-empty"
    >
      <p className="text-sm text-foreground">
        No hay deuda futura confirmada para el horizonte seleccionado
      </p>
      <div className="flex gap-6 text-sm">
        <span data-testid="future-debt-summary-ars" data-currency="ARS">
          <span className="text-foreground">Total ARS: </span>
          <span className="font-medium">$ 0,00</span>
        </span>
        <span data-testid="future-debt-summary-usd" data-currency="USD">
          <span className="text-foreground">Total USD: </span>
          <span className="font-medium">$ 0,00</span>
        </span>
      </div>
    </div>
  );
}

// ─── Summary Chips ──────────────────────────────────────────────────────────────

function SummaryChips({ summary }: { summary: FutureDebtResponse["summary"] }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm"
        data-testid="future-debt-summary-ars"
        data-currency="ARS"
      >
        <span className="text-foreground">ARS</span>
        <span className="font-semibold tabular-nums">{formatArgentinePesos(summary.ars)}</span>
      </div>
      <div
        className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm"
        data-testid="future-debt-summary-usd"
        data-currency="USD"
      >
        <span className="text-foreground">USD</span>
        <span className="font-semibold tabular-nums">{formatDollars(summary.usd)}</span>
      </div>
    </div>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────────

interface RowProps {
  row: FutureDebtRow;
  checked: boolean;
  onToggle: (id: string) => void;
  allChecked: boolean;
  onToggleAll: () => void;
  isHeader?: boolean;
}

function FutureDebtRowComponent({
  row,
  checked,
  onToggle,
  allChecked,
  onToggleAll,
  isHeader = false,
}: RowProps) {
  if (isHeader) {
    return (
      <tr className="border-b bg-muted/40 text-left text-xs text-foreground">
        <th className="w-10 px-3 py-2">
          <Checkbox
            checked={allChecked}
            onCheckedChange={onToggleAll}
            aria-label="Seleccionar todas las filas"
            className="size-4 bg-background border-2 border-input data-[state=checked]:bg-primary"
          />
        </th>
        <th className="px-3 py-2 font-medium">Descripción</th>
        <th className="px-3 py-2 text-right font-medium">Cuota</th>
        <th className="px-3 py-2 text-right font-medium">Monto</th>
        <th className="px-3 py-2 font-medium">Origen</th>
        <th className="px-3 py-2 font-medium">Estado</th>
      </tr>
    );
  }

  return (
    <tr
      className="border-b last:border-0 hover:bg-muted/30"
      data-testid="future-debt-row"
    >
      <td className="w-10 px-3 py-2">
        <Checkbox
          checked={checked}
          onCheckedChange={() => onToggle(row.id)}
          aria-label={`Seleccionar fila ${row.description}`}
          className="size-4 bg-background border-2 border-input data-[state=checked]:bg-primary"
        />
      </td>
      <td className="px-3 py-2">
        <span className="font-medium">{row.description}</span>
        {row.cardLabel && (
          <span className="ml-2 text-xs text-muted-foreground">{row.cardLabel}</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-foreground">
        {row.installmentLabel}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums",
          row.currency === "ARS" ? "text-foreground" : "text-emerald-700",
        )}
      >
        {row.currency === "ARS"
          ? formatArgentinePesos(row.amount)
          : formatDollars(row.amount)}
      </td>
      <td className="px-3 py-2 text-xs text-foreground">{row.sourceLabel}</td>
      <td className="px-3 py-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            row.status === "confirmed"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700",
          )}
        >
          {row.status === "confirmed" ? "Confirmado" : "Estimado"}
        </span>
      </td>
    </tr>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  card: FutureDebtCard;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  allSelected: boolean;
  onToggleAll: () => void;
}

function FutureDebtCardComponent({
  card,
  selectedIds,
  onToggleRow,
  allSelected,
  onToggleAll,
}: CardProps) {
  return (
    <div className="rounded-lg border" data-testid="future-debt-card">
      {/* Card header */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{card.holderName}</span>
          <span className="text-sm text-muted-foreground">•••• {card.cardLast4}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span
            data-testid="future-debt-card-total-ars"
            data-currency-ars={card.totals.ars}
          >
            <span className="text-foreground">ARS: </span>
            <span className="font-semibold tabular-nums">
              {formatArgentinePesos(card.totals.ars)}
            </span>
          </span>
          <span
            data-testid="future-debt-card-total-usd"
            data-currency-usd={card.totals.usd}
          >
            <span className="text-foreground">USD: </span>
            <span className="font-semibold tabular-nums">
              {formatDollars(card.totals.usd)}
            </span>
          </span>
        </div>
      </div>

      {/* Rows table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <FutureDebtRowComponent
              row={{} as FutureDebtRow}
              checked={false}
              onToggle={() => {}}
              allChecked={allSelected}
              onToggleAll={onToggleAll}
              isHeader
            />
          </thead>
          <tbody>
            {card.rows.map((row) => (
              <FutureDebtRowComponent
                key={row.id}
                row={row}
                checked={selectedIds.has(row.id)}
                onToggle={onToggleRow}
                allChecked={false}
                onToggleAll={() => {}}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Month Panel ───────────────────────────────────────────────────────────────

interface MonthPanelProps {
  month: FutureDebtMonth;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
}

function FutureDebtMonthPanel({
  month,
  selectedIds,
  onToggleRow,
  onToggleAll,
  allSelected,
}: MonthPanelProps) {
  return (
    <div
      className="rounded-xl border"
      data-testid="future-debt-month"
      data-month-key={month.monthKey}
    >
      {/* Month header */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{month.label}</h3>
          {month.dataQuality.status === "partial" && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              Datos incompletos
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span
            data-testid="future-debt-month-total-ars"
          >
            <span className="text-foreground">ARS: </span>
            <span className="font-semibold tabular-nums">
              {formatArgentinePesos(month.totals.ars)}
            </span>
          </span>
          <span
            data-testid="future-debt-month-total-usd"
          >
            <span className="text-foreground">USD: </span>
            <span className="font-semibold tabular-nums">
              {formatDollars(month.totals.usd)}
            </span>
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3 p-4">
        {month.cards.map((card) => (
          <FutureDebtCardComponent
            key={card.cardId}
            card={card}
            selectedIds={selectedIds}
            onToggleRow={onToggleRow}
            allSelected={allSelected}
            onToggleAll={onToggleAll}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Pendientes Section ────────────────────────────────────────────────────────

interface PendientesProps {
  rows: FutureDebtPendingRow[];
  diagnostics: string[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  allSelected: boolean;
  onToggleAll: () => void;
}

function FutureDebtPendientes({
  rows,
  diagnostics,
  selectedIds,
  onToggleRow,
  allSelected,
  onToggleAll,
}: PendientesProps) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50" data-testid="future-debt-pendientes">
      <div className="flex items-center justify-between border-b border-amber-200 bg-amber-100/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleAll}
            aria-label="Seleccionar todas las filas pendientes"
            className="size-4 bg-background border-2 border-input data-[state=checked]:bg-primary"
          />
          <div>
            <h3 className="font-semibold text-amber-900">Pendientes de clasificar</h3>
            <p className="text-xs text-amber-700">
              Estas filas no tienen tarjeta asignada o requieren revisión
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 p-4">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white p-3"
            data-testid="future-debt-pending-row"
          >
            <Checkbox
              checked={selectedIds.has(row.id)}
              onCheckedChange={() => onToggleRow(row.id)}
              aria-label={`Seleccionar fila pendiente ${row.description}`}
              className="size-4 bg-background border-2 border-input data-[state=checked]:bg-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{row.description}</span>
                {row.diagnostic && (
                  <span
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900"
                    data-testid="future-debt-pending-diagnostic"
                  >
                    {row.diagnostic}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-900">
                {row.diagnosticDetail}
              </p>
            </div>
            <div className="text-right tabular-nums text-sm font-semibold text-foreground">
              {row.currency === "ARS"
                ? formatArgentinePesos(row.amount)
                : row.currency === "USD"
                  ? formatDollars(row.amount)
                  : row.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Diagnostics ───────────────────────────────────────────────────────────────

interface DiagnosticsProps {
  diagnostics: FutureDebtResponse["diagnostics"];
}

function FutureDebtDiagnostics({ diagnostics }: DiagnosticsProps) {
  const hasIssues =
    diagnostics.duplicateOccurrences > 0 ||
    diagnostics.invalidInstallmentRows > 0 ||
    diagnostics.missingCurrencyRows > 0 ||
    diagnostics.missingCardRows > 0 ||
    diagnostics.warnings.length > 0;

  if (!hasIssues) return null;

  return (
    <div
      className="rounded-xl border border-blue-200 bg-blue-50/50 p-4"
      data-testid="future-debt-diagnostics"
    >
      <h4 className="mb-2 text-sm font-semibold text-blue-900">Diagnósticos</h4>
      <ul className="space-y-1 text-xs text-blue-800">
        {diagnostics.missingCardRows > 0 && (
          <li data-testid="future-debt-diagnostics-missing-card">
            Filas sin tarjeta asignada: {diagnostics.missingCardRows}
          </li>
        )}
        {diagnostics.missingCurrencyRows > 0 && (
          <li>Filas sin moneda: {diagnostics.missingCurrencyRows}</li>
        )}
        {diagnostics.invalidInstallmentRows > 0 && (
          <li>Cuotas inválidas: {diagnostics.invalidInstallmentRows}</li>
        )}
        {diagnostics.duplicateOccurrences > 0 && (
          <li>Duplicados: {diagnostics.duplicateOccurrences}</li>
        )}
        {diagnostics.warnings.map((warning, i) => (
          <li key={i}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FutureDebtView() {
  const [horizon, setHorizon] = useState<HorizonOption>(6);
  const [includeCurrentPeriod, setIncludeCurrentPeriod] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["future-debt", horizon, includeCurrentPeriod],
    queryFn: () =>
      fetchFutureDebt({
        months: horizon,
        includeCurrentPeriod,
      }),
  });

  const data = query.data;

  // Collect all row IDs for select-all
  const allRowIds = useMemo(() => {
    if (!data) return [];
    return [
      ...data.months.flatMap((m) => m.cards.flatMap((c) => c.rows.map((r) => r.id))),
      ...data.pendientes.rows.map((r) => r.id),
    ];
  }, [data]);

  const allSelected = useMemo(
    () => allRowIds.length > 0 && allRowIds.every((id) => selectedIds.has(id)),
    [allRowIds, selectedIds],
  );

  const handleToggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (allRowIds.every((id) => prev.has(id))) {
        // Deselect all
        return new Set();
      } else {
        // Select all
        return new Set(allRowIds);
      }
    });
  }, [allRowIds]);

  const handleDeleted = useCallback(() => {
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["future-debt"] });
  }, [queryClient]);

  const handleError = useCallback((message: string) => {
    console.error("Error deleting rows:", message);
  }, []);

  if (query.isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-testid="future-debt-section"
      >
        <Loader2 className="size-6 animate-spin text-foreground" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div
        className="flex items-center justify-center py-12 text-sm text-destructive"
        data-testid="future-debt-section"
      >
        Error al cargar la deuda futura: {query.error?.message}
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-testid="future-debt-section"
      >
        <Loader2 className="size-6 animate-spin text-foreground" />
      </div>
    );
  }

  const hasData = data.months.length > 0 || data.pendientes.rows.length > 0;

  return (
    <div className="space-y-6" data-testid="future-debt-section">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Horizon selector */}
          <div className="flex items-center gap-2" data-testid="future-debt-horizon">
            <span className="text-sm text-foreground">Horizonte:</span>
            <Select
              value={String(horizon)}
              onValueChange={(v) => setHorizon(Number(v) as HorizonOption)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORIZON_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {formatMonthLabel(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Include current period toggle */}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              id="include-current-period"
              data-testid="future-debt-include-current-period"
              checked={includeCurrentPeriod}
              onCheckedChange={(v) => setIncludeCurrentPeriod(Boolean(v))}
              className="size-4 bg-background border-2 border-input data-[state=checked]:bg-primary"
            />
            <span>Incluir período actual</span>
          </label>
        </div>

        {/* Delete button */}
        <DeleteRowsButton
          selectedIds={selectedIds}
          onDeleted={handleDeleted}
          onError={handleError}
        />
      </div>

      {/* Summary */}
      <SummaryChips summary={data.summary} />

      {/* Content */}
      {!hasData ? (
        <FutureDebtEmpty summary={data.summary} />
      ) : (
        <div className="space-y-6" data-testid="future-debt-months">
          {/* Month panels */}
          {data.months.map((month) => (
            <FutureDebtMonthPanel
              key={month.monthKey}
              month={month}
              selectedIds={selectedIds}
              onToggleRow={handleToggleRow}
              onToggleAll={handleToggleAll}
              allSelected={allSelected}
            />
          ))}

          {/* Pendientes */}
          <FutureDebtPendientes
            rows={data.pendientes.rows}
            diagnostics={data.pendientes.diagnostics}
            selectedIds={selectedIds}
            onToggleRow={handleToggleRow}
            allSelected={allSelected}
            onToggleAll={handleToggleAll}
          />

          {/* Diagnostics */}
          <FutureDebtDiagnostics diagnostics={data.diagnostics} />
        </div>
      )}
    </div>
  );
}
