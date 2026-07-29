"use client";




import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  HeartPulse,
  History,
  Loader2,
  RefreshCw,
  Scale,
  ShieldQuestion,
  Sparkles,
  Target,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  saveFinancialHealthSnapshot,
  type FinancialHealthAction,
  type FinancialHealthCurrency,
  type FinancialHealthCurrencyResult,
  type FinancialHealthEvaluation,
  type FinancialHealthFactor,
  type FinancialHealthHistoryItem,
  type FinancialHealthResponse,
} from "@/lib/finance/financial-health-api";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import { getPeriodRange, USER_TIMEZONE, useFinanceUI } from "@/lib/finance/ui-store";
import { cn } from "@/lib/utils";




function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: USER_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}




function formatDate(value: string | null): string {
  if (!value) return "Sin fecha definida";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}




function scoreTone(result: FinancialHealthCurrencyResult): string {
  if (result.band === "favorable") return "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20";
  if (result.band === "stable") return "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20";
  if (result.band === "exposed") return "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20";
  if (result.band === "compromised") return "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20";
  return "border-dashed bg-muted/20";
}




function factorTone(factor: FinancialHealthFactor): string {
  if (factor.status === "unavailable") return "border-dashed bg-muted/20";
  if (factor.impact === "positive") return "border-emerald-200 dark:border-emerald-900";
  if (factor.impact === "negative") return "border-rose-200 dark:border-rose-900";
  return "border-amber-200 dark:border-amber-900";
}




