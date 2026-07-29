"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Download,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { CategoryDonut } from "@/components/finance/charts/category-donut";
import type {
  CategoryDistributionDatum,
  FinanceChartCurrency,
  MonthlyEvolutionDatum,
} from "@/components/finance/charts/chart-contracts";
import { MonthlyEvolutionChart } from "@/components/finance/charts/monthly-evolution-chart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  downloadReportsCsv,
  getReportsOverview,
  type ReportMonthlyRow,
  type ReportsOverview,
} from "@/lib/finance/reports-api";
import { getPeriodRange, useFinanceUI } from "@/lib/finance/ui-store";

const REPORT_CATEGORY_COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

function percentageLabel(value: string | null): string {
  if (value === null) return "Sin base comparable";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "Sin base comparable";
  return `${parsed > 0 ? "+" : ""}${parsed.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  })}%`;
}

function SummaryCard({
  title,
  ars,
  usd,
  helper,
  tone = "default",
}: {
  title: string;
  ars: string;
  usd: string;
  helper: string;
  tone?: "default" | "income" | "expense";
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p
          className={`mt-2 text-xl font-semibold tabular-nums ${
            tone === "income"
              ? "text-emerald-700 dark:text-emerald-400"
              : tone === "expense"
                ? "text-rose-700 dark:text-rose-400"
                : ""
          }`}
        >
          {formatFinancialAmount(ars, "ARS")}
        </p>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">
          {formatFinancialAmount(usd, "USD")}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ComparisonBadge({ value }: { value: string | null }) {
  const parsed = value === null ? null : Number(value);
  const positive = parsed !== null && Number.isFinite(parsed) && parsed > 0;
  const negative = parsed !== null && Number.isFinite(parsed) && parsed < 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
        positive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
          : negative
            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {positive ? (
        <TrendingUp className="size-3" aria-hidden="true" />
      ) : negative ? (
        <TrendingDown className="size-3" aria-hidden="true" />
      ) : null}
      {percentageLabel(value)}
    </span>
  );
}

function monthlyChartData(rows: ReportMonthlyRow[]): MonthlyEvolutionDatum[] {
  return rows.map((row) => ({
    monthKey: row.monthKey,
    label: row.label,
    range: row.range,
    incomeArs: row.actual.incomeArs,
    expenseArs: row.actual.expenseArs,
    balanceArs: row.actual.resultArs,
    incomeUsd: row.actual.incomeUsd,
    expenseUsd: row.actual.expenseUsd,
    balanceUsd: row.actual.resultUsd,
    projectedExpenseArs: row.projected.expenseArs,
    projectedExpenseUsd: row.projected.expenseUsd,
  }));
}

function categoryChartData(
  categories: ReportsOverview["categories"],
): CategoryDistributionDatum[] {
  return categories.map((category, index) => ({
    id: category.id ?? `uncategorized-${index}`,
    name: category.name,
    color: REPORT_CATEGORY_COLORS[index % REPORT_CATEGORY_COLORS.length],
    amountArs: category.amountArs,
    amountUsd: category.amountUsd,
    shareArs: category.shareArs,
    shareUsd: category.shareUsd,
    records: category.records,
  }));
}

function selectedAmount(
  item: { amountArs: string; amountUsd: string },
  currency: FinanceChartCurrency,
): string {
  return currency === "ARS" ? item.amountArs : item.amountUsd;
}

function selectedShare(
  item: { shareArs: string | null; shareUsd: string | null },
  currency: FinanceChartCurrency,
): string | null {
  return currency === "ARS" ? item.shareArs : item.shareUsd;
}

function ReportCurrencySelector({
  currency,
  onChange,
}: {
  currency: FinanceChartCurrency;
  onChange: (currency: FinanceChartCurrency) => void;
}) {
  return (
    <div
      className="flex gap-1"
      role="group"
      aria-label="Moneda de visualización de Reportes"
    >
      {(["ARS", "USD"] as const).map((item) => (
        <Button
          key={item}
          type="button"
          size="sm"
          variant={currency === item ? "secondary" : "ghost"}
          aria-pressed={currency === item}
          onClick={() => onChange(item)}
          data-testid={`reports-currency-${item.toLowerCase()}`}
        >
          {item}
        </Button>
      ))}
    </div>
  );
}

export function ReportesSection() {
  const period = useFinanceUI((state) => state.period);
  const openMovementDrilldown = useFinanceUI(
    (state) => state.openMovementDrilldown,
  );
  const globalRange = useMemo(() => getPeriodRange(period), [period]);
  const [from, setFrom] = useState(globalRange.from);
  const [to, setTo] = useState(globalRange.to);
  const [currency, setCurrency] = useState<FinanceChartCurrency>("ARS");
  const [report, setReport] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFrom(globalRange.from);
    setTo(globalRange.to);
  }, [globalRange.from, globalRange.to]);

  const loadReport = useCallback(
    async (silent = false) => {
      if (!from || !to || from > to) {
        setErrorMessage(
          "Revisá el rango: la fecha inicial debe ser anterior o igual a la final.",
        );
        return;
      }
      if (silent) setRefreshing(true);
      else setLoading(true);
      setErrorMessage(null);
      try {
        setReport(await getReportsOverview(from, to));
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los reportes.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [from, to],
  );

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const applyRange = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void loadReport();
    },
    [loadReport],
  );

  const exportCsv = useCallback(async () => {
    setExporting(true);
    setErrorMessage(null);
    try {
      await downloadReportsCsv(from, to);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo exportar el reporte.",
      );
    } finally {
      setExporting(false);
    }
  }, [from, to]);

  const openMonthly = useCallback(
    (row: MonthlyEvolutionDatum, type: "income" | "expense") => {
      if (!row.range) return;
      openMovementDrilldown({
        from: row.range.from,
        to: row.range.to,
        label: `${row.label} · ${type === "income" ? "Ingresos" : "Egresos"}`,
        type,
        status: "actual",
        includeProjected: false,
      });
    },
    [openMovementDrilldown],
  );

  const monthly = useMemo(
    () => monthlyChartData(report?.monthly ?? []),
    [report?.monthly],
  );
  const categories = useMemo(
    () => categoryChartData(report?.categories ?? []),
    [report?.categories],
  );

  if (loading && !report) {
    return (
      <div
        className="flex min-h-72 items-center justify-center"
        data-testid="reports-section"
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Calculando reportes reales…
        </span>
      </div>
    );
  }

  const comparison = report
    ? currency === "ARS"
      ? {
          income: report.comparison.incomeArs,
          expense: report.comparison.expenseArs,
          result: report.comparison.resultArs,
        }
      : {
          income: report.comparison.incomeUsd,
          expense: report.comparison.expenseUsd,
          result: report.comparison.resultUsd,
        }
    : null;

  return (
    <div className="flex flex-col gap-5" data-testid="reports-section">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            className="flex flex-col gap-3 lg:flex-row lg:items-end"
            onSubmit={applyRange}
          >
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="reports-from">Desde</Label>
                <Input
                  id="reports-from"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reports-to">Hasta</Label>
                <Input
                  id="reports-to"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={refreshing}>
                {refreshing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Actualizar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void exportCsv()}
                disabled={exporting || !report}
              >
                {exporting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                CSV
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {errorMessage}
        </div>
      ) : null}

      {report && report.dataQuality.totalRecords === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <BarChart3 className="size-8 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">No hay movimientos en este rango</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Probá con un período más amplio o cargá movimientos reales antes
                de generar el reporte.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {report && report.dataQuality.totalRecords > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Ingresos reales"
              ars={report.summary.actual.incomeArs}
              usd={report.summary.actual.incomeUsd}
              helper={`Comparación: ${percentageLabel(
                report.comparison.incomeArs,
              )} ARS`}
              tone="income"
            />
            <SummaryCard
              title="Egresos reales"
              ars={report.summary.actual.expenseArs}
              usd={report.summary.actual.expenseUsd}
              helper={`Comparación: ${percentageLabel(
                report.comparison.expenseArs,
              )} ARS`}
              tone="expense"
            />
            <SummaryCard
              title="Resultado real"
              ars={report.summary.actual.resultArs}
              usd={report.summary.actual.resultUsd}
              helper={`Tasa de ahorro ARS: ${percentageLabel(
                report.summary.actual.savingsRateArs,
              )}`}
            />
            <SummaryCard
              title="Promedio mensual"
              ars={report.summary.monthlyAverageActual.resultArs}
              usd={report.summary.monthlyAverageActual.resultUsd}
              helper={`${report.monthCount} mes${
                report.monthCount === 1 ? "" : "es"
              } analizados`}
            />
          </div>

          <Card data-testid="reports-visual-controls">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="font-medium">Moneda de los gráficos y tablas</p>
                <p className="text-sm text-muted-foreground">
                  ARS y USD se muestran por separado, sin conversión ni suma entre
                  monedas.
                </p>
              </div>
              <ReportCurrencySelector
                currency={currency}
                onChange={setCurrency}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Comparación con el período anterior · {currency}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">
                  Ingresos {currency}
                </p>
                <div className="mt-2">
                  <ComparisonBadge value={comparison?.income ?? null} />
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">
                  Egresos {currency}
                </p>
                <div className="mt-2">
                  <ComparisonBadge value={comparison?.expense ?? null} />
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">
                  Resultado {currency}
                </p>
                <div className="mt-2">
                  <ComparisonBadge value={comparison?.result ?? null} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="reports-monthly-visual-card">
            <CardHeader>
              <CardTitle className="text-base">Evolución mensual real</CardTitle>
              <p className="text-sm text-muted-foreground">
                El gráfico y su tabla accesible usan los mismos importes recibidos
                desde reportsService. Seleccioná un mes para abrir sus movimientos.
              </p>
            </CardHeader>
            <CardContent>
              <MonthlyEvolutionChart
                data={monthly}
                currency={currency}
                showCurrencySelector={false}
                onOpen={openMonthly}
                testIdPrefix="reports"
                dataSource="reports.monthly"
                emptyMessage="No existe evolución mensual para el rango seleccionado."
              />
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card data-testid="reports-category-visual-card">
              <CardHeader>
                <CardTitle className="text-base">Gastos por categoría</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Vista lista o donut del payload autoritativo, en {currency}.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <CategoryDonut
                  categories={categories}
                  currency={currency}
                  testIdPrefix="reports"
                  dataSource="reports.categories"
                  emptyMessage="No hay gastos categorizados en el rango seleccionado."
                />
                <div className="overflow-x-auto">
                  <table
                    className="w-full min-w-[560px] text-sm"
                    aria-label={`Tabla equivalente de gastos por categoría en ${currency}`}
                    data-testid="reports-category-table"
                  >
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th scope="col" className="pb-2">Categoría</th>
                        <th scope="col" className="pb-2 text-right">
                          Importe {currency}
                        </th>
                        <th scope="col" className="pb-2 text-right">
                          Participación
                        </th>
                        <th scope="col" className="pb-2 text-right">
                          Registros
                        </th>
                        <th scope="col">
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.categories.map((item) => (
                        <tr
                          key={item.id ?? item.name}
                          className="border-b last:border-0"
                          data-testid={`reports-category-table-row-${
                            item.id ?? item.name
                          }`}
                          data-currency={currency}
                          data-amount-raw={selectedAmount(item, currency)}
                          data-share-raw={selectedShare(item, currency) ?? undefined}
                        >
                          <td className="py-3 font-medium">{item.name}</td>
                          <td className="py-3 text-right tabular-nums">
                            {formatFinancialAmount(
                              selectedAmount(item, currency),
                              currency,
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {percentageLabel(selectedShare(item, currency))}
                          </td>
                          <td className="py-3 text-right">{item.records}</td>
                          <td className="py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                openMovementDrilldown({
                                  from,
                                  to,
                                  label: `Categoría · ${item.name}`,
                                  type: "expense",
                                  category: item.id ?? item.name,
                                  status: "actual",
                                })
                              }
                            >
                              Ver
                              <ArrowRight className="ml-1 size-3" aria-hidden="true" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Gastos por fuente · {currency}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table
                  className="w-full min-w-[560px] text-sm"
                  aria-label={`Gastos por fuente en ${currency}`}
                >
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th scope="col" className="pb-2">Fuente</th>
                      <th scope="col" className="pb-2 text-right">
                        Importe {currency}
                      </th>
                      <th scope="col" className="pb-2 text-right">
                        Participación
                      </th>
                      <th scope="col" className="pb-2 text-right">
                        Registros
                      </th>
                      <th scope="col">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sources.map((item) => (
                      <tr
                        key={item.sourceType}
                        className="border-b last:border-0"
                      >
                        <td className="py-3 font-medium">{item.label}</td>
                        <td className="py-3 text-right tabular-nums">
                          {formatFinancialAmount(
                            selectedAmount(item, currency),
                            currency,
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {percentageLabel(selectedShare(item, currency))}
                        </td>
                        <td className="py-3 text-right">{item.records}</td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              openMovementDrilldown({
                                from,
                                to,
                                label: `Fuente · ${item.label}`,
                                type: "expense",
                                source: item.sourceType,
                                status: "actual",
                              })
                            }
                          >
                            Ver
                            <ArrowRight className="ml-1 size-3" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Deuda y compromisos de tarjeta
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Importes reales, pendientes y proyectados, siempre separados por
                moneda.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2">Mes</th>
                    <th className="pb-2 text-right">Real ARS</th>
                    <th className="pb-2 text-right">Proyectado ARS</th>
                    <th className="pb-2 text-right">Real USD</th>
                    <th className="pb-2 text-right">Proyectado USD</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {report.cardDebt.map((item) => (
                    <tr key={item.monthKey} className="border-b last:border-0">
                      <td className="py-3 font-medium capitalize">
                        {item.label}
                      </td>
                      <td className="py-3 text-right">
                        {formatFinancialAmount(item.actual.expenseArs, "ARS")}
                      </td>
                      <td className="py-3 text-right">
                        {formatFinancialAmount(item.projected.expenseArs, "ARS")}
                      </td>
                      <td className="py-3 text-right">
                        {formatFinancialAmount(item.actual.expenseUsd, "USD")}
                      </td>
                      <td className="py-3 text-right">
                        {formatFinancialAmount(item.projected.expenseUsd, "USD")}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            openMovementDrilldown({
                              from: item.range.from,
                              to: item.range.to,
                              label: `${item.label} · Tarjetas`,
                              type: "expense",
                              source: "card_",
                              includeProjected: true,
                            })
                          }
                        >
                          Detalle
                          <ArrowRight className="ml-1 size-3" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {report.recurringIncome.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Evolución de ingresos recurrentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.recurringIncome.map((source) => (
                  <div key={source.sourceId} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{source.label}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          openMovementDrilldown({
                            from,
                            to,
                            label: `Ingreso recurrente · ${source.label}`,
                            type: "income",
                            source: "income_recurring",
                            includeProjected: true,
                          })
                        }
                      >
                        Ver movimientos
                      </Button>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[620px] text-sm">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground">
                            <th>Mes</th>
                            <th className="text-right">Real ARS</th>
                            <th className="text-right">Proyectado ARS</th>
                            <th className="text-right">Real USD</th>
                            <th className="text-right">Proyectado USD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {source.months.map((month) => (
                            <tr key={month.monthKey} className="border-t">
                              <td className="py-2 capitalize">{month.label}</td>
                              <td className="py-2 text-right">
                                {formatFinancialAmount(month.actualArs, "ARS")}
                              </td>
                              <td className="py-2 text-right">
                                {formatFinancialAmount(month.projectedArs, "ARS")}
                              </td>
                              <td className="py-2 text-right">
                                {formatFinancialAmount(month.actualUsd, "USD")}
                              </td>
                              <td className="py-2 text-right">
                                {formatFinancialAmount(month.projectedUsd, "USD")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Calidad del dato: {report.dataQuality.totalRecords} registros ·{" "}
            {report.dataQuality.unclassifiedRecords} sin clasificar ·{" "}
            {report.dataQuality.projectedRecords} proyectados.
          </p>
        </>
      ) : null}
    </div>
  );
}
