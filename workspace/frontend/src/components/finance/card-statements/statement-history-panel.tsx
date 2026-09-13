"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Archive, FileText, History, Loader2, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Amount } from "@/components/finance/shared/amount";
import type {
  CardStatementListItem,
  CardStatementTraceability,
} from "@/lib/finance/card-statements-api";
import { formatDateLabel, formatSavedAt, statementStatusLabel, statementStatusTone } from "./helpers";

interface StatementHistoryPanelProps {
  history: CardStatementListItem[];
  selectedStatementId: string | null;
  activeStatementId: string;
  loading: boolean;
  actionId: string | null;
  message: string | null;
  traceability: CardStatementTraceability | null;
  traceabilityLoadingId: string | null;
  onSelect: (statementId: string) => void;
  onActivate: (statementId: string) => void;
  onArchive: (statementId: string) => void;
  onTraceability: (statementId: string) => void;
}

/** Historial de versiones de resúmenes: búsqueda, filtro y trazabilidad expandible. */
export function StatementHistoryPanel({
  history,
  selectedStatementId,
  activeStatementId,
  loading,
  actionId,
  message,
  traceability,
  traceabilityLoadingId,
  onSelect,
  onActivate,
  onArchive,
  onTraceability,
}: StatementHistoryPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredHistory = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("es");
    return history.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!needle) return true;
      const haystack = [
        item.bankName,
        item.brand,
        item.statementNumber,
        item.periodKey,
        item.currentDueDate,
        item.document.fileName,
        item.document.sha256,
        ...item.cards.flatMap((card) => [card.cardLast4, card.holderName]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es");
      return haystack.includes(needle);
    });
  }, [history, search, statusFilter]);

  return (
    <Card className="shadow-sm" data-testid="card-statement-history">
      <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Historial de resúmenes
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada PDF y ejecución IA se conserva. Una sola versión queda activa por banco,
            marca y período; las anteriores pueden consultarse, reactivarse o archivarse.
          </p>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-[minmax(220px,1fr)_180px] lg:w-auto">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              placeholder="Banco, tarjeta, período o archivo"
              className="pl-9"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatusFilter(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
            aria-label="Filtrar historial por estado"
          >
            <option value="all">Todos los estados</option>
            <option value="accepted">Activos</option>
            <option value="superseded">Versiones anteriores</option>
            <option value="archived">Archivados</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <div className="rounded-xl border bg-muted/30 p-3 text-sm">{message}</div>
        ) : null}

        {loading && history.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando historial...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No hay resúmenes que coincidan con la búsqueda y el estado seleccionados.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const selected = selectedStatementId === item.id;
              const active = item.status === "accepted" && item.isActiveForPeriod;
              const itemTraceability = traceability?.statement.id === item.id ? traceability : null;
              const cards = item.cards
                .map((card) => [card.cardLast4 ? `•••• ${card.cardLast4}` : null, card.holderName]
                  .filter(Boolean)
                  .join(" · "))
                .filter(Boolean)
                .join(" / ");

              return (
                <div
                  key={item.id}
                  data-testid={`card-statement-history-row-${item.id}`}
                  className={`rounded-2xl border p-4 transition-colors ${
                    selected ? "border-primary/50 bg-primary/[0.03]" : "bg-card"
                  }`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statementStatusTone(item.status)}`}>
                          {statementStatusLabel(item.status)}
                        </span>
                        {active ? (
                          <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                            Versión vigente
                          </span>
                        ) : null}
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                          v{item.version}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                          {item.periodKey ? formatDateLabel(`${item.periodKey}-01`) : "Período no identificado"}
                        </span>
                      </div>

                      <div>
                        <p className="font-semibold">
                          {[item.bankName, item.brand].filter(Boolean).join(" · ") || "Resumen de tarjeta"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {cards || "Tarjetas no identificadas"}
                        </p>
                      </div>

                      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                        <p className="truncate" title={item.document.fileName}>
                          PDF: {item.document.fileName}
                        </p>
                        <p>Importado: {formatSavedAt(item.createdAt)}</p>
                        <p>Vencimiento: {formatDateLabel(item.currentDueDate)}</p>
                      </div>

                      {item.archivedReason ? (
                        <p className="text-xs text-muted-foreground">
                          Motivo de archivo: {item.archivedReason}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 xl:items-end">
                      <div className="text-left xl:text-right">
                        <p className="font-semibold tabular-nums"><Amount value={item.totalPesos} currency="ARS" /></p>
                        <p className="text-sm tabular-nums text-muted-foreground"><Amount value={item.totalDollars} currency="USD" /></p>
                      </div>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <Button
                          variant={selected ? "secondary" : "outline"}
                          size="sm"
                          disabled={loading || selected}
                          onClick={() => onSelect(item.id)}
                        >
                          {loading && selected ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-2 h-3.5 w-3.5" />}
                          {selected ? "Abierto" : "Ver"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={traceabilityLoadingId === item.id}
                          onClick={() => onTraceability(item.id)}
                        >
                          {traceabilityLoadingId === item.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-2 h-3.5 w-3.5" />}
                          Trazabilidad
                        </Button>
                        {!active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionId === item.id}
                            onClick={() => onActivate(item.id)}
                          >
                            {actionId === item.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-2 h-3.5 w-3.5" />}
                            Activar
                          </Button>
                        ) : null}
                        {item.status !== "archived" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionId === item.id}
                            onClick={() => onArchive(item.id)}
                          >
                            {actionId === item.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Archive className="mr-2 h-3.5 w-3.5" />}
                            Archivar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {itemTraceability ? (
                    <div className="mt-4 space-y-4 border-t pt-4" data-testid={`card-statement-traceability-${item.id}`}>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl bg-muted/35 p-3 text-xs">
                          <p className="font-medium text-foreground">Documento fuente</p>
                          <p className="mt-2 break-all text-muted-foreground">SHA-256: {itemTraceability.document.sha256}</p>
                          <p className="mt-1 text-muted-foreground">
                            {itemTraceability.document.pageCount ?? "?"} páginas · {itemTraceability.document.sizeBytes.toLocaleString("es-AR")} bytes
                          </p>
                        </div>
                        <div className="rounded-xl bg-muted/35 p-3 text-xs">
                          <p className="font-medium text-foreground">Importación</p>
                          {itemTraceability.draft ? (
                            <>
                              <p className="mt-2 text-muted-foreground">Borrador: {itemTraceability.draft.status}</p>
                              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{itemTraceability.draft.id}</p>
                            </>
                          ) : (
                            <p className="mt-2 text-muted-foreground">Sin borrador vinculado.</p>
                          )}
                        </div>
                        <div className="rounded-xl bg-muted/35 p-3 text-xs">
                          <p className="font-medium text-foreground">Extracción IA</p>
                          {itemTraceability.aiRun ? (
                            <>
                              <p className="mt-2 text-muted-foreground">
                                {itemTraceability.aiRun.provider} · {itemTraceability.aiRun.model} · {itemTraceability.aiRun.status}
                              </p>
                              <p className="mt-1 break-all text-muted-foreground">Prompt: {itemTraceability.aiRun.promptHash}</p>
                              {itemTraceability.aiRun.rawResponseHash ? (
                                <p className="mt-1 break-all text-muted-foreground">Respuesta: {itemTraceability.aiRun.rawResponseHash}</p>
                              ) : null}
                              <p className="mt-1 text-muted-foreground">Reintentos: {itemTraceability.aiRun.retries}</p>
                            </>
                          ) : (
                            <p className="mt-2 text-muted-foreground">Sin ejecución IA vinculada.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium">Cadena de versiones</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {itemTraceability.versions.map((version) => (
                            <div key={version.id} className="rounded-lg border p-3 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">Versión {version.version}</span>
                                <span className="text-muted-foreground">{statementStatusLabel(version.status)}</span>
                              </div>
                              <p className="mt-1 truncate text-muted-foreground" title={version.document.fileName}>
                                {version.document.fileName}
                              </p>
                              <p className="mt-1 text-muted-foreground">{formatSavedAt(version.createdAt)}</p>
                              {version.isActiveForPeriod ? (
                                <p className="mt-2 font-medium text-emerald-600 dark:text-emerald-400">Vigente para el período</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>

                      {itemTraceability.aiRun?.validationErrors ? (
                        <details className="rounded-xl border p-3 text-xs">
                          <summary className="cursor-pointer font-medium">Detalle de validación IA</summary>
                          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-muted-foreground">
                            {itemTraceability.aiRun.validationErrors}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
