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
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  fetchCardPayments,
  updateCardExchangeRate,
  type CardPaymentCell,
  type CardPaymentMoney,
  type CardPaymentsResponse,
} from "@/lib/finance/card-payments-api";
import { useFinanceUI } from "@/lib/finance/ui-store";

const HORIZONS = [2, 6, 12, 24] as const;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function parseNumber(value: string | null | undefined): number {
  const raw = (value ?? "").trim().replace(/\s/g, "");
  if (!raw) return 0;
  if (raw.includes(",")) {
    const parsed = Number(raw.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyIsZero(value: CardPaymentMoney): boolean {
  return parseNumber(value.ars) === 0 && parseNumber(value.usd) === 0;
}

function rateLabel(value: string | null | undefined): string {
  const rate = parseNumber(value);
  return rate > 0
    ? new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate)
    : "—";
}

function Money({ value, emphasize = false }: { value: CardPaymentMoney; emphasize?: boolean }) {
  if (moneyIsZero(value)) return <span className="text-muted-foreground/55">—</span>;
  return (
    <div className="flex flex-col items-end gap-0.5 tabular-nums">
      {parseNumber(value.ars) !== 0 ? (
        <span className={emphasize ? "font-bold text-foreground" : "font-semibold text-foreground"}>
          {formatFinancialAmount(value.ars, "ARS")}
        </span>
      ) : null}
      {parseNumber(value.usd) !== 0 ? (
        <span className={emphasize ? "font-bold text-emerald-500" : "font-semibold text-emerald-500"}>
          {formatFinancialAmount(value.usd, "USD")}
        </span>
      ) : null}
    </div>
  );
}

function RealTotal({
  value,
  rate,
  emphasize = false,
}: {
  value: CardPaymentMoney;
  rate: string | null | undefined;
  emphasize?: boolean;
}) {
  const ars = parseNumber(value.ars);
  const usd = parseNumber(value.usd);
  const numericRate = parseNumber(rate);

  if (usd !== 0 && numericRate <= 0) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <Money value={value} emphasize={emphasize} />
        <span className="text-[10px] text-amber-500">Falta cotización USD</span>
      </div>
    );
  }

  const combined = ars + usd * numericRate;
  return (
    <div className="flex flex-col items-end gap-0.5 tabular-nums">
      <span className={emphasize ? "font-bold text-foreground" : "font-semibold text-foreground"}>
        {formatFinancialAmount(combined.toFixed(2), "ARS")}
      </span>
      {usd !== 0 ? (
        <span className="max-w-[190px] text-right text-[10px] leading-tight text-muted-foreground">
          {formatFinancialAmount(value.ars, "ARS")} + {formatFinancialAmount(value.usd, "USD")} × {rateLabel(rate)}
        </span>
      ) : null}
    </div>
  );
}

