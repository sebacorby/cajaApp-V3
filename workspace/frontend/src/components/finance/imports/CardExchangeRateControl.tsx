"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchCardExchangeRate,
  updateCardExchangeRate,
} from "@/lib/finance/card-payments-api";

function parseRate(value: string): number {
  const compact = value.trim().replace(/\s/g, "");
  if (!compact) return 0;
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function CardExchangeRateControl() {
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchCardExchangeRate(controller.signal)
      .then((result) => setRate(result.rate ?? ""))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const save = async () => {
    if (parseRate(rate) <= 0) {
      setError("Ingresá una cotización USD válida.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await updateCardExchangeRate(rate, new Date().toISOString().slice(0, 10));
      setRate(result.rate ?? rate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la cotización.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Cotización USD</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Se usa para convertir consumos en dólares, impuestos asociados y el total real en pesos.
        </p>
      </div>
      <div className="flex items-end gap-2">
        <label className="space-y-1">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">USD → ARS</span>
          <input
            aria-label="Cotización USD a ARS"
            inputMode="decimal"
            className="h-10 w-[145px] rounded-md border border-input bg-background px-3 text-right text-sm tabular-nums"
            placeholder="0,00"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void save();
            }}
          />
        </label>
        <Button variant="outline" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
        </Button>
      </div>
      {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
