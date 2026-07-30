"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  GitCompareArrows,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listReconciliation,
  resolveReconciliation,
  scanReconciliation,
  type ReconciliationItem,
  type ReconciliationParticipant,
  type ReconciliationResolution,
  type ReconciliationResponse,
} from "@/lib/finance/reconciliation-api";
import { useFinanceUI } from "@/lib/finance/ui-store";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function scanRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 180);
  return { from: isoDate(from), to: isoDate(to) };
}

function numericAmount(value: string): number {
  const compact = value.replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!compact) return Number.NaN;
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  const decimalIndex = Math.max(comma, dot);
  if (decimalIndex < 0) return Number(compact);
  const decimals = compact.length - decimalIndex - 1;
  if (decimals < 1 || decimals > 2) {
    return Number(compact.replace(/[.,]/g, ""));
  }
  const whole = compact.slice(0, decimalIndex).replace(/[.,]/g, "") || "0";
  const fraction = compact.slice(decimalIndex + 1).replace(/[.,]/g, "");
  return Number(`${whole}.${fraction}`);
}

function money(
  value: string | null,
  currency: "ARS" | "USD" | null,
): string {
  if (!value || !currency) return "Importe no informado";
  const normalized = numericAmount(value);
  if (!Number.isFinite(normalized)) return `${currency} ${value}`;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(normalized);
}

function relationLabel(item: ReconciliationItem): string {
  if (item.relationType === "salary_deposit") return "Sueldo y depósito";
  if (item.relationType === "card_payment") return "Pago de tarjeta";
  return "Posible duplicado";
}

function participantLabel(participant: ReconciliationParticipant): string {
  if (participant.entityType === "salary_receipt") return "Recibo de sueldo";
  if (participant.entityType === "card_statement") return "Resumen de tarjeta";
  return "Movimiento";
}

function resolutionOptions(item: ReconciliationItem): Array<{
  label: string;
  action: ReconciliationResolution;
  primary?: boolean;
}> {
  if (item.relationType === "salary_deposit") {
    return [
      { label: "Conservar recibo", action: "exclude_left", primary: true },
      { label: "Contar ambos", action: "keep_both" },
      { label: "No están relacionados", action: "dismiss" },
    ];
  }
  if (item.relationType === "card_payment") {
    return [
      { label: "Conservar resumen", action: "exclude_left", primary: true },
      { label: "Contar ambos", action: "keep_both" },
      { label: "No están relacionados", action: "dismiss" },
    ];
  }
  return [
    { label: "Conservar A", action: "exclude_right" },
    { label: "Conservar B", action: "exclude_left" },
    { label: "Son distintos", action: "keep_both", primary: true },
  ];
}