function ScoreCard({
  result,
  comparisonDelta,
}: {
  result: FinancialHealthCurrencyResult;
  comparisonDelta: number | null;
}) {
  return (
    <Card
      className={cn("overflow-hidden", scoreTone(result))}
      data-testid={`financial-health-score-${result.currency.toLowerCase()}`}
      data-score={result.score ?? "not-calculated"}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{result.currency}</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums sm:text-5xl">
              {result.score === null ? "—" : result.score}
              {result.score !== null ? <span className="text-xl text-muted-foreground">/100</span> : null}
            </p>
            <p className="mt-2 font-medium">{result.bandLabel}</p>
          </div>
          {result.score === null ? (
            <ShieldQuestion className="size-7 text-muted-foreground" aria-hidden="true" />
          ) : (
            <HeartPulse className="size-7" aria-hidden="true" />
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline">{result.confidence.labelText}</Badge>
          <Badge variant="outline">{result.availableWeight}/100 disponibles</Badge>
          {comparisonDelta !== null ? (
            <Badge variant={comparisonDelta < 0 ? "destructive" : "secondary"}>
              {comparisonDelta > 0 ? "+" : ""}{comparisonDelta} vs. snapshot anterior
            </Badge>
          ) : null}
        </div>
        {result.blockers.length > 0 ? (
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground" data-testid={`financial-health-blockers-${result.currency.toLowerCase()}`}>
            {result.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}




function FactorCard({
  factor,
  currency,
  onAction,
}: {
  factor: FinancialHealthFactor;
  currency: FinancialHealthCurrency;
  onAction: (action: FinancialHealthAction) => void;
}) {
  return (
    <article
      className={cn("rounded-2xl border p-4", factorTone(factor))}
      data-testid={`financial-health-factor-${currency.toLowerCase()}-${factor.id}`}
      data-points={factor.points ?? "unavailable"}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{factor.title}</h4>
            <Badge variant={factor.status === "unavailable" ? "outline" : factor.impact === "negative" ? "destructive" : "secondary"}>
              {factor.points === null ? "Sin evidencia" : `${factor.points}/${factor.weight}`}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{factor.description}</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Regla versionada</p>
      <p className="mt-1 text-sm">{factor.rule}</p>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {factor.evidence.map((item) => <li key={item}>• {item}</li>)}
      </ul>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => onAction(factor.action)}>
        {factor.action.label}
        <ArrowRight className="ml-1 size-4" aria-hidden="true" />
      </Button>
    </article>
  );
}




function CurrencyFactors({
  currency,
  result,
  onAction,
}: {
  currency: FinancialHealthCurrency;
  result: FinancialHealthCurrencyResult;
  onAction: (action: FinancialHealthAction) => void;
}) {
  return (
    <Card data-testid={`financial-health-factors-${currency.toLowerCase()}`}>
      <CardHeader>
        <CardTitle className="text-base">Factores {currency}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Puntos, regla y evidencia autoritativa. Los factores no disponibles no se reemplazan con supuestos.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {result.factors.map((factor) => (
          <FactorCard key={factor.id} factor={factor} currency={currency} onAction={onAction} />
        ))}
      </CardContent>
    </Card>
  );
}




function HistoryCard({ history }: { history: FinancialHealthHistoryItem[] }) {
  return (
    <Card data-testid="financial-health-history">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-5" aria-hidden="true" />
          Historial de evaluaciones
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Se crea un snapshot sólo cuando cambia la huella autoritativa de datos o la versión de fórmula.
        </p>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Todavía no hay evaluaciones históricas guardadas.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <article key={item.id} className="rounded-xl border p-4" data-testid="financial-health-history-item">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.period.from} a {item.period.to}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(item.savedAt)} · fórmula {item.formulaVersion}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">ARS: {item.currencies.ARS.score ?? "N/C"}</Badge>
                    <Badge variant="outline">USD: {item.currencies.USD.score ?? "N/C"}</Badge>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}




export function SaludFinancieraSection() {
  const period = useFinanceUI((state) => state.period);
  const setSection = useFinanceUI((state) => state.setSection);
  const openMovementDrilldown = useFinanceUI((state) => state.openMovementDrilldown);
  const range = useMemo(() => getPeriodRange(period), [period]);
  const [response, setResponse] = useState<FinancialHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);




  const load = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setResponse(await saveFinancialHealthSnapshot(range.from, range.to));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo calcular la salud financiera.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range.from, range.to]);




  useEffect(() => {
    void load(false);
  }, [load]);




  const handleAction = useCallback((action: FinancialHealthAction) => {
    if (action.section === "movimientos" && action.drilldown) {
      openMovementDrilldown(action.drilldown);
      return;
    }
    setSection(action.section);
  }, [openMovementDrilldown, setSection]);




  if (loading) {
    return (
      <div className="grid min-h-72 place-items-center" data-testid="financial-health-loading">
        <div className="text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-3 size-6 animate-spin" aria-hidden="true" />
          Aplicando la fórmula determinística…
        </div>
      </div>
    );
  }




  if (error || !response) {
    return (
      <Card className="border-rose-200" data-testid="financial-health-error">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="size-7 text-rose-600" aria-hidden="true" />
          <div>
            <p className="font-medium">No se pudo calcular la salud financiera</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" onClick={() => void load(false)}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }




  const evaluation: FinancialHealthEvaluation = response.evaluation;




  return (
    <div className="flex flex-col gap-5" data-testid="financial-health-section" data-formula-version={evaluation.formula.version}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <HeartPulse className="size-6" aria-hidden="true" />
            Salud financiera
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {range.label} · resultado reproducible, explicable y separado por moneda
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setSection("asesor")} data-testid="financial-health-open-advisor">
            <Sparkles className="mr-2 size-4" aria-hidden="true" />
            Explicar con IA
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={refreshing} data-testid="financial-health-refresh">
            <RefreshCw className={cn("mr-2 size-4", refreshing && "animate-spin")} aria-hidden="true" />
            Recalcular y guardar
          </Button>
        </div>
      </div>




      <Alert>
        <Scale className="size-4" aria-hidden="true" />
        <AlertDescription>
          {evaluation.disclaimer} La etiqueta describe el resultado de esta fórmula; no diagnostica a la persona.
        </AlertDescription>
      </Alert>




      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreCard result={evaluation.currencies.ARS} comparisonDelta={evaluation.comparison?.currencies.ARS.scoreDelta ?? null} />
        <ScoreCard result={evaluation.currencies.USD} comparisonDelta={evaluation.comparison?.currencies.USD.scoreDelta ?? null} />
      </div>




      <Card data-testid="financial-health-methodology">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-5" aria-hidden="true" />
            Fórmula {evaluation.formula.version}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{evaluation.formula.description}</p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Pesos por factor</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {evaluation.formula.weights.map((item) => (
                <li key={item.factorId}>• {item.factorId}: {item.weight} puntos</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Requisitos mínimos</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {evaluation.formula.minimumRequirements.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
          <div className="lg:col-span-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Huella: {evaluation.sourceFingerprint.slice(0, 12)}…</Badge>
            <Badge variant="outline">Evaluado: {formatDateTime(evaluation.evaluatedAt)}</Badge>
            <Badge variant="outline">Snapshot: {response.snapshotCreated ? "nuevo" : "sin cambios"}</Badge>
          </div>
        </CardContent>
      </Card>




      <CurrencyFactors currency="ARS" result={evaluation.currencies.ARS} onAction={handleAction} />
      <CurrencyFactors currency="USD" result={evaluation.currencies.USD} onAction={handleAction} />




      <Card data-testid="financial-health-goals-context">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-5" aria-hidden="true" />
            Objetivos como contexto
          </CardTitle>
          <p className="text-sm text-muted-foreground">{evaluation.goalsContext.note}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["ARS", "USD"] as const).map((currency) => {
              const goal = evaluation.goalsContext.currencies[currency];
              return (
                <div key={currency} className="rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{currency}</p>
                  <p className="mt-2 text-sm">Meta: <strong>{formatFinancialAmount(goal.targetAmount, currency)}</strong></p>
                  <p className="mt-1 text-sm">Aportado: <strong>{formatFinancialAmount(goal.contributedAmount, currency)}</strong></p>
                  <p className="mt-1 text-sm">Restante: <strong>{formatFinancialAmount(goal.remainingAmount, currency)}</strong></p>
                  <p className="mt-1 text-xs text-muted-foreground">Progreso: {goal.progressPercent.replace(".", ",")}%</p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{evaluation.goalsContext.activeGoals} objetivos activos</Badge>
            <span>Próxima fecha objetivo: {formatDate(evaluation.goalsContext.nearestActiveTargetDate)}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSection("objetivos")}>
            Ver Objetivos
            <ArrowRight className="ml-1 size-4" aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>




      {evaluation.comparison ? (
        <Card data-testid="financial-health-comparison">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="size-5" aria-hidden="true" />
              Cambios contra la evaluación anterior
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Snapshot del {formatDateTime(evaluation.comparison.savedAt)}. Sólo se comparan resultados de la misma fórmula.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(["ARS", "USD"] as const).map((currency) => {
              const comparison = evaluation.comparison!.currencies[currency];
              return (
                <div key={currency} className="rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{currency}</p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">
                    {comparison.scoreDelta === null ? "Sin comparación calculable" : `${comparison.scoreDelta > 0 ? "+" : ""}${comparison.scoreDelta} puntos`}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {comparison.factorChanges.filter((item) => item.delta !== null && item.delta !== 0).map((item) => (
                      <li key={item.factorId}>• {item.factorId}: {item.delta! > 0 ? "+" : ""}{item.delta}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground" data-testid="financial-health-no-comparison">
          <CheckCircle2 className="mr-2 inline size-4" aria-hidden="true" />
          No existe todavía un snapshot anterior distinto con la misma versión de fórmula.
        </div>
      )}




      <HistoryCard history={response.history} />
    </div>
  );
}