"use client";


import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getDashboardOverview,
  type DashboardAlert,
  type DashboardAlertSeverity,
} from "@/lib/finance/dashboard-api";
import { getPeriodRange, useFinanceUI } from "@/lib/finance/ui-store";


const SEVERITY_ORDER: Record<DashboardAlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};


const SEVERITY_LABEL: Record<DashboardAlertSeverity, string> = {
  critical: "Crítica",
  warning: "Atención",
  info: "Informativa",
};


const SEVERITY_ICON: Record<DashboardAlertSeverity, typeof Bell> = {
  critical: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};


export function sortDashboardAlerts(alerts: DashboardAlert[]): DashboardAlert[] {
  return [...alerts].sort((left, right) => {
    const bySeverity = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
    if (bySeverity !== 0) return bySeverity;
    return left.id.localeCompare(right.id);
  });
}


export function AlertCenter() {
  const period = useFinanceUI((state) => state.period);
  const setSection = useFinanceUI((state) => state.setSection);
  const openMovementDrilldown = useFinanceUI((state) => state.openMovementDrilldown);
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);


  const range = useMemo(() => getPeriodRange(period), [period]);
  const sortedAlerts = useMemo(() => sortDashboardAlerts(alerts), [alerts]);
  const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;


  const loadAlerts = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const overview = await getDashboardOverview(range.from, range.to);
      setAlerts(overview.alerts);
      setUpdatedAt(new Date());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar las alertas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range.from, range.to]);


  useEffect(() => {
    void loadAlerts(false);
  }, [loadAlerts]);


  function handleAction(alert: DashboardAlert) {
    if (alert.action.section === "movimientos" && alert.action.drilldown) {
      openMovementDrilldown(alert.action.drilldown);
    } else {
      setSection(alert.action.section);
    }
    setOpen(false);
  }


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative size-9 rounded-full"
          aria-label={alerts.length > 0 ? `Centro de alertas, ${alerts.length} activas` : "Centro de alertas, sin alertas activas"}
          data-testid="header-alert-center"
        >
          <Bell className="size-4" />
          {alerts.length > 0 ? (
            <span
              className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-5 text-destructive-foreground"
              data-testid="alert-center-count"
            >
              {alerts.length > 99 ? "99+" : alerts.length}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>


      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md" data-testid="alert-center-panel">
        <SheetHeader className="border-b px-5 py-5 text-left">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <SheetTitle>Centro de alertas</SheetTitle>
              <SheetDescription className="mt-1">
                Reglas determinísticas para {range.label.toLocaleLowerCase("es-AR")}.
              </SheetDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => void loadAlerts(true)}
              disabled={refreshing}
              aria-label="Actualizar alertas"
              data-testid="alert-center-refresh"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {alerts.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{alerts.length} activas</Badge>
              {criticalCount > 0 ? <Badge variant="destructive">{criticalCount} críticas</Badge> : null}
            </div>
          ) : null}
        </SheetHeader>


        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" />
                Cargando alertas…
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
                <div className="flex gap-3">
                  <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">No pudimos actualizar las alertas</p>
                    <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                    <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loadAlerts(true)}>
                      Reintentar
                    </Button>
                  </div>
                </div>
              </div>
            ) : sortedAlerts.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center" data-testid="alert-center-empty">
                <CheckCircle2 className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-medium">No hay alertas activas</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ninguna regla determinística requiere atención para este período.
                </p>
              </div>
            ) : (
              sortedAlerts.map((alert) => {
                const Icon = SEVERITY_ICON[alert.severity];
                return (
                  <article
                    key={alert.id}
                    className="rounded-xl border bg-card p-4"
                    data-testid={`alert-center-item-${alert.rule}`}
                    data-severity={alert.severity}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{alert.title}</h3>
                          <Badge variant={alert.severity === "critical" ? "destructive" : "outline"}>
                            {SEVERITY_LABEL[alert.severity]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Regla: {alert.rule}
                        </p>
                        {alert.evidence.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {alert.evidence.map((item, index) => (
                              <li key={`${alert.id}-evidence-${index}`}>• {item}</li>
                            ))}
                          </ul>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => handleAction(alert)}
                          data-testid={`alert-center-action-${alert.rule}`}
                        >
                          {alert.action.label}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </ScrollArea>


        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          {updatedAt ? `Actualizado ${updatedAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : "Actualización pendiente"}
          {" · "}Sin IA ni notificaciones externas.
        </div>
      </SheetContent>
    </Sheet>
  );
}