export function ConciliacionSection() {
  const navigateToSearchResult = useFinanceUI(
    (state) => state.navigateToSearchResult,
  );
  const [mode, setMode] = useState<"pending" | "history">("pending");
  const [data, setData] = useState<ReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const load = useCallback(async (selectedMode: "pending" | "history") => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await listReconciliation({
          status: selectedMode === "pending" ? "open" : "all",
          scope: selectedMode === "pending" ? "current" : "historical",
          limit: 100,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cargar la conciliación.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await scanReconciliation(scanRange());
      setLastRefresh(result.refreshedAt ?? new Date().toISOString());
      await load("pending");
      setMode("pending");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar la conciliación.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function resolve(item: ReconciliationItem, action: ReconciliationResolution) {
    setActionId(item.id);
    setError(null);
    try {
      await resolveReconciliation(item.id, action);
      await load(mode);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar la decisión.",
      );
    } finally {
      setActionId(null);
    }
  }

  function openParticipant(participant: ReconciliationParticipant) {
    navigateToSearchResult({
      section: participant.navigation.section,
      recordId: participant.navigation.recordId,
      recordType: participant.navigation.recordType,
      module: participant.navigation.module,
      typeLabel: participant.navigation.typeLabel,
      title: participant.navigation.title,
      context: participant.navigation.context,
    });
  }

  const items = data?.items ?? [];
  const highConfidence = useMemo(
    () => items.filter((item) => item.confidence >= 90).length,
    [items],
  );

  return (
    <section className="space-y-6" data-testid="reconciliation-redesigned-section">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400/80">
            Control de doble conteo
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <GitCompareArrows className="size-7 text-emerald-400" />
            Conciliación
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            La bandeja se reconstruye con los datos que existen hoy. Lo eliminado desaparece y cada registro abre su destino exacto.
          </p>
        </div>
        <Button onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Sincronizar ahora
        </Button>
      </header>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Pendientes vigentes"
          value={mode === "pending" ? items.length : data?.summary.open ?? 0}
          icon={GitCompareArrows}
        />
        <SummaryCard
          label="Alta confianza"
          value={highConfidence}
          icon={ShieldCheck}
        />
        <SummaryCard
          label="Última sincronización"
          value={lastRefresh ? new Date(lastRefresh).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"}
          icon={RefreshCw}
          textValue
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex gap-2">
          <Button
            variant={mode === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("pending");
              void load("pending");
            }}
          >
            Pendientes
          </Button>
          <Button
            variant={mode === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("history");
              void load("history");
            }}
          >
            <History className="mr-2 size-4" />
            Historial
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "pending"
            ? "Sólo coincidencias de la última sincronización"
            : "Casos anteriores y decisiones guardadas"}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Actualizando casos…
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <CheckCircle2 className="size-11 text-emerald-400" />
            <h2 className="mt-4 text-lg font-semibold">
              {mode === "pending" ? "No hay casos vigentes" : "No hay historial para mostrar"}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              {mode === "pending"
                ? "Los movimientos actuales no presentan coincidencias que requieran una decisión."
                : "Las decisiones aparecerán aquí después de revisar casos."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <CaseCard
              key={item.id}
              item={item}
              busy={actionId === item.id}
              onOpen={openParticipant}
              onResolve={(action) => void resolve(item, action)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  textValue = false,
}: {
  label: string;
  value: number | string;
  icon: typeof GitCompareArrows;
  textValue?: boolean;
}) {
  return (
    <Card className="border-emerald-500/10 bg-card/80 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`mt-2 font-bold ${textValue ? "text-xl" : "text-3xl"}`}>{value}</p>
        </div>
        <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function CaseCard({
  item,
  busy,
  onOpen,
  onResolve,
}: {
  item: ReconciliationItem;
  busy: boolean;
  onOpen: (participant: ReconciliationParticipant) => void;
  onResolve: (action: ReconciliationResolution) => void;
}) {
  return (
    <Card className="border-emerald-500/10 bg-card/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{relationLabel(item)}</Badge>
              <Badge variant="outline">{item.confidence}% confianza</Badge>
              {!item.isCurrent ? <Badge variant="outline">Histórico</Badge> : null}
            </div>
            <CardTitle className="mt-3 text-base">{item.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {money(item.amount, item.currency)}
              {item.occurredOn ? ` · ${item.occurredOn}` : ""}
            </p>
          </div>
          {item.status !== "open" ? (
            <Badge variant="outline">
              {item.status === "resolved" ? "Resuelto" : "Descartado"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          {item.participants.map((participant, index) => (
            <div key={participant.id} className="contents">
              <ParticipantCard participant={participant} onOpen={() => onOpen(participant)} />
              {index === 0 ? (
                <ArrowRight className="mx-auto hidden size-5 self-center text-muted-foreground lg:block" />
              ) : null}
            </div>
          ))}
        </div>

        {item.rationale.length > 0 ? (
          <ul className="space-y-1 rounded-xl bg-muted/35 px-4 py-3 text-xs text-muted-foreground">
            {item.rationale.slice(0, 3).map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        ) : null}

        {item.status === "open" ? (
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            {resolutionOptions(item).map((option) => (
              <Button
                key={option.action}
                size="sm"
                variant={option.primary ? "default" : "outline"}
                onClick={() => onResolve(option.action)}
                disabled={busy}
              >
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {option.label}
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ParticipantCard({
  participant,
  onOpen,
}: {
  participant: ReconciliationParticipant;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {participantLabel(participant)}
          </p>
          <p className="mt-1 truncate font-medium" title={participant.description}>
            {participant.description}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {money(participant.amount, participant.currency)}
            {participant.occurredOn ? ` · ${participant.occurredOn}` : ""}
          </p>
        </div>
        {participant.excluded ? (
          <Badge variant="outline">Excluido</Badge>
        ) : null}
      </div>
      <Button variant="ghost" size="sm" className="mt-3 px-0" onClick={onOpen}>
        <ExternalLink className="mr-2 size-4" />
        {participant.navigation.label}
      </Button>
    </div>
  );
}
