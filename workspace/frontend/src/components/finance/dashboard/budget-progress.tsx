"use client";

import type { Budget } from "@/lib/finance/types";
import {
  formatCurrency,
  formatPercent,
  computeProgress,
} from "@/lib/finance/format";
import { cn } from "@/lib/utils";

interface BudgetProgressProps {
  budgets: Budget[];
}

type BudgetStatus = "ok" | "warning" | "over" | "complete";

function getBudgetStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) return "ok";
  const ratio = spent / limit;
  if (ratio >= 1) return "over";
  if (ratio >= 0.85) return "warning";
  if (ratio >= 0.999 && ratio <= 1.001) return "complete";
  return "ok";
}

const STATUS_STYLES: Record<
  BudgetStatus,
  { bar: string; label: string; chip: string }
> = {
  ok: {
    bar: "bg-emerald-500",
    label: "En curso",
    chip: "text-emerald-700 bg-emerald-50",
  },
  warning: {
    bar: "bg-amber-500",
    label: "Cerca del límite",
    chip: "text-amber-700 bg-amber-50",
  },
  over: {
    bar: "bg-rose-500",
    label: "Superado",
    chip: "text-rose-700 bg-rose-50",
  },
  complete: {
    bar: "bg-emerald-500",
    label: "Completo",
    chip: "text-emerald-700 bg-emerald-50",
  },
};

export function BudgetProgress({ budgets }: BudgetProgressProps) {
  const sorted = [...budgets].sort(
    (a, b) => b.spent / b.limit - a.spent / a.limit
  );

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((b) => {
        const progress = computeProgress(b.spent, b.limit);
        const status = getBudgetStatus(b.spent, b.limit);
        const style = STATUS_STYLES[status];
        const remaining = b.limit - b.spent;
        return (
          <li key={b.id} className="rounded-xl border bg-card p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {b.category}
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    style.chip
                  )}
                >
                  {style.label}
                </span>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatCurrency(b.spent)}{" "}
                <span className="text-muted-foreground/70">/ {formatCurrency(b.limit)}</span>
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  style.bar
                )}
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {formatPercent(progress)} usado
              </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  remaining < 0 ? "text-rose-600" : "text-muted-foreground"
                )}
              >
                {remaining < 0
                  ? `${formatCurrency(Math.abs(remaining))} excedido`
                  : `${formatCurrency(remaining)} disponible`}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
