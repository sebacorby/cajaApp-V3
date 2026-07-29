"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
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
  type FutureDebtCurrency,
  type FutureDebtPendingRow,
  type FutureDebtResponse,
  type FutureDebtRow,
} from "@/lib/finance/future-debt-api";

const HORIZON_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24,
] as const;

type HorizonOption = (typeof HORIZON_OPTIONS)[number];
type CheckboxState = boolean | "indeterminate";

const CHECKBOX_CLASS =
  "size-4 border-2 border-muted-foreground/60 bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary";

const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

type MoneyCents = {
  ars: number;
  usd: number;
};

type MatrixCell = MoneyCents & {
  projectionIds: string[];
};

interface MatrixMovement {
  key: string;
  sourceId: string;
  dateIso: string | null;
  description: string;
  projectionIds: string[];
  cells: Map<string, MatrixCell>;
}

interface MatrixCard {
  key: string;
  cardLabel: string;
  holderName: string;
  cardLast4: string;
  projectionIds: string[];
  movements: MatrixMovement[];
  totals: MoneyCents;
  totalsByMonth: Map<string, MoneyCents>;
}

interface MatrixCardBuilder {
  key: string;
  cardLabel: string;
  holderName: string;
  cardLast4: string;
  projectionIds: string[];
  movements: Map<string, MatrixMovement>;
  totals: MoneyCents;
  totalsByMonth: Map<string, MoneyCents>;
}

function formatHorizonLabel(months: number): string {
  return `${months} ${months === 1 ? "mes" : "meses"}`;
}

function formatAmount(value: string, currency: FutureDebtCurrency): string {
  return formatFinancialAmount(value, currency);
}

function parseCents(value: string): number {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(value);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 100 + Number(match[3]));
}

