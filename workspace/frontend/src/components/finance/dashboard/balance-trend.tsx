"use client";

import { BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/finance/charts/sparkline";
import {
  formatFinancialAmount,
  parseFinancialAmount,
} from "@/lib/finance/financial-amount";
import type { DashboardMonth } from "@/lib/finance/dashboard-api";

interface BalanceTrendProps {
  months: DashboardMonth[];
  onOpenReports: () => void;
}

function monthBalance(month: DashboardMonth, currency: "ARS" | "USD"): string {
  return currency === "ARS" ? month.balanceArs : month.balanceUsd;
}

function CurrencyTrend({
  currency,
  months,
}: {
  currency: "ARS" | "USD";
  months: DashboardMonth[];
}) {
  const values = months.map((month) =>
    parseFinancialAmount(monthBalance(month, currency)) ?? 0,
  );
  const first = months[0];
  const latest = months.at(-1);
  const hasActivity = values.some((value) => value !== 0);
  const enoughHistory = months.length >= 2;

  return (
    <div
      className="rounded-xl border bg-background/80 p-3"
      data-testid={`dashboard-balance-trend-${currency.toLowerCase()}`}
      data-point-count={months.length}
      data-source="dashboard.monthlyEvolution"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {currency}
        </p>
        <span className="text-[11px] text-muted-foreground">
          {months.length} mes{months.length === 1 ? "" : "es"}
        </span>
      </div>

      {enoughHistory ? (
        <>
          <div className="mt-2 text-emerald-600" aria-hidden="true">
            <Sparkline
              data={values}
              width={180}
              height={44}
              color={currency === "ARS" ? "#059669" : "#2563eb"}
              className="h-11 w-full"
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {first?.label}: {first ? formatFinancialAmount(monthBalance(first, currency), currency) : "—"}
            <span aria-hidden="true"> · </span>
            <span className="sr-only">. </span>
            {latest?.label}: {latest ? formatFinancialAmount(monthBalance(latest, currency), currency) : "—"}
          </p>
          {!hasActivity ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sin movimientos en {currency} dentro del histórico disponible.
            </p>
          ) : null}
          <ul className="sr-only" aria-label={`Serie mensual del balance ${currency}`}>
            {months.map((month) => (
              <li key={`${currency}-${month.monthKey}`}>
                {month.label}: {formatFinancialAmount(monthBalance(month, currency), currency)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Se necesitan al menos dos meses reales para dibujar la tendencia.
        </p>
      )}
    </div>
  );
}

export function BalanceTrend({ months, onOpenReports }: BalanceTrendProps) {
  return (
    <section
      className="rounded-2xl border bg-background/80 p-4"
      aria-labelledby="dashboard-balance-trend-title"
      data-testid="dashboard-balance-trend"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            id="dashboard-balance-trend-title"
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            <BarChart3 className="size-4" aria-hidden="true" />
            Tendencia real
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Balance mensual realizado informado por el backend.
          </p>
        </div>
      </div>

      {months.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
          Todavía no existe evolución mensual para representar.
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <CurrencyTrend currency="ARS" months={months} />
          <CurrencyTrend currency="USD" months={months} />
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 h-8 w-full justify-between px-2 text-xs"
        onClick={onOpenReports}
        data-testid="dashboard-balance-trend-reports"
      >
        Ver evolución en Reportes
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Button>
    </section>
  );
}
