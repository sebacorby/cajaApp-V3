"use client";


import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Loader2,
  RefreshCw,
  ReceiptText,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFutureOverview,
  type FutureComponent,
  type FutureKind,
  type FutureMoney,
  type FutureMonth,
  type FutureOverview,
  type FutureSourceGroup,
} from "@/lib/finance/future-api";
import { todayInUserTimezone, useFinanceUI } from "@/lib/finance/ui-store";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/finance/shared/summary-cards";
import { Amount } from "@/components/finance/shared/amount";


const HORIZONS = [6, 12, 18, 24] as const;


function MoneyPair({ value, strong = false }: { value: FutureMoney; strong?: boolean }) {
  return (
    <div className="text-right">
      <p className={cn("tabular-nums", strong ? "font-semibold" : "text-sm")}><Amount value={value.ars} currency="ARS" /></p>
      <p className="text-xs tabular-nums text-muted-foreground"><Amount value={value.usd} currency="USD" /></p>
    </div>
  );
}


function kindLabel(kind: FutureKind): string {
  if (kind === "income") return "Ingreso";
  if (kind === "card_debt") return "Tarjeta";
  return "Otro compromiso";
}


function KindIcon({ kind }: { kind: FutureKind }) {
  const Icon = kind === "income" ? Banknote : kind === "card_debt" ? CreditCard : ReceiptText;
  return (
    <span className={cn(
      "grid size-9 shrink-0 place-items-center rounded-xl",
      kind === "income"
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
        : kind === "card_debt"
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
          : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    )}>
      <Icon className="size-4" />
    </span>
  );
}


function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(date);
}


function ComponentRow({ component }: { component: FutureComponent }) {
  return (
    <div className="grid gap-2 border-t py-3 first:border-t-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{component.description}</p>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            component.certainty === "confirmed"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400",
          )}>
            {component.certainty === "confirmed" ? "Confirmado" : "Proyectado"}
          </span>
          {component.dueDateEstimated ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">Fecha estimada</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDate(component.occurredOn)} · {component.category.name} · {kindLabel(component.kind)}
        </p>
        {component.notes ? <p className="mt-1 truncate text-xs text-muted-foreground">{component.notes}</p> : null}
      </div>
      <p className={cn(
        "text-sm font-semibold tabular-nums sm:text-right",
        component.kind === "income" && "text-emerald-700 dark:text-emerald-400",
      )}>
        {component.kind === "income" ? "+" : "−"}<Amount value={component.amount} currency={component.currency} />
      </p>
    </div>
  );
}


