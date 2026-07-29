"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  fetchCardPayments,
  type CardPaymentAdjustmentDetail,
  type CardPaymentCell,
  type CardPaymentMoney,
  type CardPaymentsResponse,
} from "@/lib/finance/card-payments-api";
import { useFinanceUI } from "@/lib/finance/ui-store";

const HORIZONS = [2, 6, 12, 24] as const;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function moneyIsZero(value: CardPaymentMoney): boolean {
  return value.ars === "0.00" && value.usd === "0.00";
}

function signedMoney(value: CardPaymentMoney): string {
  const parts: string[] = [];
  if (value.ars !== "0.00") parts.push(formatFinancialAmount(value.ars, "ARS"));
  if (value.usd !== "0.00") parts.push(formatFinancialAmount(value.usd, "USD"));
  return parts.join(" · ") || "$ 0,00";
}

function Money({
  value,
  emphasize = false,
}: {
  value: CardPaymentMoney;
  emphasize?: boolean;
}) {
  if (moneyIsZero(value)) {
    return <span className="text-muted-foreground/55">—</span>;
  }

  return (
    <div className="flex flex-col items-end gap-0.5 tabular-nums">
      {value.ars !== "0.00" ? (
        <span className={emphasize ? "font-bold text-foreground" : "font-semibold text-foreground"}>
          {formatFinancialAmount(value.ars, "ARS")}
        </span>
      ) : null}
      {value.usd !== "0.00" ? (
        <span className={emphasize ? "font-bold text-emerald-500" : "font-semibold text-emerald-500"}>
          {formatFinancialAmount(value.usd, "USD")}
        </span>
      ) : null}
    </div>
  );
}

