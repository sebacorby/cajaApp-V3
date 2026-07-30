"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  FileUp,
  RefreshCw,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { SalaryReceiptsPanel } from "@/components/finance/imports/salary-receipts-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  deleteIncomeSource,
  getIncomeOverview,
  type IncomeOverview,
} from "@/lib/finance/incomes-api";
import { buildIncomeDashboardPresentation } from "@/lib/finance/income-presentation";

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
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(
        await getIncomeOverview(monthKeyWithOffset(-6), monthKeyWithOffset(12)),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar los ingresos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const view = useMemo(
    () => (overview ? buildIncomeDashboardPresentation(overview) : null),
    [overview],
  );

  async function removeSource(sourceId: string, sourceName: string) {
    const confirmed = window.confirm(
      `¿Eliminar “${sourceName}”? Se eliminarán también sus recibos, valores reales, proyecciones y archivos asociados.`,
    );
    if (!confirmed) return;

    setDeletingId(sourceId);
    setError(null);
    try {
      await deleteIncomeSource(sourceId);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo eliminar el ingreso.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && !view) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Cargando ingresos…
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="incomes-single-view">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400/80">
            Ingresos
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Sueldos e ingresos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cada sueldo aparece una sola vez. El importe principal es siempre el último neto real confirmado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button onClick={() => setImporting((current) => !current)}>
            {importing ? <X className="mr-2 size-4" /> : <FileUp className="mr-2 size-4" />}
            {importing ? "Cerrar carga" : "Cargar o reemplazar recibo"}
          </Button>
        </div>
      </header>

      {error ? (
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {importing ? (
        <Card className="border-emerald-500/20 bg-card/90 shadow-sm">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-lg">Cargar recibo de sueldo</CardTitle>
            <p className="text-sm text-muted-foreground">
              Una nueva carga reemplaza el valor del mismo período y recalcula la fuente asociada.
            </p>
          </CardHeader>
          <CardContent className="p-5">
            <SalaryReceiptsPanel
              sources={overview?.sources ?? []}
              onAccepted={() => {
                setImporting(false);
                void load();
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      {view ? (
        <>
          <section className="grid gap-4 md:grid-cols-3" aria-label="Resumen de ingresos">
            <MetricCard
              icon={Banknote}
              label="Cobrado este mes"
              value={money(view.currentRealArs)}
              detail={view.currentMonthKey}
            />
            <MetricCard
              icon={CalendarDays}
              label="Próximo estimado"
              value={money(view.nextEstimatedArs)}
              detail="Sólo proyecciones con valor"
            />
            <MetricCard
              icon={WalletCards}
              label="Sueldos activos"
              value={String(view.activeSources)}
              detail="Una tarjeta por fuente"
            />
          </section>

          <section className="space-y-3" aria-labelledby="salary-sources-title">
            <div>
              <h2 id="salary-sources-title" className="text-lg font-semibold">
                Tus sueldos
              </h2>
              <p className="text-sm text-muted-foreground">
                El último recibo aceptado define el valor real de cada fuente.
              </p>
            </div>

            {view.sources.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {view.sources.map((source) => (
                  <Card
                    key={source.id}
                    className="border-emerald-500/10 bg-card/80 shadow-sm"
                    data-testid={`income-source-${source.id}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold">{source.name}</h3>
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                              {source.active ? "Activa" : "Pausada"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {source.employer}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void removeSource(source.id, source.name)}
                          disabled={deletingId === source.id}
                          aria-label={`Eliminar ${source.name}`}
                        >
                          {deletingId === source.id ? (
                            <RefreshCw className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Último neto real
                          </p>
                          <p className="mt-1 text-3xl font-bold tabular-nums">
                            {source.lastRealAmount
                              ? money(source.lastRealAmount, source.currency)
                              : "Sin recibo aceptado"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {source.lastRealMonthKey
                              ? `Período ${source.lastRealMonthKey}`
                              : "Cargá un recibo para establecer el valor real"}
                          </p>
                        </div>
                        {source.nextEstimatedAmount ? (
                          <div className="rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-right">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Próximo estimado
                            </p>
                            <p className="mt-1 font-semibold tabular-nums">
                              {money(source.nextEstimatedAmount, source.currency)}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed bg-card/50">
                <CardContent className="flex flex-col items-center px-6 py-12 text-center">
                  <Banknote className="size-10 text-muted-foreground" />
                  <h3 className="mt-4 font-semibold">Todavía no hay sueldos cargados</h3>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Cargá un recibo y CajaApp creará una única fuente con su neto real.
                  </p>
                  <Button className="mt-5" onClick={() => setImporting(true)}>
                    <FileUp className="mr-2 size-4" />
                    Cargar primer recibo
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          <section aria-labelledby="income-calendar-title">
            <Card className="border-emerald-500/10 bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle id="income-calendar-title" className="text-lg">
                  Próximos ingresos
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sólo aparecen meses con importes distintos de cero. Real y estimado se muestran una vez.
                </p>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {view.months.length > 0 ? (
                  <div className="divide-y divide-border/60">
                    {view.months.slice(0, 8).map((month) => (
                      <div
                        key={month.monthKey}
                        className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6"
                      >
                        <div>
                          <p className="font-medium capitalize">{month.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {month.sourceCount} {month.sourceCount === 1 ? "fuente" : "fuentes"}
                          </p>
                        </div>
                        <div className="text-sm sm:text-right">
                          {Number(month.realArs) > 0 ? (
                            <p>
                              <span className="text-muted-foreground">Real </span>
                              <span className="font-medium tabular-nums text-emerald-300">
                                {money(month.realArs)}
                              </span>
                            </p>
                          ) : null}
                          {Number(month.estimatedArs) > 0 ? (
                            <p>
                              <span className="text-muted-foreground">Estimado </span>
                              <span className="font-medium tabular-nums">
                                {money(month.estimatedArs)}
                              </span>
                            </p>
                          ) : null}
                        </div>
                        <p className="text-lg font-semibold tabular-nums sm:min-w-40 sm:text-right">
                          {money(month.totalArs)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                    No hay ingresos reales o estimados para mostrar.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
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
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
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
