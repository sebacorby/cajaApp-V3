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
  type FutureDebtCurrency,
  type FutureDebtPendingRow,
  type FutureDebtResponse,
  type FutureDebtRow,
} from "@/lib/finance/future-debt-api";

const HORIZON_OPTIONS = Array.from({ length: 24 }, (_, index) => index + 1);
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

type MoneyCents = { ars: number; usd: number };
type MatrixCell = MoneyCents & { projectionIds: string[] };
type CheckboxState = boolean | "indeterminate";

type MatrixMovement = {
  key: string;
  dateIso: string | null;
  description: string;
  projectionIds: string[];
  cells: Map<string, MatrixCell>;
};

type MatrixCard = {
  key: string;
  cardLabel: string;
  holderName: string;
  projectionIds: string[];
  movements: MatrixMovement[];
  totalsByMonth: Map<string, MoneyCents>;
};

type MatrixCardBuilder = Omit<MatrixCard, "movements"> & {
  movements: Map<string, MatrixMovement>;
};

function monthKeyWithOffset(monthKey: string, offset: number): string {
  const [yearText, monthText] = monthKey.split("-");
  const absolute = Number(yearText) * 12 + Number(monthText) - 1 + offset;
  return `${Math.floor(absolute / 12)}-${String((absolute % 12) + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey: string): string {
  const [yearText, monthText] = monthKey.split("-");
  return `${MONTH_NAMES[Number(monthText) - 1] ?? monthText} ${yearText}`;
}

function formatDate(dateIso: string | null): string {
  if (!dateIso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : dateIso;
}

function parseCents(value: string): number {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(value);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 100 + Number(match[3]));
}

function centsToDecimal(cents: number): string {
  const value = Math.trunc(cents);
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

function emptyMoney(): MoneyCents {
  return { ars: 0, usd: 0 };
}

function addMoney(target: MoneyCents, currency: FutureDebtCurrency, amount: string): void {
  const cents = parseCents(amount);
  if (currency === "ARS") target.ars += cents;
  else target.usd += cents;
}

function addBucket(target: MoneyCents, source: MoneyCents): void {
  target.ars += source.ars;
  target.usd += source.usd;
}

function cloneMoney(source: MoneyCents): MoneyCents {
  return { ars: source.ars, usd: source.usd };
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

function selectionState(ids: readonly string[], selectedIds: Set<string>): CheckboxState {
  if (ids.length === 0) return false;
  const selected = ids.filter((id) => selectedIds.has(id)).length;
  if (selected === 0) return false;
  if (selected === ids.length) return true;
  return "indeterminate";
}

function movementKey(row: FutureDebtRow): string {
  return (
    row.sourceId?.trim() ||
    [row.originType, row.originReference, row.dateIso ?? "", row.description].join("|")
  );
}

function cardKey(row: FutureDebtRow): string {
  return [row.cardLabel, row.cardLast4, row.holderName]
    .map((value) => value.trim().toLocaleLowerCase("es"))
    .join("|");
}

function hasCurrentInstallment(description: string, fallbackInstallment: number): boolean {
  const match = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\s|$)/.exec(description);
  if (match) return Number(match[1]) >= 1;
  return fallbackInstallment > 1;
}

function buildMatrix(response: FutureDebtResponse): { months: string[]; cards: MatrixCard[] } {
  const months = Array.from({ length: response.range.months }, (_, index) =>
    monthKeyWithOffset(response.range.from, index),
  );
  const cards = new Map<string, MatrixCardBuilder>();

  for (const month of response.months) {
    for (const card of month.cards) {
      for (const row of card.rows) {
        const key = cardKey(row);
        let cardBuilder = cards.get(key);
        if (!cardBuilder) {
          cardBuilder = {
            key,
            cardLabel: row.cardLabel || card.cardLabel,
            holderName: row.holderName || card.holderName,
            projectionIds: [],
            movements: new Map(),
            totalsByMonth: new Map(),
          };
          cards.set(key, cardBuilder);
        }

        const sourceKey = movementKey(row);
        let movement = cardBuilder.movements.get(sourceKey);
        if (!movement) {
          movement = {
            key: sourceKey,
            dateIso: row.dateIso ?? null,
            description: row.description,
            projectionIds: [],
            cells: new Map(),
          };
          cardBuilder.movements.set(sourceKey, movement);
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

        let monthTotal = cardBuilder.totalsByMonth.get(row.monthKey);
        if (!monthTotal) {
          monthTotal = emptyMoney();
          cardBuilder.totalsByMonth.set(row.monthKey, monthTotal);
        }
        addMoney(monthTotal, row.currency, row.amount);
      }
    }
  }

  const currentKey = response.range.currentPeriodKey ?? response.range.from;
  const nextKey = monthKeyWithOffset(currentKey, 1);
  if (currentKey === response.range.from && months.includes(currentKey)) {
    for (const card of cards.values()) {
      for (const movement of card.movements.values()) {
        if (movement.cells.has(currentKey)) continue;
        const nextCell = movement.cells.get(nextKey);
        if (!nextCell) continue;

        const nextRow = response.months
          .find((month) => month.monthKey === nextKey)
          ?.cards.flatMap((monthCard) => monthCard.rows)
          .find((row) => movementKey(row) === movement.key);
        if (!nextRow || !hasCurrentInstallment(movement.description, nextRow.installmentNumber)) {
          continue;
        }

        movement.cells.set(currentKey, {
          ...cloneMoney(nextCell),
          projectionIds: [],
        });
        let currentTotal = card.totalsByMonth.get(currentKey);
        if (!currentTotal) {
          currentTotal = emptyMoney();
          card.totalsByMonth.set(currentKey, currentTotal);
        }
        addBucket(currentTotal, nextCell);
      }
    }
  }

  return {
    months,
    cards: Array.from(cards.values())
      .map((card) => ({
        ...card,
        movements: Array.from(card.movements.values()).sort((left, right) => {
          const leftDate = left.dateIso ?? "9999-99-99";
          const rightDate = right.dateIso ?? "9999-99-99";
          return leftDate.localeCompare(rightDate) || left.description.localeCompare(right.description, "es");
        }),
      }))
      .sort((left, right) => left.cardLabel.localeCompare(right.cardLabel, "es")),
  };
}

function MoneyCell({ money }: { money: MoneyCents | undefined }) {
  if (!money || (money.ars === 0 && money.usd === 0)) {
    return <span className="text-muted-foreground/60">—</span>;
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      {money.ars !== 0 ? (
        <span className="whitespace-nowrap font-semibold tabular-nums text-foreground">
          {formatFinancialAmount(centsToDecimal(money.ars), "ARS")}
        </span>
      ) : null}
      {money.usd !== 0 ? (
        <span className="whitespace-nowrap font-semibold tabular-nums text-emerald-500">
          {formatFinancialAmount(centsToDecimal(money.usd), "USD")}
        </span>
      ) : null}
    </div>
  );
}

function humanDiagnostic(row: FutureDebtPendingRow): string {
  switch (row.diagnostic) {
    case "missing_card_reference":
      return "Tarjeta sin identificar";
    case "missing_currency":
      return "Moneda sin identificar";
    case "invalid_installment":
      return "Cuota inválida";
    case "invalid_amount":
      return "Importe inválido";
    default:
      return "Revisar movimiento";
  }
}

export function FutureDebtView() {
  const queryClient = useQueryClient();
  const [horizon, setHorizon] = useState(6);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["future-debt", horizon],
    queryFn: ({ signal }) =>
      fetchFutureDebt({ months: horizon, includeCurrentPeriod: true }, signal),
  });

  const matrix = useMemo(
    () => (query.data ? buildMatrix(query.data) : { months: [], cards: [] }),
    [query.data],
  );

  const allProjectionIds = useMemo(
    () => Array.from(new Set(matrix.cards.flatMap((card) => card.projectionIds))),
    [matrix.cards],
  );

  const toggleScope = useCallback((ids: readonly string[]) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const handleDeleted = useCallback(() => {
    setSelectedIds(new Set());
    setErrorMessage(null);
    void queryClient.invalidateQueries({ queryKey: ["future-debt"] });
  }, [queryClient]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center" data-testid="future-debt-loading">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        No pudimos cargar Deuda futura. {query.error instanceof Error ? query.error.message : ""}
      </div>
    );
  }

  const globalSelection = selectionState(allProjectionIds, selectedIds);

  return (
    <section className="space-y-4" data-testid="future-debt-section">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cuotas, compromisos e ingresos proyectados
          </p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">Deuda futura</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada compra ocupa una fila y los meses se leen de izquierda a derecha.
          </p>
        </div>
        <div className="min-w-[120px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Horizonte</label>
          <Select value={String(horizon)} onValueChange={(value) => setHorizon(Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZON_OPTIONS.map((months) => (
                <SelectItem key={months} value={String(months)}>
                  {months} {months === 1 ? "mes" : "meses"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border bg-card px-4 py-3">
        <DeleteRowsButton selectedIds={selectedIds} onDeleted={handleDeleted} onError={setErrorMessage} />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            className={CHECKBOX_CLASS}
            checked={globalSelection}
            onCheckedChange={() => toggleScope(allProjectionIds)}
          />
          Seleccionar todo
        </label>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {matrix.cards.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground" data-testid="future-debt-empty">
          No hay deuda futura confirmada para el horizonte seleccionado.
        </div>
      ) : (
        matrix.cards.map((card) => {
          const collapsed = collapsedCards.has(card.key);
          const cardSelection = selectionState(card.projectionIds, selectedIds);
          const nextMonthKey = matrix.months[1] ?? matrix.months[0];
          const nextMonthTotal = card.totalsByMonth.get(nextMonthKey);

          return (
            <section key={card.key} className="overflow-hidden rounded-xl border bg-card" data-testid="future-debt-card">
              <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                <Checkbox
                  className={CHECKBOX_CLASS}
                  checked={cardSelection}
                  onCheckedChange={() => toggleScope(card.projectionIds)}
                  aria-label={`Seleccionar ${card.cardLabel}`}
                />
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() =>
                    setCollapsedCards((current) => {
                      const next = new Set(current);
                      if (next.has(card.key)) next.delete(card.key);
                      else next.add(card.key);
                      return next;
                    })
                  }
                >
                  {collapsed ? <ChevronRight className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
                  <span className="font-semibold text-foreground">{card.cardLabel}</span>
                  <span className="text-xs text-muted-foreground">{card.movements.length} movimientos</span>
                  {card.holderName ? <span className="hidden text-xs text-muted-foreground md:inline">{card.holderName}</span> : null}
                </button>
                <div className="ml-auto text-right">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {monthLabel(nextMonthKey)}
                  </div>
                  <MoneyCell money={nextMonthTotal} />
                </div>
              </div>

              {!collapsed ? (
                <div className="overflow-x-auto">
                  <table className="w-max min-w-full border-collapse text-sm">
                    <thead className="bg-card">
                      <tr className="border-b">
                        <th className="sticky left-0 z-20 min-w-[130px] bg-card px-3 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                        <th className="sticky left-[130px] z-20 min-w-[390px] bg-card px-3 py-3 text-left font-medium text-muted-foreground">Descripción</th>
                        {matrix.months.map((monthKey) => (
                          <th key={monthKey} className="min-w-[170px] border-l px-3 py-3 text-right font-medium text-muted-foreground">
                            {monthLabel(monthKey)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {card.movements.map((movement) => {
                        const movementSelection = selectionState(movement.projectionIds, selectedIds);
                        return (
                          <tr key={movement.key} className="border-b last:border-b-0 hover:bg-muted/20">
                            <td className="sticky left-0 z-10 bg-card px-3 py-3 text-muted-foreground">{formatDate(movement.dateIso)}</td>
                            <td className="sticky left-[130px] z-10 bg-card px-3 py-3">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  className={CHECKBOX_CLASS}
                                  checked={movementSelection}
                                  onCheckedChange={() => toggleScope(movement.projectionIds)}
                                  aria-label={`Seleccionar ${movement.description}`}
                                />
                                <span className="font-semibold text-foreground">{movement.description}</span>
                              </div>
                            </td>
                            {matrix.months.map((monthKey) => (
                              <td key={monthKey} className="border-l px-3 py-3 text-right align-middle">
                                <MoneyCell money={movement.cells.get(monthKey)} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t bg-muted/20">
                      <tr>
                        <td className="sticky left-0 z-10 bg-muted px-3 py-3" />
                        <td className="sticky left-[130px] z-10 bg-muted px-3 py-3 font-semibold text-foreground">Total mensual</td>
                        {matrix.months.map((monthKey) => (
                          <td key={monthKey} className="border-l px-3 py-3 text-right">
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
        })
      )}

      {query.data.pendientes.rows.length > 0 ? (
        <section className="rounded-xl border bg-card" data-testid="future-debt-pending-section">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold text-foreground">Pendientes de clasificar</h3>
            <p className="text-xs text-muted-foreground">{query.data.pendientes.rows.length} movimientos requieren revisión.</p>
          </div>
          <div className="divide-y">
            {query.data.pendientes.rows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-testid="future-debt-pending-row">
                <div>
                  <div className="font-medium text-foreground">{row.description}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{humanDiagnostic(row)}</div>
                </div>
                <div className="font-semibold tabular-nums text-foreground">
                  {row.currency ? formatFinancialAmount(row.amount, row.currency) : row.amount}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
