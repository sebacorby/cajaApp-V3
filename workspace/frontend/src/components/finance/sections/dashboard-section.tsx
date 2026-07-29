"use client";
















import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleHelp,
  Loader2,
  PiggyBank,
  RefreshCw,
  ShieldAlert,
  Tags,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDashboardOverview,
  type DashboardAlert,
  type DashboardMovement,
  type DashboardOverview,
} from "@/lib/finance/dashboard-api";
import {
  getBudgetOverview,
  type BudgetOverview,
  type BudgetOverviewCurrency,
} from "@/lib/finance/budgets-api";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  getGoalsOverview,
  type GoalOverviewCurrency,
  type GoalsOverview,
} from "@/lib/finance/goals-api";
import { getPeriodRange, useFinanceUI } from "@/lib/finance/ui-store";
import { cn } from "@/lib/utils";
import { BalanceTrend } from "@/components/finance/dashboard/balance-trend";
import { MonthlyEvolutionChart } from "@/components/finance/charts/monthly-evolution-chart";
import { CategoryDonut } from "@/components/finance/charts/category-donut";
import { FinancialHealthSummary } from "@/components/finance/financial-health/financial-health-summary";
import { getFinancialHealth, type FinancialHealthEvaluation } from "@/lib/finance/financial-health-api";
















function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(date);
}
















function comparisonLabel(value: string | null, inverse = false): {
  text: string;
  tone: "positive" | "negative" | "neutral";
} {
  if (value === null) return { text: "Sin base comparable", tone: "neutral" };
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return { text: "Sin variación", tone: "neutral" };
  }
  const positive = inverse ? numeric < 0 : numeric > 0;
  return {
    text: `${numeric > 0 ? "+" : ""}${numeric.toLocaleString("es-AR", { maximumFractionDigits: 2 })}% vs. período anterior`,
    tone: positive ? "positive" : "negative",
  };
}
















function Variation({ value, inverse = false }: { value: string | null; inverse?: boolean }) {
  const variation = comparisonLabel(value, inverse);
  return (
    <p className={cn(
      "mt-2 text-xs",
      variation.tone === "positive" && "text-emerald-700",
      variation.tone === "negative" && "text-rose-700",
      variation.tone === "neutral" && "text-muted-foreground",
    )}>
      {variation.text}
    </p>
  );
}
















