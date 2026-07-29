"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  HeartPulse,
  Loader2,
  RefreshCw,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getFinancialHealth,
  type FinancialHealthCurrency,
  type FinancialHealthCurrencyResult,
  type FinancialHealthEvaluation,
} from "@/lib/finance/financial-health-api";
import { getPeriodRange, useFinanceUI } from "@/lib/finance/ui-store";
import { cn } from "@/lib/utils";

interface CompactRequestState {
  requestKey: string;
  evaluation: FinancialHealthEvaluation | null;
  error: string | null;
}

interface FinancialHealthCompactContextValue {
  evaluation: FinancialHealthEvaluation | null;
  error: string | null;
  loading: boolean;
  requestedRangeLabel: string;
  reload: () => void;
}

const FinancialHealthCompactContext =
  createContext<FinancialHealthCompactContextValue | null>(null);

export function FinancialHealthCompactProvider({
  children,
}: {
  children: ReactNode;
}) {
  const period = useFinanceUI((state) => state.period);
  const range = useMemo(() => getPeriodRange(period), [period]);
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<CompactRequestState | null>(null);
  const requestKey = `${range.from}:${range.to}:${attempt}`;

  useEffect(() => {
    let active = true;

    void getFinancialHealth(range.from, range.to)
      .then((response) => {
        if (!active) return;
        setSnapshot({
          requestKey,
          evaluation: response.evaluation,
          error: null,
        });
      })
      .catch((caught) => {
        if (!active) return;
        setSnapshot({
          requestKey,
          evaluation: null,
          error:
            caught instanceof Error
              ? caught.message
              : "No se pudo consultar la Salud financiera.",
        });
      });

    return () => {
      active = false;
    };
  }, [range.from, range.to, requestKey]);

  const current = snapshot?.requestKey === requestKey ? snapshot : null;

  return (
    <FinancialHealthCompactContext.Provider
      value={{
        evaluation: current?.evaluation ?? null,
        error: current?.error ?? null,
        loading: current === null,
        requestedRangeLabel: range.label,
        reload: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </FinancialHealthCompactContext.Provider>
  );
}

function useFinancialHealthCompact(): FinancialHealthCompactContextValue {
  const context = useContext(FinancialHealthCompactContext);
  if (!context) {
    throw new Error(
      "SidebarFinancialHealth debe usarse dentro de FinancialHealthCompactProvider.",
    );
  }
  return context;
}

function toneClass(result: FinancialHealthCurrencyResult): string {
  if (result.band === "favorable") {
    return "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20";
  }
  if (result.band === "stable") {
    return "border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/20";
  }
  if (result.band === "exposed") {
    return "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20";
  }
  if (result.band === "compromised") {
    return "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/20";
  }
  return "border-dashed bg-muted/20";
}

function formatPeriod(period: { from: string; to: string }): string {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const from = formatter.format(new Date(`${period.from}T00:00:00Z`));
  const to = formatter.format(new Date(`${period.to}T00:00:00Z`));
  return `${from} – ${to}`;
}

function CurrencyStatus({
  currency,
  result,
}: {
  currency: FinancialHealthCurrency;
  result: FinancialHealthCurrencyResult;
}) {
  const insufficient = result.status === "insufficient_data" || result.score === null;

  return (
    <div
      className={cn("rounded-lg border px-2.5 py-2", toneClass(result))}
      data-testid={`sidebar-financial-health-${currency.toLowerCase()}`}
      data-score={result.score ?? "not-calculated"}
      data-status={result.status}
      data-band={result.band}
      data-confidence={result.confidence.label}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {currency}
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
            {insufficient ? "Sin datos suficientes" : `${result.score}/100`}
          </p>
        </div>
        {insufficient ? (
          <ShieldQuestion
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p className="mt-1 text-[10px] font-medium text-foreground">
        {insufficient ? "No calculable" : result.bandLabel}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        {result.confidence.labelText}
      </p>
    </div>
  );
}

interface SidebarFinancialHealthProps {
  onNavigate?: () => void;
}

export function SidebarFinancialHealth({
  onNavigate,
}: SidebarFinancialHealthProps) {
  const { evaluation, error, loading, requestedRangeLabel, reload } =
    useFinancialHealthCompact();
  const setSection = useFinanceUI((state) => state.setSection);

  if (loading) {
    return (
      <section
        className="rounded-xl border bg-card p-3"
        aria-live="polite"
        aria-busy="true"
        data-testid="sidebar-financial-health"
        data-status="loading"
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          <HeartPulse className="size-3.5" aria-hidden="true" />
          Salud financiera
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {requestedRangeLabel}
        </p>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Calculando indicador real…
        </p>
      </section>
    );
  }

  if (error || !evaluation) {
    return (
      <section
        className="rounded-xl border bg-card p-3"
        aria-labelledby="sidebar-financial-health-title"
        data-testid="sidebar-financial-health"
        data-status="error"
      >
        <p
          id="sidebar-financial-health-title"
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground"
        >
          <HeartPulse className="size-3.5" aria-hidden="true" />
          Salud financiera
        </p>
        <p className="mt-2 text-xs font-medium text-foreground">
          Indicador no disponible
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
          {error ?? "No se recibió una evaluación válida."}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 h-8 w-full gap-1.5 text-xs"
          onClick={reload}
          data-testid="sidebar-financial-health-retry"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Reintentar
        </Button>
      </section>
    );
  }

  const ars = evaluation.currencies.ARS;
  const usd = evaluation.currencies.USD;
  const noCalculatedCurrency =
    ars.status === "insufficient_data" && usd.status === "insufficient_data";

  function openDetails(): void {
    setSection("salud");
    onNavigate?.();
  }

  return (
    <section
      className="rounded-xl border bg-card p-3"
      aria-labelledby="sidebar-financial-health-title"
      data-testid="sidebar-financial-health"
      data-status={noCalculatedCurrency ? "insufficient_data" : "ready"}
      data-source="financialHealth.evaluation"
      data-formula-version={evaluation.formula.version}
      data-period-from={evaluation.period.from}
      data-period-to={evaluation.period.to}
    >
      <div className="min-w-0">
        <p
          id="sidebar-financial-health-title"
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground"
        >
          <HeartPulse className="size-3.5" aria-hidden="true" />
          Salud financiera
        </p>
        <p className="mt-1 truncate text-[10px] text-muted-foreground">
          {formatPeriod(evaluation.period)}
        </p>
      </div>

      {noCalculatedCurrency ? (
        <p className="mt-3 rounded-lg border border-dashed bg-muted/20 px-2.5 py-2 text-xs font-medium text-foreground">
          Sin datos suficientes para calcular el indicador.
        </p>
      ) : null}

      <div className="mt-3 grid gap-2">
        <CurrencyStatus currency="ARS" result={ars} />
        <CurrencyStatus currency="USD" result={usd} />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 h-8 w-full justify-between text-xs"
        onClick={openDetails}
        data-testid="sidebar-financial-health-open"
        aria-label="Abrir detalle de Salud financiera"
      >
        Ver fórmula y evidencia
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Button>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Fórmula {evaluation.formula.version}. No reemplaza alertas ni calidad de
        datos.
      </p>
    </section>
  );
}
