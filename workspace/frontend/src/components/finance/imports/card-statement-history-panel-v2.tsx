"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  deleteAcceptedCardStatement,
  fetchAcceptedCardStatement,
  fetchCardStatementHistory,
  type CardStatementHistoryItem,
} from "@/lib/finance/card-statement-history-api";
import type { AcceptedCardStatement } from "@/lib/finance/card-statements-api";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function itemTitle(item: CardStatementHistoryItem): string {
  return [item.brand, item.bankName].filter(Boolean).join(" · ") || "Resumen de tarjeta";
}

export function CardStatementHistoryPanelV2() {
  const [items, setItems] = useState<CardStatementHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AcceptedCardStatement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchCardStatementHistory(signal));
    } catch (caught) {
      if (!signal?.aborted) {
        setError(caught instanceof Error ? caught.message : "No se pudo cargar el historial de resúmenes.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    setDetailLoading(true);
    void fetchAcceptedCardStatement(openId, controller.signal)
      .then(setDetail)
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "No se pudo abrir el resumen.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [openId]);

  const handleDelete = async (item: CardStatementHistoryItem) => {
    if (!window.confirm(`¿Eliminar el resumen ${item.periodKey ?? item.document.fileName}? Podrás volver a importar el mismo PDF después.`)) {
      return;
    }
    setDeletingId(item.id);
    setError(null);
    try {
      await deleteAcceptedCardStatement(item.id);
      if (openId === item.id) {
        setOpenId(null);
        setDetail(null);
      }
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar el resumen.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-3" data-testid="card-statement-history-panel">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Resúmenes de tarjeta consolidados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Los resúmenes aceptados quedan acá como historial. Si una importación fue incorrecta, podés eliminarla y volver a cargar el mismo PDF desde Tarjetas.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-xl border bg-card">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-5 text-sm text-muted-foreground">
          Todavía no hay resúmenes de tarjeta consolidados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          {items.map((item) => {
            const open = openId === item.id;
            return (
              <div key={item.id} className="border-b border-border/60 last:border-b-0">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-md px-1 py-1 text-left hover:bg-muted/20"
                    onClick={() => setOpenId(open ? null : item.id)}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{itemTitle(item)}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.periodKey ?? "Período sin identificar"} · {item.document.fileName} · versión {item.version}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">{item.isActiveForPeriod ? "Activo" : item.status}</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                        {item.totalPesosRaw ? formatFinancialAmount(item.totalPesosRaw, "ARS") : "—"}
                      </p>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === item.id}
                    onClick={() => void handleDelete(item)}
                  >
                    {deletingId === item.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    <span className="sr-only">Eliminar resumen</span>
                  </Button>
                </div>

                {open ? (
                  <div className="border-t bg-muted/10 p-4">
                    {detailLoading || !detail || detail.id !== item.id ? (
                      <div className="flex min-h-[90px] items-center justify-center">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div><p className="text-[10px] uppercase text-muted-foreground">Vencimiento</p><p className="mt-1 text-sm font-medium">{formatDate(detail.summary.currentDueDate)}</p></div>
                          <div><p className="text-[10px] uppercase text-muted-foreground">Total ARS</p><p className="mt-1 text-sm font-medium">{detail.summary.totalPesos ? formatFinancialAmount(detail.summary.totalPesos, "ARS") : "—"}</p></div>
                          <div><p className="text-[10px] uppercase text-muted-foreground">Total USD</p><p className="mt-1 text-sm font-medium text-emerald-500">{detail.summary.totalDollars ? formatFinancialAmount(detail.summary.totalDollars, "USD") : "—"}</p></div>
                          <div><p className="text-[10px] uppercase text-muted-foreground">Filas consolidadas</p><p className="mt-1 text-sm font-medium">{detail.rows.length}</p></div>
                        </div>
                        <div className="max-h-[320px] overflow-auto rounded-lg border bg-card">
                          <table className="min-w-full text-sm">
                            <thead className="sticky top-0 bg-card">
                              <tr className="border-b text-xs text-muted-foreground">
                                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                                <th className="px-3 py-2 text-left font-medium">Descripción</th>
                                <th className="px-3 py-2 text-left font-medium">Cuota</th>
                                <th className="px-3 py-2 text-right font-medium">ARS</th>
                                <th className="px-3 py-2 text-right font-medium">USD</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.rows.map((row) => (
                                <tr key={row.id} className="border-b border-border/50 last:border-b-0">
                                  <td className="px-3 py-2 text-muted-foreground">{formatDate(row.dateIso)}</td>
                                  <td className="px-3 py-2 font-medium text-foreground">{row.referenceRaw || row.originalText}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{row.installmentRaw || "—"}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">{row.amountPesos ? formatFinancialAmount(row.amountPesos, "ARS") : "—"}</td>
                                  <td className="px-3 py-2 text-right tabular-nums text-emerald-500">{row.amountDollars ? formatFinancialAmount(row.amountDollars, "USD") : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
