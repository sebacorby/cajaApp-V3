"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import type { FutureDebtMonth, FutureDebtRow } from "@/lib/finance/future-debt-api";

interface FutureDebtMatrixViewProps {
  months: FutureDebtMonth[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
}

type MatrixMovement = {
  key: string;
  description: string;
  cardLabel: string;
  currency: "ARS" | "USD";
  cells: Map<string, FutureDebtRow>;
};

function movementKey(row: FutureDebtRow): string {
  const sourceId = (row as FutureDebtRow & { sourceId?: string }).sourceId;
  if (sourceId) return sourceId;
  return [row.description, row.cardLabel ?? "", row.currency, row.sourceLabel ?? ""].join("|");
}

export function FutureDebtMatrixView({ months, selectedIds, onToggleRow }: FutureDebtMatrixViewProps) {
  const movements = useMemo(() => {
    const byKey = new Map<string, MatrixMovement>();
    for (const month of months) {
      for (const card of month.cards) {
        for (const row of card.rows) {
          const key = movementKey(row);
          const current = byKey.get(key) ?? {
            key,
            description: row.description,
            cardLabel: row.cardLabel || card.cardLabel,
            currency: row.currency,
            cells: new Map<string, FutureDebtRow>(),
          };
          current.cells.set(month.monthKey, row);
          byKey.set(key, current);
        }
      }
    }
    return Array.from(byKey.values()).sort((a, b) => a.description.localeCompare(b.description, "es"));
  }, [months]);

  if (movements.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border bg-card" data-testid="future-debt-matrix">
      <div className="overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-card">
            <tr className="border-b">
              <th className="sticky left-0 z-30 min-w-[320px] bg-card px-4 py-3 text-left font-semibold text-foreground">
                Movimiento
              </th>
              {months.map((month) => (
                <th key={month.monthKey} className="min-w-[150px] border-l px-3 py-3 text-right font-semibold text-foreground">
                  {month.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.key} className="border-b last:border-0 hover:bg-muted/20">
                <td className="sticky left-0 z-10 bg-card px-4 py-3 align-top">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={Array.from(movement.cells.values()).every((row) => selectedIds.has(row.id))}
                      onCheckedChange={() => {
                        for (const row of movement.cells.values()) onToggleRow(row.id);
                      }}
                      aria-label={`Seleccionar ${movement.description}`}
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{movement.description}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{movement.cardLabel}</div>
                    </div>
                  </div>
                </td>
                {months.map((month) => {
                  const row = movement.cells.get(month.monthKey);
                  return (
                    <td key={month.monthKey} className="border-l px-3 py-3 text-right align-top">
                      {row ? (
                        <div>
                          <div className="font-semibold tabular-nums text-foreground">
                            {formatFinancialAmount(row.amount, row.currency)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">Cuota {row.installmentLabel}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/20">
            <tr>
              <td className="sticky left-0 z-10 bg-muted px-4 py-3 font-semibold text-foreground">Total por mes</td>
              {months.map((month) => (
                <td key={month.monthKey} className="border-l px-3 py-3 text-right">
                  <div className="font-semibold tabular-nums text-foreground">{formatFinancialAmount(month.totals.ars, "ARS")}</div>
                  {Number(month.totals.usd) !== 0 ? (
                    <div className="mt-1 text-xs font-medium tabular-nums text-emerald-700">{formatFinancialAmount(month.totals.usd, "USD")}</div>
                  ) : null}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
