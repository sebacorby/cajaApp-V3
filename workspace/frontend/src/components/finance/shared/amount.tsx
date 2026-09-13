"use client";

import { useAppPreferences } from "@/components/finance/preferences/app-preferences-provider";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import { formatMinorUnits, type MoneyMinorUnits } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

export interface AmountProps {
  value: unknown;
  currency: "ARS" | "USD";
  /** "decimal" usa formatFinancialAmount (valores backend en string/número); "minor" usa formatMinorUnits (centavos). */
  unit?: "decimal" | "minor";
  className?: string;
}

export function Amount({ value, currency, unit = "decimal", className }: AmountProps) {
  const { settings } = useAppPreferences();

  if (settings.hideAmounts) {
    return (
      <span className={cn("tracking-widest", className)} aria-label={`Importe oculto en ${currency}`}>
        ••••
      </span>
    );
  }

  const formatted =
    unit === "minor"
      ? formatMinorUnits(value as MoneyMinorUnits | null | undefined, currency)
      : formatFinancialAmount(value, currency);

  return <span className={className}>{formatted}</span>;
}
