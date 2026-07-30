"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CalendarDays, ChevronDown, RefreshCw, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import { getIncomeOverview, type IncomeOverview } from "@/lib/finance/incomes-api";
import { buildIncomeDashboardPresentation } from "@/lib/finance/income-presentation";
import { IngresosSection as IngresosSectionBase } from "./ingresos-section.base";

function monthKeyWithOffset(offset: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function money(value: string | null, currency: "ARS" | "USD" = "ARS") {
  return formatFinancialAmount(value ?? "0", currency);
}

export function IngresosSection() {
  const [overview, setOverview] = useState<IncomeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOverview(await getIncomeOverview(monthKeyWithOffset(-3), monthKeyWithOffset(12)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los ingresos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const view = useMemo(
    () => (overview ? buildIncomeDashboardPresentation(overview) : null),
    [overview],
  );

  if (loading && !view) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Cargando ingresos…</div>;
  }

  return (
    <div className="space-y-6" data-testid="incomes-redesigned-section">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400/80">Ingresos</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Tu dinero, ordenado por realidad</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Primero ves lo que realmente cobraste. Las estimaciones y ajustes quedan en segundo plano.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {view ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={Banknote}
              label="Ingreso real del mes"
              value={money(view.currentRealArs)}
              detail={view.currentMonthKey}
            />
            <MetricCard
              icon={CalendarDays}
              label="Próximo estimado"
              value={money(view.nextEstimatedArs)}
              detail="Sólo si existe una proyección distinta de cero"
            />
            <MetricCard
              icon={WalletCards}
              label="Fuentes activas"
              value={String(view.activeSources)}
              detail="Sueldos y otros ingresos recurrentes"
            />
          </div>

          <Card className="overflow-hidden border-emerald-500/10 bg-card/80 shadow-sm">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="text-lg">Fuentes de ingreso</CardTitle>
              <p className="text-sm text-muted-foreground">Cada fuente muestra su último neto real confirmado.</p>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
              {view.sources.map((source) => (
                <div key={source.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{source.name}</h3>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                          {source.active ? "Activa" : "Pausada"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{source.employer}</p>
                    </div>
                    <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
                      <Banknote className="size-5" />
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Último neto real</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {source.lastRealAmount ? money(source.lastRealAmount, source.currency) : "Sin valor real"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {source.lastRealMonthKey ? `Período ${source.lastRealMonthKey}` : "Todavía no hay un recibo aceptado"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border px-2 py-1">
                      {source.hasAutomaticIncrease ? "Con aumento automático" : "Sin aumento automático"}
                    </span>
                    {source.nextEstimatedAmount ? (
                      <span className="rounded-full border px-2 py-1">
                        Próximo: {money(source.nextEstimatedAmount, source.currency)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-emerald-500/10 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Calendario de ingresos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Se muestran únicamente meses con importes reales o estimados distintos de cero.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {view.months.length > 0 ? (
                view.months.map((month) => (
                  <div key={month.monthKey} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{month.monthKey}</p>
                        <h3 className="mt-1 font-semibold capitalize">{month.label}</h3>
                      </div>
                      <p className="font-semibold tabular-nums">{money(month.totalArs)}</p>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      {Number(month.realArs) > 0 ? (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Real</span>
                          <span className="tabular-nums text-emerald-300">{money(month.realArs)}</span>
                        </div>
                      ) : null}
                      {Number(month.estimatedArs) > 0 ? (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Estimado</span>
                          <span className="tabular-nums">{money(month.estimatedArs)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-3 border-t pt-2 text-xs text-muted-foreground">
                        <span>Fuentes con valor</span>
                        <span>{month.sourceCount}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Todavía no hay meses con importes relevantes.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <details className="group rounded-2xl border border-border/70 bg-card/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-medium">
          Administrar fuentes, importaciones y ajustes
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border/60 p-4">
          <IngresosSectionBase />
        </div>
      </details>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-emerald-500/10 bg-card/80 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300">
            <Icon className="size-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