function SourceGroup({ group }: { group: FutureSourceGroup }) {
  const setSection = useFinanceUI((state) => state.setSection);
  return (
    <div className="rounded-xl border bg-background p-3" data-testid={`future-group-${group.originReference}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <KindIcon kind={group.kind} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{group.label}</p>
            <p className="text-xs text-muted-foreground">{kindLabel(group.kind)} · {group.items.length} componente(s)</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Confirmado</p>
            <MoneyPair value={group.confirmed} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Proyectado</p>
            <MoneyPair value={group.projected} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSection(group.originSection)}
            aria-label={`Abrir origen ${group.label}`}
          >
            Abrir <ArrowRight className="ml-1 size-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-3">
        {group.items.map((component) => <ComponentRow key={component.id} component={component} />)}
      </div>
    </div>
  );
}


function MonthPanel({ month, first }: { month: FutureMonth; first: boolean }) {
  const [open, setOpen] = useState(first);
  const empty = month.componentCount === 0;
  return (
    <details
      className="group rounded-2xl border bg-card"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      data-testid={`future-month-${month.monthKey}`}
    >
      <summary className="cursor-pointer list-none p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_repeat(3,minmax(145px,auto))] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold capitalize">{month.label}</p>
              {month.dataQuality.status === "partial" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  <CircleAlert className="size-3" /> Datos parciales
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" /> Completo
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {empty ? "Sin compromisos ni ingresos proyectados" : `${month.componentCount} componente(s) trazables`}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ingresos esperados</p>
            <MoneyPair value={month.totals.expectedIncome} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Compromisos esperados</p>
            <MoneyPair value={month.totals.expectedCommitments} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Resultado proyectado</p>
            <MoneyPair value={month.totals.expectedResult} strong />
          </div>
        </div>
      </summary>
      <div className="border-t p-4 sm:p-5">
        {empty ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No hay componentes para este mes.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Deuda tarjeta confirmada</p><MoneyPair value={month.totals.confirmedCardDebt} strong /></div>
              <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Otros confirmados</p><MoneyPair value={month.totals.confirmedOtherCommitments} strong /></div>
              <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Compromisos proyectados</p><MoneyPair value={month.totals.projectedCommitments} strong /></div>
              <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Ingresos proyectados</p><MoneyPair value={month.totals.projectedIncome} strong /></div>
            </div>
            {month.dataQuality.warnings.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                {month.dataQuality.warnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            ) : null}
            {month.groups.map((group) => <SourceGroup key={group.key} group={group} />)}
          </div>
        )}
      </div>
    </details>
  );
}


export function DeudaFuturaSection() {
  const [horizon, setHorizon] = useState(12);
  const [overview, setOverview] = useState<FutureOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const from = useMemo(() => todayInUserTimezone().slice(0, 7), []);


  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);
    try {
      setOverview(await getFutureOverview(from, horizon));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar la deuda futura.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [from, horizon]);


  useEffect(() => {
    void load();
  }, [load]);


  if (loading) {
    return (
      <div className="grid min-h-72 place-items-center" data-testid="future-loading">
        <div className="text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-3 size-6 animate-spin" />
          Consolidando deuda e ingresos futuros…
        </div>
      </div>
    );
  }


  if (errorMessage || !overview) {
    return (
      <Card className="border-rose-200 dark:border-rose-900" data-testid="future-error">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="size-7 text-rose-600 dark:text-rose-400" />
          <div>
            <p className="font-medium">No se pudo cargar la deuda futura</p>
            <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
          </div>
          <Button variant="outline" onClick={() => void load()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }


  const empty = overview.months.every((month) => month.componentCount === 0);


  return (
    <div className="flex flex-col gap-5" data-testid="future-section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Deuda y compromisos futuros</h2>
          <p className="text-sm text-muted-foreground">
            Deuda confirmada, compromisos proyectados e ingresos esperados, sin mezclarlos con el gasto ya realizado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(horizon)} onValueChange={(value: string) => setHorizon(Number(value))}>
            <SelectTrigger className="w-36" data-testid="future-horizon"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HORIZONS.map((months) => <SelectItem key={months} value={String(months)}>{months} meses</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => void load(true)} disabled={refreshing} aria-label="Actualizar deuda futura">
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>


      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Resultado esperado del horizonte</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums"><Amount value={overview.summary.expectedResult.ars} currency="ARS" /></p>
            <p className="mt-2 text-base tabular-nums text-muted-foreground"><Amount value={overview.summary.expectedResult.usd} currency="USD" /></p>
            <p className="mt-3 text-xs text-muted-foreground">Desde {overview.range.from} hasta {overview.range.to} · {overview.range.months} meses</p>
          </div>
          <div className="rounded-2xl border bg-background/80 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Separación explícita</p>
                <p className="mt-1 text-xs text-muted-foreground">Lo confirmado proviene de resúmenes aceptados o movimientos pendientes. Lo proyectado se muestra aparte y nunca se presenta como gasto realizado.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Deuda tarjeta confirmada" ars={overview.summary.confirmedCardDebt.ars} usd={overview.summary.confirmedCardDebt.usd} hint="Cuotas y consumos de resúmenes aceptados" icon={CreditCard} />
        <MetricCard title="Otros compromisos" ars={overview.summary.confirmedOtherCommitments.ars} usd={overview.summary.confirmedOtherCommitments.usd} hint="Movimientos pendientes o fechados a futuro" icon={ReceiptText} />
        <MetricCard title="Compromisos proyectados" ars={overview.summary.projectedCommitments.ars} usd={overview.summary.projectedCommitments.usd} hint="Estimaciones todavía no confirmadas" icon={CalendarClock} />
        <MetricCard title="Ingresos esperados" ars={overview.summary.expectedIncome.ars} usd={overview.summary.expectedIncome.usd} hint="Confirmados y proyectados, identificados por origen" icon={Banknote} />
      </div>


      {overview.dataQuality.status === "partial" ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex gap-3 p-4 text-sm text-amber-950 dark:text-amber-300">
            <CircleAlert className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">Hay datos que requieren contexto</p>
              {overview.dataQuality.warnings.map((warning) => <p className="mt-1 text-xs" key={warning}>{warning}</p>)}
              <p className="mt-2 text-xs">{overview.dataQuality.note}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}


      {empty ? (
        <Card className="border-dashed" data-testid="future-empty">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <WalletCards className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No hay compromisos futuros registrados</p>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">Las cuotas de resúmenes aceptados, movimientos pendientes e ingresos proyectados aparecerán automáticamente.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline mensual</CardTitle>
          <p className="text-sm text-muted-foreground">Cada mes puede expandirse por tarjeta o fuente. La tabla conserva montos ARS y USD separados.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.months.map((month, index) => <MonthPanel key={month.monthKey} month={month} first={index === 0} />)}
        </CardContent>
      </Card>
    </div>
  );
}