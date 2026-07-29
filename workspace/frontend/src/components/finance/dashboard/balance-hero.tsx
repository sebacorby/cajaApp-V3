"use client";

import { Wallet, ArrowUpRight, ArrowDownRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Sparkline } from "../charts/sparkline";
import {
  formatCurrency,
  formatVariation,
} from "@/lib/finance/format";
import type { MonthlySummary } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

interface BalanceHeroProps {
  summary: MonthlySummary;
  account: string;
}

/** Tarjeta principal con el balance disponible, variación y sparkline. */
export function BalanceHero({ summary, account }: BalanceHeroProps) {
  const [hidden, setHidden] = useState(false);
  const positive = summary.balanceVariation >= 0;
  const sparkData = [
    summary.balance - 180000,
    summary.balance - 90000,
    summary.balance - 140000,
    summary.balance,
  ];

  return (
    <article className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary to-emerald-700 p-6 text-primary-foreground shadow-lg sm:p-7">
      {/* Patrón decorativo sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-white/15">
                <Wallet className="size-[18px]" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm text-primary-foreground/80">
                  Balance disponible
                </span>
                <span className="text-xs text-primary-foreground/60">
                  {account}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHidden((h) => !h)}
            className="grid size-9 place-items-center rounded-xl bg-white/10 text-primary-foreground/90 transition hover:bg-white/20"
            aria-label={hidden ? "Mostrar monto" : "Ocultar monto"}
          >
            {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <strong className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {hidden ? "$ ••••••••" : formatCurrency(summary.balance)}
          </strong>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
                positive
                  ? "bg-white/15 text-white"
                  : "bg-white/15 text-white"
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {formatVariation(summary.balanceVariation)}
            </span>
            <span className="text-primary-foreground/70">
              vs. mes anterior
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-primary-foreground/70">
                Ingresos del mes
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {hidden ? "••••" : formatCurrency(summary.income)}
              </p>
            </div>
            <div>
              <p className="text-xs text-primary-foreground/70">
                Gastos del mes
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {hidden ? "••••" : formatCurrency(summary.expenses)}
              </p>
            </div>
          </div>
          <Sparkline
            data={sparkData}
            color="#ffffff"
            width={104}
            height={34}
            className="hidden sm:block"
          />
        </div>
      </div>
    </article>
  );
}
