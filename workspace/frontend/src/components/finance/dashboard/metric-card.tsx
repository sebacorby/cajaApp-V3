"use client";

import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricTone = "positive" | "negative" | "neutral";

export interface MetricCardProps {
  title: string;
  value: string;
  variation?: string;
  variationTone?: MetricTone;
  /** Cuando true, una variación negativa se interpreta como positiva (ej: gastos que bajan). */
  invertTone?: boolean;
  icon: LucideIcon;
  caption?: string;
  iconClassName?: string;
  className?: string;
}

/** Tarjeta de métrica reutilizable y consistente para todo el dashboard. */
export function MetricCard({
  title,
  value,
  variation,
  variationTone = "neutral",
  invertTone = false,
  icon: Icon,
  caption,
  iconClassName,
  className,
}: MetricCardProps) {
  const effectiveTone: MetricTone = invertTone
    ? variationTone === "positive"
      ? "negative"
      : variationTone === "negative"
        ? "positive"
        : "neutral"
    : variationTone;

  const toneClasses: Record<MetricTone, string> = {
    positive: "text-emerald-700 bg-emerald-50",
    negative: "text-rose-700 bg-rose-50",
    neutral: "text-muted-foreground bg-muted",
  };
  const Arrow =
    effectiveTone === "positive"
      ? ArrowUpRight
      : effectiveTone === "negative"
        ? ArrowDownRight
        : Minus;

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all",
        "hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            iconClassName ?? "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-[18px]" />
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <strong className="text-2xl font-semibold tracking-tight tabular-nums text-foreground sm:text-[1.75rem]">
          {value}
        </strong>
        <div className="flex flex-wrap items-center gap-2">
          {variation && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                toneClasses[effectiveTone]
              )}
            >
              <Arrow className="size-3" />
              {variation}
            </span>
          )}
          {caption && (
            <span className="text-xs text-muted-foreground">{caption}</span>
          )}
        </div>
      </div>
    </article>
  );
}
