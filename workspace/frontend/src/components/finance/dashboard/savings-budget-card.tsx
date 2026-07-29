"use client";

import { PiggyBank } from "lucide-react";
import { ProgressRing } from "../charts/progress-ring";
import {
  formatCurrency,
  formatPercent,
  computeProgress,
} from "@/lib/finance/format";
import type { MonthlySummary, BudgetSummary } from "@/lib/finance/types";

interface SavingsBudgetCardProps {
  summary: MonthlySummary;
  budget: BudgetSummary;
}

/** Tarjeta combinada: tasa de ahorro (anillo) + progreso de presupuesto. */
export function SavingsBudgetCard({ summary, budget }: SavingsBudgetCardProps) {
  const budgetProgress = computeProgress(budget.totalSpent, budget.totalLimit);
  const budgetRemaining = budget.totalLimit - budget.totalSpent;
  const over = budgetRemaining < 0;

  return (
    <article className="flex flex-col gap-5 rounded-3xl border bg-card p-6 shadow-sm">
      {/* Tasa de ahorro */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <PiggyBank className="size-[18px]" />
            </span>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Ahorro del mes
              </p>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {formatCurrency(summary.savings)}
              </p>
            </div>
          </div>
        </div>
        <ProgressRing value={summary.savingsRate} size={72} stroke={7}>
          <span className="text-sm font-semibold tabular-nums text-emerald-700">
            {formatPercent(summary.savingsRate)}
          </span>
          <span className="text-[9px] text-muted-foreground">tasa</span>
        </ProgressRing>
      </div>

      <div className="h-px bg-border" />

      {/* Presupuesto mensual */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Presupuesto mensual
          </p>
          <span className="text-xs font-medium tabular-nums text-foreground">
            {formatPercent(budgetProgress)}
          </span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${Math.min(budgetProgress * 100, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="tabular-nums text-muted-foreground">
            {formatCurrency(budget.totalSpent)} gastado
          </span>
          <span
            className={`font-medium tabular-nums ${
              over ? "text-rose-600" : "text-emerald-700"
            }`}
          >
            {over
              ? `${formatCurrency(Math.abs(budgetRemaining))} excedido`
              : `${formatCurrency(budgetRemaining)} disponible`}
          </span>
        </div>
      </div>
    </article>
  );
}
