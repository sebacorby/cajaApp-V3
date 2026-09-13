"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Amount } from "@/components/finance/shared/amount";
import type { CardExchangeRate, CardMoneyEquivalents } from "@/lib/finance/card-statements-api";
import {
  exchangeRateSourceLabel,
  formatDateLabel,
  isPositiveExchangeRate,
  todayIsoDate,
} from "./helpers";

interface ExchangeRateCardProps {
  totalPesos: string | null;
  totalDollars: string | null;
  exchangeRate: CardExchangeRate | null;
  equivalents: CardMoneyEquivalents;
  saving: boolean;
  message: string | null;
  onSave: (rate: string, effectiveDate: string) => Promise<void>;
}

/** Cotización USD/ARS persistida y equivalentes calculados por el backend. */
export function ExchangeRateCard({
  totalPesos,
  totalDollars,
  exchangeRate,
  equivalents,
  saving,
  message,
  onSave,
}: ExchangeRateCardProps) {
  const [rateValue, setRateValue] = useState(exchangeRate?.rate ?? "");
  const [effectiveDate, setEffectiveDate] = useState(
    exchangeRate?.effectiveDate ?? todayIsoDate(),
  );

  useEffect(() => {
    setRateValue(exchangeRate?.rate ?? "");
    setEffectiveDate(exchangeRate?.effectiveDate ?? todayIsoDate());
  }, [exchangeRate?.effectiveDate, exchangeRate?.rate]);

  const validRate = isPositiveExchangeRate(rateValue);
  const configured = exchangeRate?.configured === true;

  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <CardTitle className="text-base">Cotización USD/ARS</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            La cotización se persiste y todos los equivalentes se calculan en el backend.
            Los importes originales en ARS y USD nunca se reemplazan.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Estado: {configured ? "Activa" : "Sin configurar"}</span>
            <span>Origen: {exchangeRateSourceLabel(exchangeRate?.source ?? null)}</span>
            <span>Fecha aplicada: {formatDateLabel(exchangeRate?.effectiveDate ?? null)}</span>
          </div>
        </div>

        <div className="w-full space-y-3 lg:w-[360px]">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
            <div>
              <Label htmlFor="usd-ars-rate">1 USD equivale a</Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="usd-ars-rate"
                  data-testid="card-statement-usd-ars-rate"
                  type="text"
                  inputMode="decimal"
                  value={rateValue}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setRateValue(event.target.value)
                  }
                  aria-invalid={!validRate}
                  placeholder="Ej. 1.500,00"
                  className="font-mono tabular-nums"
                />
                <span className="text-sm font-medium text-muted-foreground">ARS</span>
              </div>
            </div>
            <div>
              <Label htmlFor="usd-ars-rate-date">Fecha</Label>
              <Input
                id="usd-ars-rate-date"
                type="date"
                value={effectiveDate}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setEffectiveDate(event.target.value)
                }
                className="mt-2"
              />
            </div>
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!validRate || !effectiveDate || saving}
            onClick={() => void onSave(rateValue, effectiveDate)}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Guardar cotización
          </Button>
          {message ? (
            <p className="text-xs text-muted-foreground">{message}</p>
          ) : !validRate && rateValue ? (
            <p className="text-xs text-destructive">Ingresá un valor mayor que cero.</p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs text-muted-foreground">Pesos originales</p>
            <p className="mt-2 font-semibold tabular-nums">
              <Amount value={totalPesos} currency="ARS" />
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs text-muted-foreground">Dólares originales</p>
            <p className="mt-2 font-semibold tabular-nums">
              <Amount value={totalDollars} currency="USD" />
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 p-4">
            <p className="text-xs text-muted-foreground">Equivalente USD en ARS</p>
            <p className="mt-2 font-semibold tabular-nums">
              <Amount value={equivalents.usdEquivalentPesos} currency="ARS" />
            </p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">Total combinado en ARS</p>
            <p className="mt-2 font-semibold tabular-nums text-primary">
              <Amount value={equivalents.combinedTotalPesos} currency="ARS" />
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
