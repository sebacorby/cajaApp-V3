"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Amount } from "@/components/finance/shared/amount";
import { cn } from "@/lib/utils";

/**
 * Tarjetas de resumen reutilizables del módulo financiero.
 *
 * Consolidan tres patrones que se repetían con variaciones menores en
 * distintas secciones: tarjeta de métrica con ícono (Dashboard, Deuda
 * futura), tarjeta de monto con tono de color (Movimientos, Reportes) y
 * tarjeta de conteo simple (Importaciones, Conciliación). El objetivo es
 * una única fuente de verdad visual; cada variante preserva exactamente
 * el aspecto que tenía en su sección original.
 */

// ---------------------------------------------------------------------------
// Comparación porcentual (usada por MetricCard y por el hero de balance)
// ---------------------------------------------------------------------------

export type VariationTone = "positive" | "negative" | "neutral";

export function comparisonLabel(
  value: string | null,
  inverse = false,
): { text: string; tone: VariationTone } {
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

export function Variation({
  value,
  inverse = false,
}: {
  value: string | null;
  inverse?: boolean;
}) {
  const variation = comparisonLabel(value, inverse);
  return (
    <p
      className={cn(
        "mt-2 text-xs",
        variation.tone === "positive" && "text-emerald-700 dark:text-emerald-400",
        variation.tone === "negative" && "text-rose-700 dark:text-rose-400",
        variation.tone === "neutral" && "text-muted-foreground",
      )}
    >
      {variation.text}
    </p>
  );
}

// ---------------------------------------------------------------------------
// MetricCard: tarjeta de métrica con ícono y par ARS/USD
// (usada en Dashboard y Deuda futura)
// ---------------------------------------------------------------------------

export interface MetricCardProps {
  title: string;
  ars: string;
  usd: string;
  icon: LucideIcon;
  /** Variación porcentual vs. período anterior. `undefined` la omite. */
  variation?: string | null;
  inverseVariation?: boolean;
  /** Texto auxiliar estático (reemplaza o acompaña a la variación). */
  hint?: string;
}

export function MetricCard({
  title,
  ars,
  usd,
  icon: Icon,
  variation,
  inverseVariation = false,
  hint,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums">
              <Amount value={ars} currency="ARS" />
            </p>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
              <Amount value={usd} currency="USD" />
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">
            <Icon className="size-5" />
          </span>
        </div>
        {variation !== undefined ? (
          <Variation value={variation} inverse={inverseVariation} />
        ) : null}
        {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AmountSummaryCard: tarjeta de monto con tono de color, sin ícono
// (usada en Movimientos y Reportes)
// ---------------------------------------------------------------------------

export type AmountTone = "default" | "income" | "expense";

function amountToneClass(tone: AmountTone): string {
  if (tone === "income") return "text-emerald-700 dark:text-emerald-400";
  if (tone === "expense") return "text-rose-700 dark:text-rose-400";
  return "text-foreground";
}

export interface AmountSummaryCardProps {
  title: string;
  ars: string;
  usd: string;
  tone?: AmountTone;
  helper?: string;
  /**
   * "sm" reproduce el estilo compacto de Movimientos (título plano, monto
   * text-lg). "md" (default) reproduce el estilo de Reportes (título en
   * mayúsculas, monto text-xl, con espacio para texto auxiliar).
   */
  size?: "sm" | "md";
}

export function AmountSummaryCard({
  title,
  ars,
  usd,
  tone = "default",
  helper,
  size = "md",
}: AmountSummaryCardProps) {
  if (size === "sm") {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className={cn("mt-1 text-lg font-semibold tabular-nums", amountToneClass(tone))}>
            <Amount value={ars} currency="ARS" />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <Amount value={usd} currency="USD" />
          </p>
          {helper ? <p className="mt-2 text-xs text-muted-foreground">{helper}</p> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className={cn("mt-2 text-xl font-semibold tabular-nums", amountToneClass(tone))}>
          <Amount value={ars} currency="ARS" />
        </p>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">
          <Amount value={usd} currency="USD" />
        </p>
        {helper ? <p className="mt-3 text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CountSummaryCard: tarjeta de conteo simple con ícono
// (usada en Importaciones y Conciliación)
// ---------------------------------------------------------------------------

export interface CountSummaryCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  testId: string;
}

export function CountSummaryCard({ label, value, icon: Icon, testId }: CountSummaryCardProps) {
  return (
    <Card className="shadow-sm" data-testid={testId}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <Icon className="size-5 text-primary" aria-hidden="true" />
      </CardContent>
    </Card>
  );
}