function CellValue({ cell, tax }: { cell: CardPaymentCell | undefined; tax: boolean }) {
  if (!cell) return <span className="text-muted-foreground/55">—</span>;
  const title = tax
    ? cell.status === "confirmed"
      ? "Impuesto confirmado por el resumen"
      : "Impuesto estimado dinámicamente por CajaApp"
    : cell.installmentNumber !== null && cell.installmentTotal !== null
      ? `Cuota ${cell.installmentNumber}/${cell.installmentTotal}`
      : cell.status === "confirmed"
        ? "Confirmado por el resumen"
        : undefined;
  return (
    <span title={title} className="inline-flex justify-end">
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
  const [fxInput, setFxInput] = useState("");
  const [fxSaving, setFxSaving] = useState(false);
  const [fxError, setFxError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetchCardPayments(horizon, controller.signal)
      .then((response) => {
        setData(response);
        setFxInput(response.exchangeRate?.rate ?? "");
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "No se pudieron cargar los pagos de tarjeta.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [horizon]);

  const nextMonth = useMemo(() => {
    if (!data?.baseline) return data?.months[0] ?? null;
    return data.months.find((month) => month.monthKey > data.baseline!.periodKey) ?? data.months[0] ?? null;
  }, [data]);

  const saveExchangeRate = async () => {
    if (parseNumber(fxInput) <= 0) {
      setFxError("Ingresá una cotización USD válida.");
      return;
    }
    setFxSaving(true);
    setFxError(null);
    try {
      await updateCardExchangeRate(fxInput, new Date().toISOString().slice(0, 10));
      const refreshed = await fetchCardPayments(horizon);
      setData(refreshed);
      setFxInput(refreshed.exchangeRate?.rate ?? fxInput);
    } catch (caught) {
      setFxError(caught instanceof Error ? caught.message : "No se pudo guardar la cotización.");
    } finally {
      setFxSaving(false);
    }
  };

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
        <Button className="mt-5" onClick={() => setSection("tarjetas")}>Importar resumen</Button>
      </div>
    );
  }

  const exchangeRate = data.exchangeRate?.rate ?? null;

  return (
    <section className="space-y-4" data-testid="card-payments-view">
      <div className="flex flex-wrap items-end justify-end gap-3">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">Cotización USD</span>
          <div className="flex gap-2">
            <input
              aria-label="Cotización USD"
              inputMode="decimal"
              className="h-10 w-[135px] rounded-md border border-input bg-background px-3 text-right text-sm tabular-nums"
              placeholder="0,00"
              value={fxInput}
              onChange={(event) => setFxInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveExchangeRate();
              }}
            />
            <Button variant="outline" disabled={fxSaving} onClick={() => void saveExchangeRate()}>
              {fxSaving ? <Loader2 className="size-4 animate-spin" /> : "Aplicar"}
            </Button>
          </div>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">Horizonte</span>
          <Select value={String(horizon)} onValueChange={(value) => setHorizon(Number(value))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HORIZONS.map((months) => <SelectItem key={months} value={String(months)}>{months} meses</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
      </div>

      {fxError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{fxError}</div> : null}

      {data.cards.map((card) => {
        const isCollapsed = collapsed.has(card.cardId);
        const nextMonthTotal = nextMonth
          ? card.totalsByMonth.find((item) => item.monthKey === nextMonth.monthKey)
          : undefined;
        const firstTaxIndex = card.movements.findIndex((movement) => movement.sourceType === "tax_projection");

        return (
          <div key={card.cardId} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 border-b px-5 py-3.5 text-left hover:bg-muted/20"
              onClick={() => setCollapsed((current) => {
                const next = new Set(current);
                if (next.has(card.cardId)) next.delete(card.cardId); else next.add(card.cardId);
                return next;
              })}
            >
              <div className="flex min-w-0 items-center gap-3">
                {isCollapsed ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="truncate text-base font-bold text-foreground">{card.cardLabel}</p>
                    <span className="text-xs text-muted-foreground">{card.movements.length} movimientos</span>
                    {card.holderName ? <span className="truncate text-xs text-muted-foreground">{card.holderName}</span> : null}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{nextMonth?.label ?? "Próximo mes"}</p>
                {nextMonthTotal ? <RealTotal value={nextMonthTotal.totals} rate={exchangeRate} emphasize /> : <span className="text-muted-foreground">—</span>}
              </div>
            </button>

            {!isCollapsed ? (
              <div
                className="relative isolate overflow-x-auto overscroll-x-contain pb-2"
                style={{ scrollbarGutter: "stable" }}
              >
                <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="sticky left-0 z-40 w-[140px] min-w-[140px] max-w-[140px] border-b bg-card px-4 py-3 text-left text-xs font-medium">Fecha</th>
                      <th className="sticky left-[140px] z-40 w-[360px] min-w-[360px] max-w-[360px] border-b bg-card px-4 py-3 text-left text-xs font-medium shadow-[10px_0_14px_-14px_rgba(0,0,0,0.9)]">Descripción</th>
                      {data.months.map((month) => (
                        <th key={month.monthKey} className="min-w-[180px] border-b bg-muted/10 px-4 py-3 text-right text-xs font-medium">{month.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {card.movements.map((movement, index) => {
                      const tax = movement.sourceType === "tax_projection";
                      const firstTax = tax && index === firstTaxIndex;
                      return (
                        <tr key={movement.id} className={firstTax ? "[&>td]:border-t-2 [&>td]:border-t-border" : ""}>
                          <td className="sticky left-0 z-20 w-[140px] min-w-[140px] max-w-[140px] border-b bg-card px-4 py-3 align-top text-muted-foreground">{formatDate(movement.dateIso)}</td>
                          <td className="sticky left-[140px] z-20 w-[360px] min-w-[360px] max-w-[360px] border-b bg-card px-4 py-3 align-top shadow-[10px_0_14px_-14px_rgba(0,0,0,0.9)]">
                            <p className={tax ? "font-semibold text-amber-500" : "font-semibold text-foreground"}>{movement.description}</p>
                            {tax ? <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Impuesto dinámico</p> : null}
                          </td>
                          {data.months.map((month) => (
                            <td key={month.monthKey} className="min-w-[180px] border-b px-4 py-3 text-right align-top">
                              <CellValue cell={movement.cells.find((cell) => cell.monthKey === month.monthKey)} tax={tax} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="sticky left-0 z-30 w-[140px] min-w-[140px] max-w-[140px] border-t-2 bg-card px-4 py-3" />
                      <td className="sticky left-[140px] z-30 w-[360px] min-w-[360px] max-w-[360px] border-t-2 bg-card px-4 py-3 text-right text-xs uppercase tracking-wide shadow-[10px_0_14px_-14px_rgba(0,0,0,0.9)]">Total real</td>
                      {data.months.map((month) => {
                        const total = card.totalsByMonth.find((item) => item.monthKey === month.monthKey)?.totals ?? { ars: "0.00", usd: "0.00" };
                        return (
                          <td key={month.monthKey} className="min-w-[180px] border-t-2 bg-card px-4 py-3 text-right">
                            <RealTotal value={total} rate={exchangeRate} emphasize />
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

      {data.warnings.length > 0 ? (
        <div className="rounded-xl border bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
          {data.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}
    </section>
  );
}