function AdjustmentTooltip({
  value,
  detail,
  emphasize = false,
}: {
  value: CardPaymentMoney;
  detail?: CardPaymentAdjustmentDetail;
  emphasize?: boolean;
}) {
  if (!detail) return <Money value={value} emphasize={emphasize} />;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help border-b border-dotted border-muted-foreground/60 pb-0.5">
          <Money value={value} emphasize={emphasize} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm space-y-1.5 p-3 text-xs">
        <p className="font-semibold">Ajustado automáticamente por CajaApp</p>
        <p>{detail.message}</p>
        <div className="border-t border-border/50 pt-1.5 text-muted-foreground">
          <p>Calculado inicialmente: {signedMoney(detail.original)}</p>
          <p>Ajuste aplicado: {signedMoney(detail.adjustment)}</p>
          <p className="font-medium text-foreground">Importe usado: {signedMoney(detail.adjusted)}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function CellValue({ cell }: { cell: CardPaymentCell | undefined }) {
  if (!cell) return <span className="text-muted-foreground/55">—</span>;

  const installment =
    cell.installmentNumber !== null && cell.installmentTotal !== null
      ? `Cuota ${cell.installmentNumber}/${cell.installmentTotal}`
      : cell.status === "confirmed"
        ? "Confirmado por el resumen"
        : undefined;

  return (
    <span title={installment} className="inline-flex justify-end">
      <Money value={cell} />
    </span>
  );
}

export function CardPaymentsView() {
  const setSection = useFinanceUI((state) => state.setSection);
  const [horizon, setHorizon] = useState<number>(6);
  const [data, setData] = useState<CardPaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetchCardPayments(horizon, controller.signal)
      .then((response) => setData(response))
      .catch((caught) => {
        if (controller.signal.aborted) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudieron cargar los pagos de tarjeta.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [horizon]);

  const nextMonth = data?.months[1] ?? null;
  const monthsByKey = useMemo(
    () => new Map(data?.months.map((month) => [month.monthKey, month]) ?? []),
    [data],
  );

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center" data-testid="card-payments-loading">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        <p>{error ?? "No se pudieron cargar los pagos de tarjeta."}</p>
        <Button variant="outline" onClick={() => setHorizon((value) => value)}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data.baseline) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center">
        <FileUp className="mb-4 size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Todavía no hay un resumen consolidado</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Importá y aceptá un resumen en Tarjetas. Desde ese momento CajaApp mantendrá los pagos y cuotas proyectadas.
        </p>
        <Button className="mt-5" onClick={() => setSection("tarjetas")}>
          Importar resumen
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <section className="space-y-4" data-testid="card-payments-view">
        <div className="flex justify-end">
          <div className="flex items-end gap-2">
            <label className="space-y-1">
              <span className="block text-xs font-medium text-muted-foreground">Horizonte</span>
              <Select value={String(horizon)} onValueChange={(value) => setHorizon(Number(value))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HORIZONS.map((months) => (
                    <SelectItem key={months} value={String(months)}>
                      {months} meses
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        </div>

        {data.cards.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            El resumen está consolidado pero no se encontraron movimientos proyectables para mostrar.
          </div>
        ) : null}

        {data.cards.map((card) => {
          const isCollapsed = collapsed.has(card.cardId);
          const nextMonthTotal = nextMonth
            ? card.totalsByMonth.find((item) => item.monthKey === nextMonth.monthKey)
            : undefined;

          return (
            <div key={card.cardId} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 border-b px-5 py-3.5 text-left hover:bg-muted/20"
                onClick={() =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (next.has(card.cardId)) next.delete(card.cardId);
                    else next.add(card.cardId);
                    return next;
                  })
                }
              >
                <div className="flex min-w-0 items-center gap-3">
                  {isCollapsed ? (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="truncate text-base font-bold text-foreground">{card.cardLabel}</p>
                      <span className="text-xs text-muted-foreground">{card.movements.length} movimientos</span>
                      {card.holderName ? (
                        <span className="truncate text-xs text-muted-foreground">{card.holderName}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {nextMonth?.label ?? "Próximo mes"}
                  </p>
                  {nextMonthTotal ? (
                    <AdjustmentTooltip
                      value={nextMonthTotal.totals}
                      detail={nextMonthTotal.adjustmentDetail}
                      emphasize
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </button>

              {!isCollapsed ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/10 text-muted-foreground">
                        <th className="sticky left-0 z-20 w-[140px] bg-card px-4 py-3 text-left text-xs font-medium">Fecha</th>
                        <th className="sticky left-[140px] z-20 min-w-[360px] bg-card px-4 py-3 text-left text-xs font-medium">Descripción</th>
                        {data.months.map((month) => (
                          <th key={month.monthKey} className="min-w-[170px] px-4 py-3 text-right text-xs font-medium">
                            {month.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {card.movements.map((movement) => (
                        <tr key={movement.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/10">
                          <td className="sticky left-0 z-10 bg-card px-4 py-3 text-muted-foreground">
                            {formatDate(movement.dateIso)}
                          </td>
                          <td className="sticky left-[140px] z-10 bg-card px-4 py-3 font-semibold text-foreground">
                            {movement.description}
                          </td>
                          {data.months.map((month) => {
                            const cell = movement.cells.find((item) => item.monthKey === month.monthKey);
                            return (
                              <td key={month.monthKey} className="px-4 py-3 text-right">
                                <CellValue cell={cell} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/20 font-semibold">
                        <td className="sticky left-0 z-10 bg-muted/20 px-4 py-3" />
                        <td className="sticky left-[140px] z-10 bg-muted/20 px-4 py-3 text-left text-foreground">
                          Total mensual
                        </td>
                        {data.months.map((month) => {
                          const cardMonth = card.totalsByMonth.find((item) => item.monthKey === month.monthKey);
                          const globalMonth = monthsByKey.get(month.monthKey);
                          const detail = cardMonth?.adjustmentDetail ??
                            (data.cards.length === 1 ? globalMonth?.adjustmentDetail : undefined);
                          return (
                            <td key={month.monthKey} className="px-4 py-3 text-right">
                              <AdjustmentTooltip
                                value={cardMonth?.totals ?? { ars: "0.00", usd: "0.00" }}
                                detail={detail}
                                emphasize
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
    </TooltipProvider>
  );
}
