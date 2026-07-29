"use client";


import { ArrowRight, HeartPulse, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  FinancialHealthCurrency,
  FinancialHealthEvaluation,
} from "@/lib/finance/financial-health-api";
import { cn } from "@/lib/utils";


function toneClass(band: FinancialHealthEvaluation["currencies"][FinancialHealthCurrency]["band"]): string {
  if (band === "favorable") return "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20";
  if (band === "stable") return "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20";
  if (band === "exposed") return "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20";
  if (band === "compromised") return "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20";
  return "border-dashed bg-muted/20";
}


function CurrencySummary({
  currency,
  evaluation,
}: {
  currency: FinancialHealthCurrency;
  evaluation: FinancialHealthEvaluation;
}) {
  const result = evaluation.currencies[currency];
  return (
    <div
      className={cn("rounded-xl border p-4", toneClass(result.band))}
      data-testid={`dashboard-financial-health-${currency.toLowerCase()}`}
      data-score={result.score ?? "not-calculated"}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{currency}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {result.score === null ? "No calculable" : `${result.score}/100`}
          </p>
        </div>
        {result.score === null ? (
          <ShieldQuestion className="size-5 text-muted-foreground" aria-hidden="true" />
        ) : null}
      </div>
      <p className="mt-2 text-sm font-medium">{result.bandLabel}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {result.confidence.labelText} · {result.availableWeight}/100 puntos de fórmula disponibles
      </p>
    </div>
  );
}


export function FinancialHealthSummary({
  evaluation,
  onOpen,
}: {
  evaluation: FinancialHealthEvaluation;
  onOpen: () => void;
}) {
  return (
    <Card data-testid="dashboard-financial-health" data-source="financialHealth.evaluation">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="size-5" aria-hidden="true" />
            Salud financiera
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Resultado determinístico por moneda. Fórmula {evaluation.formula.version}; el frontend no calcula el puntaje.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <CurrencySummary currency="ARS" evaluation={evaluation} />
          <CurrencySummary currency="USD" evaluation={evaluation} />
        </div>
        <Button variant="outline" size="sm" onClick={onOpen} data-testid="dashboard-open-financial-health">
          Ver fórmula y evidencia
          <ArrowRight className="ml-1 size-4" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}