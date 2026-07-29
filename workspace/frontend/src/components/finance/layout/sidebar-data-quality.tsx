"use client";


import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CircleHelp,
  Clock3,
  DatabaseZap,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getDashboardOverview,
  type DashboardOverview,
} from "@/lib/finance/dashboard-api";
import {
  getPeriodRange,
  USER_TIMEZONE,
  useFinanceUI,
} from "@/lib/finance/ui-store";


interface SidebarDataQualityProps {
  onNavigate?: () => void;
}


function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: USER_TIMEZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}


export function SidebarDataQuality({ onNavigate }: SidebarDataQualityProps) {
  const period = useFinanceUI((state) => state.period);
  const setSection = useFinanceUI((state) => state.setSection);
  const openMovementDrilldown = useFinanceUI((state) => state.openMovementDrilldown);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const range = useMemo(() => getPeriodRange(period), [period]);


  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setOverview(await getDashboardOverview(range.from, range.to));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo consultar la calidad del dato.");
      setOverview(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range.from, range.to]);


  useEffect(() => {
    void load(false);
  }, [load]);


  if (loading || error || !overview) return null;


  const unclassified = overview.dataQuality.unclassifiedRecords;
  const alerts = overview.alerts.length;
  const criticalAlerts = overview.alerts.filter((alert) => alert.severity === "critical").length;
  const lastUpdatedAt = overview.dataQuality.lastUpdatedAt;
  const hasUsefulInformation = unclassified > 0 || alerts > 0 || lastUpdatedAt !== null;


  if (!hasUsefulInformation) return null;


  function finishNavigation(): void {
    onNavigate?.();
  }


  function openUnclassified(): void {
    openMovementDrilldown({
      from: range.from,
      to: range.to,
      label: "Calidad del dato: movimientos sin clasificar",
      category: "Sin clasificar",
    });
    finishNavigation();
  }


  function openAlerts(): void {
    setSection("dashboard");
    finishNavigation();
  }


  function openLatestMovement(): void {
    setSection("movimientos");
    finishNavigation();
  }


  return (
    <section
      className="rounded-xl border bg-card p-3"
      aria-labelledby="sidebar-data-quality-title"
      data-testid="sidebar-data-quality"
      data-source="dashboard.dataQuality"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            id="sidebar-data-quality-title"
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground"
          >
            <DatabaseZap className="size-3.5" aria-hidden="true" />
            Calidad del dato
          </p>
          <p className="mt-1 truncate text-[10px] text-muted-foreground">
            {range.label}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => void load(true)}
          disabled={refreshing}
          aria-label="Actualizar calidad del dato"
          data-testid="sidebar-quality-refresh"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
        </Button>
      </div>


      <div className="mt-3 space-y-1.5">
        {unclassified > 0 ? (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2 text-left outline-none transition-colors hover:bg-amber-100/70 focus-visible:ring-2 focus-visible:ring-ring dark:border-amber-900 dark:bg-amber-950/20"
            onClick={openUnclassified}
            data-testid="sidebar-quality-unclassified"
            data-count={unclassified}
          >
            <CircleHelp className="size-4 shrink-0 text-amber-700" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-foreground">Sin clasificar</span>
              <span className="block text-[10px] text-muted-foreground">
                {unclassified} movimiento{unclassified === 1 ? "" : "s"}
              </span>
            </span>
          </button>
        ) : null}


        {alerts > 0 ? (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={openAlerts}
            data-testid="sidebar-quality-alerts"
            data-count={alerts}
          >
            <BellRing className="size-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-foreground">Alertas activas</span>
              <span className="block text-[10px] text-muted-foreground">
                {alerts} regla{alerts === 1 ? "" : "s"}
                {criticalAlerts > 0 ? ` · ${criticalAlerts} crítica${criticalAlerts === 1 ? "" : "s"}` : ""}
              </span>
            </span>
          </button>
        ) : null}


        {lastUpdatedAt ? (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={openLatestMovement}
            data-testid="sidebar-quality-last-updated"
            data-value={lastUpdatedAt}
          >
            <Clock3 className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-foreground">Último dato actualizado</span>
              <span className="block text-[10px] text-muted-foreground">
                {formatTimestamp(lastUpdatedAt)}
              </span>
            </span>
          </button>
        ) : null}
      </div>


      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Indicadores técnicos, sin puntaje ni diagnóstico financiero.
      </p>
    </section>
  );
}