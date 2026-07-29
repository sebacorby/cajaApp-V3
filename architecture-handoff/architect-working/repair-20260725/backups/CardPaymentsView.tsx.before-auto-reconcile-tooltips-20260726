"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  FileUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  fetchCardPayments,
  type CardPaymentCell,
  type CardPaymentMoney,
  type CardPaymentsResponse,
  type IssuerProjectionValidation,
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

function Money({ value, emphasize = false }: { value: CardPaymentMoney; emphasize?: boolean }) {
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

function CellValue({ cell }: { cell: CardPaymentCell | undefined }) {
  if (!cell) return <span className="text-muted-foreground/55">—</span>;
  const hasInstallment =
    cell.installmentNumber !== null && cell.installmentTotal !== null;

  return (
    <div className="flex flex-col items-end gap-1">
      <Money value={cell} />
      {hasInstallment ? (
        <span className="text-[10px] font-medium text-muted-foreground">
          cuota {cell.installmentNumber}/{cell.installmentTotal}
        </span>
      ) : cell.status === "confirmed" ? (
        <span className="text-[10px] font-medium text-muted-foreground">confirmado</span>
      ) : null}
    </div>
  );
}

function validationLabel(item: IssuerProjectionValidation): {
  text: string;
  className: string;
} {
  if (item.status === "matched") {
    return {
      text: "Coincide",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    };
  }
  if (item.status === "mismatch") {
    return {
      text: "Revisar diferencia",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    };
  }
  return {
    text: "Sin correspondencia automática",
    className: "border-border bg-muted/50 text-muted-foreground",
  };
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
  const monthMap = useMemo(
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
      <section className="space-y-5" data-testid="card-payments-view">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagos de tarjeta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pagos confirmados por resúmenes aceptados y cuotas futuras ya comprometidas.
          </p>
        </div>
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center">
          <FileUp className="mb-4 size-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Todavía no hay un resumen consolidado</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Importá un resumen en Tarjetas. Una vez validado y aceptado, el pago del período y sus cuotas futuras aparecerán acá.
          </p>
          <Button className="mt-5" onClick={() => setSection("tarjetas")}>
            Importar resumen
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5" data-testid="card-payments-view">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagos de tarjeta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El primer mes está confirmado por el último resumen aceptado. Los siguientes muestran compromisos conocidos y cuotas proyectadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Horizonte</span>
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
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Resumen base</p>
          <p className="mt-1 font-semibold text-foreground">
            {data.baseline.brand || data.baseline.bankName || "Tarjeta"} · {data.baseline.periodKey}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{data.baseline.fileName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pago confirmado</p>
          <div className="mt-1"><Money value={data.baseline.total} emphasize /></div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Vencimiento</p>
          <p className="mt-1 font-semibold text-foreground">{formatDate(data.baseline.currentDueDate)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Próximo mes conocido</p>
          <div className="mt-1">
            {nextMonth ? <Money value={nextMonth.totals} emphasize /> : <span className="text-muted-foreground">—</span>}
          </div>
        </div>
      </div>

      {data.cards.map((card) => {
        const isCollapsed = collapsed.has(card.cardId);
        const nextMonthTotal =
          nextMonth && card.totalsByMonth.find((item) => item.monthKey === nextMonth.monthKey)?.totals;

        return (
          <div key={card.cardId} className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 border-b px-4 py-3 text-left hover:bg-muted/30"
              onClick={() =>
                setCollapsed((current) => {
                  const next = new Set(current);
                  if (next.has(card.cardId)) next.delete(card.cardId);
                  else next.add(card.cardId);
                  return next;
                })
              }
            >
              <div className="flex min-w-0 items-center gap-2">
                {isCollapsed ? <ChevronRight className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{card.cardLabel}</p>
                  {card.holderName ? (
                    <p className="truncate text-xs text-muted-foreground">{card.holderName}</p>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {nextMonth ? nextMonth.label : "Próximo mes"}
                </p>
                <Money value={nextMonthTotal ?? { ars: "0.00", usd: "0.00" }} emphasize />
              </div>
            </button>

            {!isCollapsed ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/25">
                      <th className="sticky left-0 z-20 min-w-[110px] bg-card px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                      <th className="sticky left-[110px] z-20 min-w-[300px] bg-card px-4 py-3 text-left font-medium text-muted-foreground">Descripción</th>
                      {data.months.map((month) => (
                        <th key={month.monthKey} className="min-w-[145px] px-4 py-3 text-right">
                          <div className="font-semibold text-foreground">{month.label}</div>
                          <div className={month.status === "confirmed" ? "mt-0.5 text-[10px] font-medium text-emerald-500" : "mt-0.5 text-[10px] font-medium text-muted-foreground"}>
                            {month.status === "confirmed" ? "Confirmado" : "Proyectado"}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {card.movements.map((movement) => {
                      const cells = new Map(movement.cells.map((cell) => [cell.monthKey, cell]));
                      return (
                        <tr key={movement.id} className="border-b border-border/65 last:border-b-0 hover:bg-muted/15">
                          <td className="sticky left-0 z-10 bg-card px-4 py-3 text-muted-foreground">{formatDate(movement.dateIso)}</td>
                          <td className="sticky left-[110px] z-10 bg-card px-4 py-3">
                            <p className="font-medium text-foreground">{movement.description}</p>
                            {movement.sourceType === "reconciliation" ? (
                              <p className="mt-1 text-[10px] text-muted-foreground">Ajuste para reconciliar el total confirmado del resumen.</p>
                            ) : null}
                          </td>
                          {data.months.map((month) => (
                            <td key={month.monthKey} className="px-4 py-3 text-right align-top">
                              <CellValue cell={cells.get(month.monthKey)} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-semibold">
                      <td className="sticky left-0 z-10 bg-card px-4 py-3" />
                      <td className="sticky left-[110px] z-10 bg-card px-4 py-3 text-foreground">Total mensual</td>
                      {data.months.map((month) => {
                        const total = card.totalsByMonth.find((item) => item.monthKey === month.monthKey)?.totals ?? { ars: "0.00", usd: "0.00" };
                        return (
                          <td key={month.monthKey} className="px-4 py-3 text-right">
                            <Money value={total} emphasize />
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

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground">Validación contra el emisor</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Esta referencia viene del resumen y sólo valida las cuotas calculadas por CajaApp. No se suma al pago.
            </p>
          </div>
        </div>

        {!data.issuerValidation.available ? (
          <p className="mt-4 rounded-lg bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Este resumen no informó una referencia futura utilizable. Las cuotas proyectadas se calculan con los consumos aceptados.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Referencia del emisor</th>
                  <th className="px-3 py-2 font-medium">Mes de pago</th>
                  <th className="px-3 py-2 text-right font-medium">Emisor</th>
                  <th className="px-3 py-2 text-right font-medium">CajaApp</th>
                  <th className="px-3 py-2 text-right font-medium">Diferencia</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.issuerValidation.items.map((item) => {
                  const label = validationLabel(item);
                  return (
                    <tr key={item.referenceId} className="border-b border-border/60 last:border-b-0">
                      <td className="px-3 py-3 font-medium text-foreground">{item.issuerPeriodLabel}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {item.targetPaymentMonthKey ? monthMap.get(item.targetPaymentMonthKey)?.label ?? item.targetPaymentMonthKey : "—"}
                      </td>
                      <td className="px-3 py-3 text-right"><Money value={item.issuerAmount} /></td>
                      <td className="px-3 py-3 text-right"><Money value={item.calculatedInstallments} /></td>
                      <td className="px-3 py-3 text-right"><Money value={item.difference} /></td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${label.className}`}>
                          {item.status === "matched" ? <CheckCircle2 className="size-3" /> : <CircleAlert className="size-3" />}
                          {label.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