function MetricCard({
  title,
  ars,
  usd,
  icon: Icon,
  variation,
  inverseVariation = false,
  hint,
}: {
  title: string;
  ars: string;
  usd: string;
  icon: typeof TrendingUp;
  variation?: string | null;
  inverseVariation?: boolean;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{formatFinancialAmount(ars, "ARS")}</p>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">{formatFinancialAmount(usd, "USD")}</p>
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">
            <Icon className="size-5" />
          </span>
        </div>
        {variation !== undefined ? <Variation value={variation} inverse={inverseVariation} /> : null}
        {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
































function QualityCard({ count }: { count: number }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sin clasificar</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{count}</p>
            <p className="mt-2 text-xs text-muted-foreground">Movimientos que requieren revisión de categoría.</p>
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">
            <CircleHelp className="size-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
















function savingsRateLabel(value: string | null): string {
  return value === null ? "Sin base comparable" : `${value.replace(".", ",")}%`;
}
















function SavingsCard({
  actual,
  onOpenMovements,
}: {
  actual: DashboardOverview["summary"]["actual"];
  onOpenMovements: () => void;
}) {
  return (
    <Card data-testid="dashboard-savings">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="size-5" />
            Resultado realizado y tasa de ahorro
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Calculado por el backend sólo con ingresos y egresos realizados. No incluye pendientes ni proyecciones.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ARS</p>
            <p className="mt-2 text-xl font-semibold tabular-nums" data-testid="dashboard-savings-ars-amount">
              {formatFinancialAmount(actual.balanceArs, "ARS")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground" data-testid="dashboard-savings-ars-rate">
              Tasa de ahorro: {savingsRateLabel(actual.savingsRateArs)}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">USD</p>
            <p className="mt-2 text-xl font-semibold tabular-nums" data-testid="dashboard-savings-usd-amount">
              {formatFinancialAmount(actual.balanceUsd, "USD")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground" data-testid="dashboard-savings-usd-rate">
              Tasa de ahorro: {savingsRateLabel(actual.savingsRateUsd)}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMovements}>
          Ver movimientos del período
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
















function BudgetCurrencySummary({
  currency,
  summary,
}: {
  currency: "ARS" | "USD";
  summary: BudgetOverviewCurrency;
}) {
  const progress = Math.min(
    100,
    Math.max(0, summary.usageBasisPoints / 100),
  );
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {currency}
        </p>
        <span className="text-xs text-muted-foreground">
          {summary.budgetCount} presupuesto{summary.budgetCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Límite efectivo</p>
          <p className="mt-1 font-semibold tabular-nums">
            {formatFinancialAmount(summary.effectiveLimit, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gastado</p>
          <p className="mt-1 font-semibold tabular-nums">
            {formatFinancialAmount(summary.spent, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Disponible</p>
          <p className="mt-1 font-semibold tabular-nums text-emerald-700">
            {formatFinancialAmount(summary.available, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Excedido</p>
          <p className="mt-1 font-semibold tabular-nums text-rose-700">
            {formatFinancialAmount(summary.exceeded, currency)}
          </p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            summary.usageBasisPoints >= 10_000
              ? "bg-rose-500"
              : summary.usageBasisPoints >= 8_000
                ? "bg-amber-500"
                : "bg-emerald-500",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {summary.usagePercent.replace(".", ",")}% utilizado
      </p>
    </div>
  );
}








function DashboardBudgetsCard({
  overview,
  onOpenBudgets,
}: {
  overview: BudgetOverview;
  onOpenBudgets: () => void;
}) {
  return (
    <Card data-testid="dashboard-budgets">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-5" />
            Presupuestos activos
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Límites efectivos y consumo real para el período seleccionado.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {overview.participantCount === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            No hay presupuestos activos aplicables a este período.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <BudgetCurrencySummary
                currency="ARS"
                summary={overview.currencies.ARS}
              />
              <BudgetCurrencySummary
                currency="USD"
                summary={overview.currencies.USD}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border px-2.5 py-1">
                {overview.activeCount} activos
              </span>
              <span className="rounded-full border border-amber-200 px-2.5 py-1 text-amber-700">
                {overview.attentionCount} en atención
              </span>
              <span className="rounded-full border border-rose-200 px-2.5 py-1 text-rose-700">
                {overview.exceededCount} excedidos
              </span>
            </div>
          </>
        )}
        <Button variant="outline" size="sm" onClick={onOpenBudgets}>
          {overview.participantCount === 0
            ? "Crear presupuesto"
            : "Ver presupuestos"}
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}








function GoalCurrencySummary({
  currency,
  summary,
}: {
  currency: "ARS" | "USD";
  summary: GoalOverviewCurrency;
}) {
  const progress = Math.min(
    100,
    Math.max(0, summary.progressBasisPoints / 100),
  );
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {currency}
        </p>
        <span className="text-xs text-muted-foreground">
          {summary.goalCount} objetivo{summary.goalCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="mt-1 font-semibold tabular-nums">
            {formatFinancialAmount(summary.targetAmount, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Aportado</p>
          <p className="mt-1 font-semibold tabular-nums">
            {formatFinancialAmount(summary.contributedAmount, currency)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Restante</p>
          <p className="mt-1 font-semibold tabular-nums">
            {formatFinancialAmount(summary.remainingAmount, currency)}
          </p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {summary.progressPercent.replace(".", ",")}% de progreso global
      </p>
    </div>
  );
}




function formatGoalTargetDate(value: string | null): string {
  if (!value) return "Sin fecha objetivo";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(date);
}




function DashboardGoalsCard({
  overview,
  onOpenGoals,
}: {
  overview: GoalsOverview;
  onOpenGoals: () => void;
}) {
  return (
    <Card data-testid="dashboard-goals">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-5" />
            Objetivos activos
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Metas de planificación priorizadas por fecha objetivo y menor
            avance. Los aportes no reservan saldo.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {overview.participantCount === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            No hay objetivos activos. Podés crear uno desde la sección
            Objetivos.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <GoalCurrencySummary
                currency="ARS"
                summary={overview.currencies.ARS}
              />
              <GoalCurrencySummary
                currency="USD"
                summary={overview.currencies.USD}
              />
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {overview.featuredGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="rounded-xl border p-3"
                  data-testid={`dashboard-goal-${goal.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{goal.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatGoalTargetDate(goal.targetDate)}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs font-medium">
                      {goal.progressPercent.replace(".", ",")}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                    {formatFinancialAmount(
                      goal.contributedAmount,
                      goal.currency,
                    )}{" "}
                    de {formatFinancialAmount(goal.targetAmount, goal.currency)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
        <Button variant="outline" size="sm" onClick={onOpenGoals}>
          {overview.participantCount === 0
            ? "Crear objetivo"
            : "Ver objetivos"}
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}




function MovementRow({ movement }: { movement: DashboardMovement }) {
  return (
    <div className="flex items-center gap-3 border-b py-3 last:border-0">
      <span className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl",
        movement.type === "income"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700",
      )}>
        {movement.type === "income" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{movement.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(movement.occurredOn)} · {movement.category.name} · {movement.trace.sourceLabel}
        </p>
      </div>
      <div className="text-right">
        <p className={cn(
          "whitespace-nowrap text-sm font-semibold tabular-nums",
          movement.type === "income" && "text-emerald-700",
        )}>
          {movement.type === "income" ? "+" : "−"}{formatFinancialAmount(movement.amount, movement.currency)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {movement.status === "actual" ? "Real" : movement.status === "pending" ? "Pendiente" : "Proyectado"}
        </p>
      </div>
    </div>
  );
}
















function AlertsPanel({
  alerts,
  onAction,
}: {
  alerts: DashboardAlert[];
  onAction: (alert: DashboardAlert) => void;
}) {
  return (
    <Card data-testid="dashboard-alerts">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="size-5" /> Alertas basadas en reglas</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Cada alerta muestra el hecho y la regla que la disparó. No usa evaluación financiera de IA.</p>
        </div>
        <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{alerts.length} activa{alerts.length === 1 ? "" : "s"}</span>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No se detectaron alertas para el período seleccionado.</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded-2xl border p-4",
                  alert.severity === "critical" && "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20",
                  alert.severity === "warning" && "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
                  alert.severity === "info" && "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20",
                )}
                data-testid={`dashboard-alert-${alert.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {alert.severity === "critical" ? "Crítica" : alert.severity === "warning" ? "Atención" : "Información"}
                    </p>
                    <h3 className="mt-1 font-semibold">{alert.title}</h3>
                  </div>
                  <AlertCircle className={cn(
                    "mt-0.5 size-5 shrink-0",
                    alert.severity === "critical" && "text-rose-600",
                    alert.severity === "warning" && "text-amber-600",
                    alert.severity === "info" && "text-blue-600",
                  )} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{alert.message}</p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {alert.evidence.map((item) => <li key={item}>• {item}</li>)}
                  <li>• Regla: {alert.rule}</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => onAction(alert)}>
                  {alert.action.label}<ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
















export function DashboardSection() {
  const period = useFinanceUI((state) => state.period);
  const setSection = useFinanceUI((state) => state.setSection);
  const openMovementDrilldown = useFinanceUI((state) => state.openMovementDrilldown);
  const range = useMemo(() => getPeriodRange(period), [period]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [budgetOverview, setBudgetOverview] = useState<BudgetOverview | null>(null);
  const [goalsOverview, setGoalsOverview] = useState<GoalsOverview | null>(null);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
















  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);
    try {
      const [dashboard, budgets, goals, health] = await Promise.all([
        getDashboardOverview(range.from, range.to),
        getBudgetOverview({
          from: range.from.slice(0, 7),
          to: range.to.slice(0, 7),
          status: "active",
        }),
        getGoalsOverview({
          status: "active",
          limit: 4,
        }),
        getFinancialHealth(range.from, range.to).then((result) => result.evaluation).catch(() => null),
      ]);
      setOverview(dashboard);
      setBudgetOverview(budgets);
      setGoalsOverview(goals);
      setFinancialHealth(health);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range.from, range.to]);
















  useEffect(() => {
    void load();
  }, [load]);
















  const handleAlertAction = useCallback((alert: DashboardAlert) => {
    if (alert.action.section === "movimientos" && alert.action.drilldown) {
      openMovementDrilldown(alert.action.drilldown);
      return;
    }
    setSection(alert.action.section);
  }, [openMovementDrilldown, setSection]);
















  const openSavingsMovements = useCallback(() => {
    openMovementDrilldown({
      from: range.from,
      to: range.to,
      label: "Resultado realizado del período",
      status: "actual",
      includeProjected: false,
    });
  }, [openMovementDrilldown, range.from, range.to]);
















  if (loading) {
    return (
      <div className="grid min-h-72 place-items-center" data-testid="dashboard-loading">
        <div className="text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-3 size-6 animate-spin" />
          Calculando el dashboard desde el ledger…
        </div>
      </div>
    );
  }
















  if (errorMessage || !overview || !budgetOverview || !goalsOverview) {
    return (
      <Card className="border-rose-200" data-testid="dashboard-error">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="size-7 text-rose-600" />
          <div>
            <p className="font-medium">No se pudo cargar el dashboard</p>
            <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
          </div>
          <Button variant="outline" onClick={() => void load()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }
















  const { actual, expected } = overview.summary;
  const empty = overview.dataQuality.actualRecords === 0
    && overview.dataQuality.pendingRecords === 0
    && overview.dataQuality.projectedRecords === 0;
















  return (
    <div className="flex flex-col gap-5" data-testid="dashboard-section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Resumen financiero</h2>
          <p className="text-sm text-muted-foreground">{range.label} · datos calculados por el backend</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw className={cn("mr-2 size-4", refreshing && "animate-spin")} />
          Actualizar
        </Button>
      </div>
















      {empty ? (
        <Card className="border-dashed" data-testid="dashboard-empty">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <WalletCards className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Todavía no hay datos para este período</p>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Cargá un movimiento, un ingreso, un resumen de tarjeta o un CSV de débito. El dashboard se actualizará desde el ledger unificado.
              </p>
            </div>
            <Button onClick={() => setSection("movimientos")}>Ir a Movimientos</Button>
          </CardContent>
        </Card>
      ) : null}
















      <Card
        className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background"
        data-testid="dashboard-balance-card"
      >
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.9fr_1.05fr] xl:items-stretch">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Balance realizado</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums sm:text-4xl">
                {formatFinancialAmount(actual.balanceArs, "ARS")}
              </p>
              <p className="mt-2 text-base tabular-nums text-muted-foreground">
                {formatFinancialAmount(actual.balanceUsd, "USD")}
              </p>
              <Variation value={overview.comparison.balanceArs} />
            </div>
            <div className="rounded-2xl border bg-background/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Balance esperado</p>
              <p className="mt-2 text-xl font-semibold tabular-nums">{formatFinancialAmount(expected.balanceArs, "ARS")}</p>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">{formatFinancialAmount(expected.balanceUsd, "USD")}</p>
              <p className="mt-2 text-xs text-muted-foreground">Incluye pendientes y proyecciones, separados de los movimientos realizados.</p>
            </div>
            <BalanceTrend
              months={overview.monthlyEvolution}
              onOpenReports={() => setSection("reportes")}
            />
          </div>
        </CardContent>
      </Card>
















      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Ingresos realizados" ars={actual.incomeArs} usd={actual.incomeUsd} icon={TrendingUp} variation={overview.comparison.incomeArs} />
        <MetricCard title="Egresos realizados" ars={actual.expenseArs} usd={actual.expenseUsd} icon={TrendingDown} variation={overview.comparison.expenseArs} inverseVariation />
        <MetricCard title="Compromisos" ars={overview.commitments.totals.expenseArs} usd={overview.commitments.totals.expenseUsd} icon={CalendarClock} hint={`${overview.commitments.totals.records} movimientos pendientes o proyectados`} />
        <QualityCard count={overview.dataQuality.unclassifiedRecords} />
      </div>
















      {financialHealth ? (
        <FinancialHealthSummary
          evaluation={financialHealth}
          onOpen={() => setSection("salud")}
        />
      ) : null}




      <SavingsCard actual={actual} onOpenMovements={openSavingsMovements} />








      <DashboardBudgetsCard
        overview={budgetOverview}
        onOpenBudgets={() => setSection("presupuestos")}
      />








      <DashboardGoalsCard
        overview={goalsOverview}
        onOpenGoals={() => setSection("objetivos")}
      />




      <AlertsPanel alerts={overview.alerts} onAction={handleAlertAction} />
















      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card data-testid="dashboard-evolution-card">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Evolución mensual</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Series realizadas y proyectadas informadas por el backend, con ARS y USD siempre separados.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <MonthlyEvolutionChart data={overview.monthlyEvolution} />
          </CardContent>
        </Card>


        <Card data-testid="dashboard-categories-card">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Gastos por categoría</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Sólo egresos realizados; importes y porcentajes provienen del backend.
              </p>
            </div>
            <Tags className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CategoryDonut categories={overview.categories} />
          </CardContent>
        </Card>
      </div>












      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Últimos movimientos</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Movimientos reales y pendientes del período.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSection("movimientos")}>Ver todos <ArrowRight className="ml-1 size-4" /></Button>
          </CardHeader>
          <CardContent>
            {overview.recentMovements.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No hay movimientos recientes.</p> : overview.recentMovements.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
          </CardContent>
        </Card>
















        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compromisos del período</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Pendientes y proyectados; no forman parte del balance realizado.</p>
          </CardHeader>
          <CardContent>
            {overview.commitments.items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No hay compromisos proyectados para este período.</p> : overview.commitments.items.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}