function centsToDecimal(cents: number): string {
  const normalized = Math.trunc(cents);
  const sign = normalized < 0 ? "-" : "";
  const absolute = Math.abs(normalized);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

function emptyMoney(): MoneyCents {
  return { ars: 0, usd: 0 };
}

function addMoney(
  target: MoneyCents,
  currency: FutureDebtCurrency,
  amount: string,
): void {
  const cents = parseCents(amount);
  if (currency === "ARS") target.ars += cents;
  else target.usd += cents;
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

function selectionState(
  ids: readonly string[],
  selectedIds: Set<string>,
): CheckboxState {
  if (ids.length === 0) return false;
  const selected = ids.filter((id) => selectedIds.has(id)).length;
  if (selected === 0) return false;
  if (selected === ids.length) return true;
  return "indeterminate";
}

function monthKeyWithOffset(monthKey: string, offset: number): string {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const absoluteMonth = year * 12 + (month - 1) + offset;
  const resultYear = Math.floor(absoluteMonth / 12);
  const resultMonth = (absoluteMonth % 12) + 1;
  return `${resultYear}-${String(resultMonth).padStart(2, "0")}`;
}

function monthLabel(monthKey: string): string {
  const [yearText, monthText] = monthKey.split("-");
  const month = Number(monthText);
  return `${MONTH_NAMES[month - 1] ?? monthText} ${yearText}`;
}

function monthColumns(response: FutureDebtResponse): string[] {
  return Array.from({ length: response.range.months }, (_, index) =>
    monthKeyWithOffset(response.range.from, index),
  );
}

function formatDate(dateIso: string | null | undefined): string {
  if (!dateIso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso);
  if (!match) return dateIso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function normalizedCardKey(card: FutureDebtCard): string {
  const label = card.cardLabel.trim().toLocaleLowerCase("es");
  const last4 = card.cardLast4.trim();
  const holder = card.holderName.trim().toLocaleLowerCase("es");
  return `${label}|${last4}|${holder}`;
}

function fallbackSourceId(row: FutureDebtRow): string {
  return [
    row.originType,
    row.originReference,
    row.dateIso ?? "",
    row.description,
    row.currency,
    row.amount,
  ].join("|");
}

function buildCardMatrix(response: FutureDebtResponse): MatrixCard[] {
  const cards = new Map<string, MatrixCardBuilder>();

  for (const month of response.months) {
    for (const card of month.cards) {
      const cardKey = normalizedCardKey(card);
      let cardBuilder = cards.get(cardKey);
      if (!cardBuilder) {
        cardBuilder = {
          key: cardKey,
          cardLabel: card.cardLabel,
          holderName: card.holderName,
          cardLast4: card.cardLast4,
          projectionIds: [],
          movements: new Map(),
          totals: emptyMoney(),
          totalsByMonth: new Map(),
        };
        cards.set(cardKey, cardBuilder);
      }

      for (const row of card.rows) {
        const sourceId = row.sourceId?.trim() || fallbackSourceId(row);
        let movement = cardBuilder.movements.get(sourceId);
        if (!movement) {
          movement = {
            key: sourceId,
            sourceId,
            dateIso: row.dateIso ?? null,
            description: row.description,
            projectionIds: [],
            cells: new Map(),
          };
          cardBuilder.movements.set(sourceId, movement);
        } else {
          if (!movement.dateIso && row.dateIso) movement.dateIso = row.dateIso;
          if (!movement.description && row.description) {
            movement.description = row.description;
          }
        }

        let cell = movement.cells.get(row.monthKey);
        if (!cell) {
          cell = { ...emptyMoney(), projectionIds: [] };
          movement.cells.set(row.monthKey, cell);
        }

        addMoney(cell, row.currency, row.amount);
        pushUnique(cell.projectionIds, row.id);
        pushUnique(movement.projectionIds, row.id);
        pushUnique(cardBuilder.projectionIds, row.id);
        addMoney(cardBuilder.totals, row.currency, row.amount);

        let monthTotal = cardBuilder.totalsByMonth.get(row.monthKey);
        if (!monthTotal) {
          monthTotal = emptyMoney();
          cardBuilder.totalsByMonth.set(row.monthKey, monthTotal);
        }
        addMoney(monthTotal, row.currency, row.amount);
      }
    }
  }

  return Array.from(cards.values())
    .map((card) => ({
      key: card.key,
      cardLabel: card.cardLabel,
      holderName: card.holderName,
      cardLast4: card.cardLast4,
      projectionIds: card.projectionIds,
      totals: card.totals,
      totalsByMonth: card.totalsByMonth,
      movements: Array.from(card.movements.values()).sort((left, right) => {
        const leftDate = left.dateIso ?? "9999-99-99";
        const rightDate = right.dateIso ?? "9999-99-99";
        const byDate = leftDate.localeCompare(rightDate);
        return byDate !== 0
          ? byDate
          : left.description.localeCompare(right.description, "es");
      }),
    }))
    .sort((left, right) =>
      left.cardLabel.localeCompare(right.cardLabel, "es"),
    );
}

function SummaryChips({
  summary,
}: {
  summary: FutureDebtResponse["summary"];
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm"
        data-testid="future-debt-summary-ars"
        data-currency="ARS"
      >
        <span className="font-medium text-muted-foreground">ARS</span>
        <span className="font-semibold tabular-nums text-foreground">
          {formatAmount(summary.ars, "ARS")}
        </span>
      </div>
      <div
        className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm"
        data-testid="future-debt-summary-usd"
        data-currency="USD"
      >
        <span className="font-medium text-muted-foreground">USD</span>
        <span className="font-semibold tabular-nums text-foreground">
          {formatAmount(summary.usd, "USD")}
        </span>
      </div>
    </div>
  );
}

function MoneyCell({ money }: { money: MoneyCents | undefined }) {
  if (!money || (money.ars === 0 && money.usd === 0)) {
    return <span className="text-muted-foreground/60">—</span>;
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      {money.ars !== 0 ? (
        <span className="whitespace-nowrap font-semibold tabular-nums text-foreground">
          {formatAmount(centsToDecimal(money.ars), "ARS")}
        </span>
      ) : null}
      {money.usd !== 0 ? (
        <span className="whitespace-nowrap font-semibold tabular-nums text-foreground">
          {formatAmount(centsToDecimal(money.usd), "USD")}
        </span>
      ) : null}
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
      <p className="text-xs text-muted-foreground">
        Las compras en cuotas aparecerán acá cuando existan períodos futuros
        persistidos.
      </p>
    </div>
  );
}

interface CardMatrixProps {
  card: MatrixCard;
  months: string[];
  selectedIds: Set<string>;
  collapsed: boolean;
  onToggleCollapsed: (cardKey: string) => void;
  onToggleScope: (ids: readonly string[]) => void;
}

function CardMatrix({
  card,
  months,
  selectedIds,
  collapsed,
  onToggleCollapsed,
  onToggleScope,
}: CardMatrixProps) {
  const cardSelection = selectionState(card.projectionIds, selectedIds);

  return (
    <section
      className="overflow-hidden rounded-xl border bg-card"
      data-testid="future-debt-card"
      data-card-key={card.key}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/25 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Checkbox
            checked={cardSelection}
            onCheckedChange={() => onToggleScope(card.projectionIds)}
            aria-label={`Seleccionar filas de ${card.cardLabel}`}
            className={CHECKBOX_CLASS}
          />
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 text-left"
            onClick={() => onToggleCollapsed(card.key)}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? "Expandir" : "Colapsar"} ${card.cardLabel}`}
          >
            {collapsed ? (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate font-semibold text-foreground">
              {card.cardLabel}
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {card.movements.length}{" "}
              {card.movements.length === 1 ? "movimiento" : "movimientos"}
            </span>
          </button>
          {card.holderName && card.holderName !== "Sin titular" ? (
            <span className="hidden text-xs text-muted-foreground md:inline">
              {card.holderName}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          {card.totals.ars !== 0 ? (
            <span data-testid="future-debt-card-total-ars">
              <span className="text-muted-foreground">ARS </span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatAmount(centsToDecimal(card.totals.ars), "ARS")}
              </span>
            </span>
          ) : null}
          {card.totals.usd !== 0 ? (
            <span data-testid="future-debt-card-total-usd">
              <span className="text-muted-foreground">USD </span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatAmount(centsToDecimal(card.totals.usd), "USD")}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {!collapsed ? (
        <div
          className="max-w-full overflow-x-auto"
          data-testid="future-debt-card-matrix"
        >
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="sticky left-0 z-30 w-[116px] min-w-[116px] border-b border-r bg-card px-3 py-2.5 font-semibold">
                  Fecha
                </th>
                <th className="sticky left-[116px] z-30 w-[320px] min-w-[320px] border-b border-r bg-card px-3 py-2.5 font-semibold">
                  Descripción
                </th>
                {months.map((monthKey) => (
                  <th
                    key={monthKey}
                    className="min-w-[145px] border-b border-r bg-card px-3 py-2.5 text-right font-semibold last:border-r-0"
                    data-month-key={monthKey}
                  >
                    {monthLabel(monthKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {card.movements.map((movement) => {
                const movementSelection = selectionState(
                  movement.projectionIds,
                  selectedIds,
                );
                return (
                  <tr
                    key={movement.key}
                    className="group"
                    data-testid="future-debt-row"
                    data-source-id={movement.sourceId}
                  >
                    <td className="sticky left-0 z-20 whitespace-nowrap border-b border-r bg-card px-3 py-3 text-muted-foreground group-hover:bg-muted/30">
                      {formatDate(movement.dateIso)}
                    </td>
                    <td className="sticky left-[116px] z-20 border-b border-r bg-card px-3 py-3 group-hover:bg-muted/30">
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={movementSelection}
                          onCheckedChange={() =>
                            onToggleScope(movement.projectionIds)
                          }
                          aria-label={`Seleccionar fila ${movement.description}`}
                          className={CHECKBOX_CLASS}
                        />
                        <span className="font-medium text-foreground">
                          {movement.description}
                        </span>
                      </div>
                    </td>
                    {months.map((monthKey) => (
                      <td
                        key={monthKey}
                        className="border-b border-r px-3 py-3 text-right last:border-r-0 group-hover:bg-muted/20"
                        data-month-key={monthKey}
                      >
                        <MoneyCell money={movement.cells.get(monthKey)} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/25">
                <td className="sticky left-0 z-20 border-r bg-muted px-3 py-3" />
                <td className="sticky left-[116px] z-20 border-r bg-muted px-3 py-3 font-semibold text-foreground">
                  Total mensual
                </td>
                {months.map((monthKey) => (
                  <td
                    key={monthKey}
                    className="border-r bg-muted/25 px-3 py-3 text-right last:border-r-0"
                  >
                    <MoneyCell money={card.totalsByMonth.get(monthKey)} />
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function diagnosticLabel(
  diagnostic: FutureDebtPendingRow["diagnostic"],
): string {
  switch (diagnostic) {
    case "missing_card_reference":
      return "Tarjeta sin identificar";
    case "invalid_installment":
      return "Cuota incompleta";
    case "missing_currency":
      return "Moneda sin identificar";
    case "invalid_amount":
      return "Importe inválido";
  }
}

interface PendingProps {
  rows: FutureDebtPendingRow[];
  selectedIds: Set<string>;
  onToggleScope: (ids: readonly string[]) => void;
}

function PendingSection({
  rows,
  selectedIds,
  onToggleScope,
}: PendingProps) {
  if (rows.length === 0) return null;

  const rowIds = rows.map((row) => row.id);
  const selected = selectionState(rowIds, selectedIds);

  return (
    <section
      className="overflow-hidden rounded-xl border bg-card"
      data-testid="future-debt-pending-section"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/25 px-4 py-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleScope(rowIds)}
            aria-label="Seleccionar todas las filas pendientes"
            className={CHECKBOX_CLASS}
          />
          <div>
            <h3 className="font-semibold text-foreground">
              Pendientes de clasificar
            </h3>
            <p className="text-xs text-muted-foreground">
              Sólo aparecen acá las filas que todavía necesitan una referencia
              válida.
            </p>
          </div>
        </div>
        <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
          {rows.length} {rows.length === 1 ? "fila" : "filas"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="px-3 py-2 font-semibold">Descripción</th>
              <th className="px-3 py-2 font-semibold">Mes</th>
              <th className="px-3 py-2 text-right font-semibold">Importe</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b last:border-b-0 hover:bg-muted/20"
                data-testid="future-debt-pending-row"
              >
                <td className="px-3 py-3">
                  <Checkbox
                    checked={selectedIds.has(row.id)}
                    onCheckedChange={() => onToggleScope([row.id])}
                    aria-label={`Seleccionar fila pendiente ${row.description}`}
                    className={CHECKBOX_CLASS}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                  {formatDate(row.dateIso)}
                </td>
                <td className="px-3 py-3 font-medium text-foreground">
                  {row.description}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                  {monthLabel(row.monthKey)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                  {row.currency
                    ? formatAmount(row.amount, row.currency)
                    : row.amount}
                </td>
                <td className="px-3 py-3 text-xs font-medium text-muted-foreground">
                  {diagnosticLabel(row.diagnostic)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Diagnostics({
  diagnostics,
}: {
  diagnostics: FutureDebtResponse["diagnostics"];
}) {
  const items = [
    {
      key: "duplicate",
      label: "Duplicados descartados",
      count: diagnostics.duplicateOccurrences,
    },
    {
      key: "installment",
      label: "Cuotas incompletas",
      count: diagnostics.invalidInstallmentRows,
    },
    {
      key: "currency",
      label: "Moneda sin identificar",
      count: diagnostics.missingCurrencyRows,
    },
    {
      key: "card",
      label: "Tarjeta sin identificar",
      count: diagnostics.missingCardRows,
    },
  ].filter((item) => item.count > 0);

  if (items.length === 0) return null;

  return (
    <section
      className="rounded-xl border bg-card px-4 py-3"
      data-testid="future-debt-diagnostics"
    >
      <h3 className="text-sm font-semibold text-foreground">
        Diagnósticos de integridad
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.key}
            className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground"
          >
            {item.label}:{" "}
            <strong className="font-semibold text-foreground">
              {item.count}
            </strong>
          </span>
        ))}
      </div>
    </section>
  );
}

export function FutureDebtView() {
  const queryClient = useQueryClient();
  const [horizonOption, setHorizonOption] = useState<HorizonOption>(6);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(
    () => new Set(),
  );

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
  const months = useMemo(() => (data ? monthColumns(data) : []), [data]);
  const cards = useMemo(() => (data ? buildCardMatrix(data) : []), [data]);

  const confirmedIds = useMemo(
    () => cards.flatMap((card) => card.projectionIds),
    [cards],
  );
  const pendingIds = useMemo(
    () => data?.pendientes.rows.map((row) => row.id) ?? [],
    [data],
  );
  const allRowIds = useMemo(
    () => [...confirmedIds, ...pendingIds],
    [confirmedIds, pendingIds],
  );
  const allSelected = selectionState(allRowIds, selectedIds);

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
    const monthsValue = Number(value) as HorizonOption;
    if (!HORIZON_OPTIONS.includes(monthsValue)) return;
    setSelectedIds(new Set());
    setCollapsedCards(new Set());
    setHorizonOption(monthsValue);
  }, []);

  const handleDeleted = useCallback(() => {
    setSelectedIds(new Set());
    void queryClient.invalidateQueries({ queryKey: ["future-debt"] });
  }, [queryClient]);

  const handleDeleteError = useCallback((message: string) => {
    console.error("Error deleting future-debt rows:", message);
  }, []);

  const handleToggleCard = useCallback((cardKey: string) => {
    setCollapsedCards((current) => {
      const next = new Set(current);
      if (next.has(cardKey)) next.delete(cardKey);
      else next.add(cardKey);
      return next;
    });
  }, []);

  return (
    <section className="space-y-4" data-testid="future-debt-section">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Deuda futura
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada compra ocupa una fila y los meses se leen de izquierda a
            derecha.
          </p>
        </div>

        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Horizonte
          </label>
          <Select
            value={String(horizonOption)}
            onValueChange={handleHorizonChange}
          >
            <SelectTrigger aria-label="Horizonte de deuda futura">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZON_OPTIONS.map((monthsValue) => (
                <SelectItem key={monthsValue} value={String(monthsValue)}>
                  {formatHorizonLabel(monthsValue)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Calculando deuda futura…
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-destructive">
          {query.error instanceof Error
            ? query.error.message
            : "No se pudo cargar la deuda futura."}
        </div>
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
            <SummaryChips summary={data.summary} />
            <div className="flex flex-wrap items-center gap-3">
              {allRowIds.length > 0 ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => handleToggleScope(allRowIds)}
                    aria-label="Seleccionar todo"
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

          <div className="space-y-4">
            {cards.length > 0 ? (
              cards.map((card) => (
                <CardMatrix
                  key={card.key}
                  card={card}
                  months={months}
                  selectedIds={selectedIds}
                  collapsed={collapsedCards.has(card.key)}
                  onToggleCollapsed={handleToggleCard}
                  onToggleScope={handleToggleScope}
                />
              ))
            ) : (
              <FutureDebtEmpty />
            )}

            <PendingSection
              rows={data.pendientes.rows}
              selectedIds={selectedIds}
              onToggleScope={handleToggleScope}
            />

            <Diagnostics diagnostics={data.diagnostics} />
          </div>
        </>
      ) : null}
    </section>
  );
}
