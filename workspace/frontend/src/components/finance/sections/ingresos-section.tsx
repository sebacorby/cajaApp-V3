"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Banknote,
  CalendarRange,
  CircleDollarSign,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import { SalaryReceiptsPanel } from "@/components/finance/imports/salary-receipts-panel";
import {
  createIncomeEvent,
  createIncomeSource,
  deleteIncomeEvent,
  deleteIncomeSource,
  getIncomeOverview,
  updateIncomeSource,
  type IncomeCurrency,
  type IncomeEventKind,
  type IncomeEventStatus,
  type IncomeMonthProjection,
  type IncomeOverview,
  type IncomeSourceKind,
  type IncomeSourcePayload,
  type IncomeSourceRecord,
} from "@/lib/finance/incomes-api";

interface SourceFormState {
  id: string | null;
  name: string;
  employer: string;
  kind: IncomeSourceKind;
  currency: IncomeCurrency;
  baseAmount: string;
  startMonthKey: string;
  paymentDay: string;
  increaseEveryMonths: string;
  increasePercent: string;
  active: boolean;
}

interface EventFormState {
  sourceId: string | null;
  sourceName: string;
  currency: IncomeCurrency;
  monthKey: string;
  kind: IncomeEventKind;
  amount: string;
  label: string;
  status: IncomeEventStatus;
  notes: string;
}

const SOURCE_KIND_LABELS: Record<IncomeSourceKind, string> = {
  salary: "Sueldo",
  benefit: "Asignación / beneficio",
  freelance: "Freelance recurrente",
  other: "Otro recurrente",
};

const EVENT_KIND_LABELS: Record<IncomeEventKind, string> = {
  monthly_override: "Valor real del mes",
  permanent_adjustment: "Cambio desde este mes",
  bonus: "Bono",
  aguinaldo: "Aguinaldo",
  extra: "Ingreso extra",
  other: "Otro ingreso",
};

const ORIGIN_LABELS: Record<string, string> = {
  base: "Base",
  automatic_increase: "Aumento automático",
  permanent_adjustment: "Cambio aplicado",
  monthly_override: "Valor real",
};

function monthKeyWithOffset(offset: number): string {
  const current = new Date();
  const target = new Date(current.getFullYear(), current.getMonth() + offset, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey(): string {
  return monthKeyWithOffset(0);
}

function emptySourceForm(): SourceFormState {
  return {
    id: null,
    name: "",
    employer: "",
    kind: "salary",
    currency: "ARS",
    baseAmount: "",
    startMonthKey: currentMonthKey(),
    paymentDay: "1",
    increaseEveryMonths: "3",
    increasePercent: "0",
    active: true,
  };
}

function emptyOneOffForm(): EventFormState {
  return {
    sourceId: null,
    sourceName: "",
    currency: "ARS",
    monthKey: currentMonthKey(),
    kind: "bonus",
    amount: "",
    label: "Bono",
    status: "projected",
    notes: "",
  };
}

function formatAmount(value: string, currency: IncomeCurrency): string {
  return formatFinancialAmount(value, currency);
}

function isZeroAmount(value: string | null | undefined): boolean {
  if (!value) return true;
  return /^[-+]?0+(?:[.,]0+)?$/.test(value.trim().replace(/\s/g, ""));
}

function parseInputNumber(value: string): number {
  const compact = value.trim().replace(/\s/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact.replace(/,/g, "");
  return Number(normalized);
}

function validateSourceForm(form: SourceFormState): string | null {
  if (!form.name.trim()) return "Ingresá un nombre para la fuente.";
  if (!form.startMonthKey) return "Seleccioná el mes de inicio.";

  const amount = parseInputNumber(form.baseAmount);
  if (!Number.isFinite(amount) || amount < 0) return "Ingresá un monto base válido.";

  const increaseEveryMonths = Number.parseInt(form.increaseEveryMonths, 10);
  if (!Number.isInteger(increaseEveryMonths) || increaseEveryMonths < 1 || increaseEveryMonths > 24) {
    return "La frecuencia de aumento debe estar entre 1 y 24 meses.";
  }

  const increasePercent = Number(form.increasePercent.replace(",", "."));
  if (!Number.isFinite(increasePercent) || increasePercent <= -100 || increasePercent > 1000) {
    return "El porcentaje debe ser mayor a -100 y no superar 1000.";
  }

  if (form.paymentDay.trim()) {
    const paymentDay = Number.parseInt(form.paymentDay, 10);
    if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) {
      return "El día de cobro debe estar entre 1 y 31.";
    }
  }

  return null;
}

function validateEventForm(form: EventFormState): string | null {
  if (!form.monthKey) return "Seleccioná el mes del ingreso.";
  if (!form.label.trim()) return "Ingresá una descripción.";

  const amount = parseInputNumber(form.amount);
  if (!Number.isFinite(amount) || amount < 0) return "Ingresá un monto válido.";

  return null;
}

export function IngresosSection() {
  const [overview, setOverview] = useState<IncomeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const [sourceForm, setSourceForm] = useState<SourceFormState>(emptySourceForm);
  const [sourceSubmitting, setSourceSubmitting] = useState(false);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(emptyOneOffForm);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const range = useMemo(
    () => ({ from: monthKeyWithOffset(-3), to: monthKeyWithOffset(12) }),
    [],
  );

  const loadOverview = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setErrorMessage(null);

      try {
        setOverview(await getIncomeOverview(range.from, range.to));
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los ingresos. Verificá que el backend esté iniciado.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range.from, range.to],
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const openCreateSource = useCallback(() => {
    setFormErrorMessage(null);
    setSourceForm(emptySourceForm());
    setSourceSheetOpen(true);
  }, []);

  const openEditSource = useCallback((source: IncomeSourceRecord) => {
    setFormErrorMessage(null);
    setSourceForm({
      id: source.id,
      name: source.name,
      employer: source.employer ?? "",
      kind: source.kind,
      currency: source.currency,
      baseAmount: source.baseAmount,
      startMonthKey: source.startMonthKey,
      paymentDay: source.paymentDay ? String(source.paymentDay) : "",
      increaseEveryMonths: String(source.increaseEveryMonths),
      increasePercent: source.increasePercent,
      active: source.active,
    });
    setSourceSheetOpen(true);
  }, []);

  const openSourceEvent = useCallback(
    (source: IncomeSourceRecord, kind: "monthly_override" | "permanent_adjustment") => {
      setFormErrorMessage(null);
      setEventForm({
        sourceId: source.id,
        sourceName: source.name,
        currency: source.currency,
        monthKey: currentMonthKey(),
        kind,
        amount: source.baseAmount,
        label: kind === "monthly_override" ? "Valor real del mes" : "Cambio salarial",
        status: kind === "monthly_override" ? "actual" : "projected",
        notes: "",
      });
      setEventSheetOpen(true);
    },
    [],
  );

  const openOneOff = useCallback(() => {
    setFormErrorMessage(null);
    setEventForm(emptyOneOffForm());
    setEventSheetOpen(true);
  }, []);

  const handleSourceSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const validationMessage = validateSourceForm(sourceForm);
      if (validationMessage) {
        setFormErrorMessage(validationMessage);
        return;
      }

      const payload: IncomeSourcePayload = {
        name: sourceForm.name.trim(),
        employer: sourceForm.employer.trim() || null,
        kind: sourceForm.kind,
        currency: sourceForm.currency,
        baseAmount: sourceForm.baseAmount.trim(),
        startMonthKey: sourceForm.startMonthKey,
        paymentDay: sourceForm.paymentDay.trim()
          ? Number.parseInt(sourceForm.paymentDay, 10)
          : null,
        increaseEveryMonths: Number.parseInt(sourceForm.increaseEveryMonths, 10),
        increasePercent: sourceForm.increasePercent.trim() || "0",
        active: sourceForm.active,
      };

      setSourceSubmitting(true);
      setFormErrorMessage(null);
      try {
        if (sourceForm.id) await updateIncomeSource(sourceForm.id, payload);
        else await createIncomeSource(payload);
        setSourceSheetOpen(false);
        await loadOverview(true);
      } catch (error) {
        setFormErrorMessage(
          error instanceof Error ? error.message : "No se pudo guardar la fuente de ingreso.",
        );
      } finally {
        setSourceSubmitting(false);
      }
    },
    [loadOverview, sourceForm],
  );

  const handleEventSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const validationMessage = validateEventForm(eventForm);
      if (validationMessage) {
        setFormErrorMessage(validationMessage);
        return;
      }

      const sourceBound =
        eventForm.kind === "monthly_override" || eventForm.kind === "permanent_adjustment";

      setEventSubmitting(true);
      setFormErrorMessage(null);
      try {
        await createIncomeEvent({
          sourceId: sourceBound ? eventForm.sourceId : null,
          monthKey: eventForm.monthKey,
          kind: eventForm.kind,
          currency: sourceBound ? undefined : eventForm.currency,
          amount: eventForm.amount.trim(),
          label: eventForm.label.trim(),
          status: eventForm.status,
          notes: eventForm.notes.trim() || null,
        });
        setEventSheetOpen(false);
        await loadOverview(true);
      } catch (error) {
        setFormErrorMessage(
          error instanceof Error ? error.message : "No se pudo guardar el ingreso.",
        );
      } finally {
        setEventSubmitting(false);
      }
    },
    [eventForm, loadOverview],
  );

  const handleDeleteSource = useCallback(
    async (source: IncomeSourceRecord) => {
      if (!window.confirm(`¿Eliminar la fuente "${source.name}" y sus ajustes?`)) return;
      setDeletingId(source.id);
      setErrorMessage(null);
      try {
        await deleteIncomeSource(source.id);
        await loadOverview(true);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo eliminar la fuente.");
      } finally {
        setDeletingId(null);
      }
    },
    [loadOverview],
  );

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      if (!window.confirm("¿Eliminar este valor y recalcular la proyección?")) return;
      setDeletingId(eventId);
      setErrorMessage(null);
      try {
        await deleteIncomeEvent(eventId);
        await loadOverview(true);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo eliminar el valor.");
      } finally {
        setDeletingId(null);
      }
    },
    [loadOverview],
  );

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando ingresos y proyecciones...</p>
      </div>
    );
  }

  const summary = overview?.summary;

  return (
    <div className="space-y-6" data-testid="incomes-section">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ingresos</h1>
          <p className="mt-1 text-muted-foreground">
            Sueldos, aumentos, bonos y valores reales calculados por el backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadOverview(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
            Actualizar
          </Button>
          <Button variant="outline" onClick={openOneOff} data-testid="add-one-off-income">
            <CircleDollarSign className="mr-2 size-4" />
            Bono / extra
          </Button>
          <Button onClick={openCreateSource} data-testid="add-income-source">
            <Plus className="mr-2 size-4" />
            Nueva fuente
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Banknote}
          label="Total del mes"
          value={formatAmount(summary?.totalArs ?? "0", "ARS")}
          detail={!isZeroAmount(summary?.totalUsd) ? `${formatAmount(summary?.totalUsd ?? "0", "USD")} adicionales` : "ARS y USD se muestran separados"}
          testId="income-total-summary"
        />
        <SummaryCard
          icon={WalletCards}
          label="Recurrentes"
          value={formatAmount(summary?.recurringArs ?? "0", "ARS")}
          detail={!isZeroAmount(summary?.recurringUsd) ? `${formatAmount(summary?.recurringUsd ?? "0", "USD")} · ${summary?.recurringSources ?? 0} fuentes` : `${summary?.recurringSources ?? 0} fuentes incluidas este mes`}
          testId="income-recurring-summary"
        />
        <SummaryCard
          icon={CircleDollarSign}
          label="Bonos y extras"
          value={formatAmount(summary?.oneOffArs ?? "0", "ARS")}
          detail={!isZeroAmount(summary?.oneOffUsd) ? `${formatAmount(summary?.oneOffUsd ?? "0", "USD")} · ${summary?.oneOffCount ?? 0} eventos` : `${summary?.oneOffCount ?? 0} eventos este mes`}
          testId="income-one-off-summary"
        />
        <SummaryCard
          icon={CalendarRange}
          label="Horizonte"
          value={`${overview?.months.length ?? 0} meses`}
          detail={`${range.from} a ${range.to}`}
          testId="income-range-summary"
        />
      </div>

      <SalaryReceiptsPanel
        sources={overview?.sources ?? []}
        onAccepted={() => loadOverview(true)}
      />

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Fuentes recurrentes</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada fuente conserva su base, ajustes y regla de aumento.
            </p>
          </div>
          <Button size="sm" onClick={openCreateSource}>
            <Plus className="mr-2 size-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {overview && overview.sources.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {overview.sources.map((source) => (
                <IncomeSourceCard
                  key={source.id}
                  source={source}
                  deleting={deletingId === source.id}
                  deletingId={deletingId}
                  onEdit={() => openEditSource(source)}
                  onMonthlyOverride={() => openSourceEvent(source, "monthly_override")}
                  onPermanentAdjustment={() => openSourceEvent(source, "permanent_adjustment")}
                  onDelete={() => void handleDeleteSource(source)}
                  onDeleteEvent={(eventId) => void handleDeleteEvent(eventId)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <Banknote className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-3 font-medium">Todavía no hay fuentes de ingreso</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Agregá un sueldo o ingreso recurrente para comenzar la proyección.
              </p>
              <Button className="mt-4" onClick={openCreateSource}>
                <Plus className="mr-2 size-4" />
                Agregar primer ingreso
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Calendario de ingresos</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Valores reales y estimados. El frontend sólo presenta el cálculo del backend.
          </p>
        </CardHeader>
        <CardContent>
          {overview && overview.months.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {overview.months.map((month) => (
                <IncomeMonthCard
                  key={month.monthKey}
                  month={month}
                  current={month.monthKey === overview.currentMonthKey}
                  deletingId={deletingId}
                  onDeleteEvent={(eventId) => void handleDeleteEvent(eventId)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No hay meses proyectados todavía.
            </div>
          )}
        </CardContent>
      </Card>

      <IncomeSourceSheet
        open={sourceSheetOpen}
        setOpen={(open) => {
          setSourceSheetOpen(open);
          if (!open) setFormErrorMessage(null);
        }}
        form={sourceForm}
        setForm={setSourceForm}
        submitting={sourceSubmitting}
        errorMessage={formErrorMessage}
        onSubmit={handleSourceSubmit}
      />

      <IncomeEventSheet
        open={eventSheetOpen}
        setOpen={(open) => {
          setEventSheetOpen(open);
          if (!open) setFormErrorMessage(null);
        }}
        form={eventForm}
        setForm={setEventForm}
        submitting={eventSubmitting}
        errorMessage={formErrorMessage}
        onSubmit={handleEventSubmit}
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  testId,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  detail: string;
  testId: string;
}) {
  return (
    <Card className="shadow-sm" data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Icon className="size-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function IncomeSourceCard({
  source,
  deleting,
  deletingId,
  onEdit,
  onMonthlyOverride,
  onPermanentAdjustment,
  onDelete,
  onDeleteEvent,
}: {
  source: IncomeSourceRecord;
  deleting: boolean;
  deletingId: string | null;
  onEdit: () => void;
  onMonthlyOverride: () => void;
  onPermanentAdjustment: () => void;
  onDelete: () => void;
  onDeleteEvent: (eventId: string) => void;
}) {
  const relevantEvents = source.events.filter(
    (event) => event.kind === "permanent_adjustment" || event.kind === "monthly_override",
  );

  return (
    <div className="rounded-2xl border bg-card p-5" data-testid={`income-source-${source.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{source.name}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {SOURCE_KIND_LABELS[source.kind]}
            </span>
            {!source.active ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Pausada
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {source.employer || "Sin pagador informado"}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar fuente">
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} disabled={deleting} aria-label="Eliminar fuente">
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-muted/45 p-3">
          <p className="text-xs text-muted-foreground">Monto base</p>
          <p className="mt-1 font-semibold tabular-nums">{formatAmount(source.baseAmount, source.currency)}</p>
        </div>
        <div className="rounded-xl bg-muted/45 p-3">
          <p className="text-xs text-muted-foreground">Regla de aumento</p>
          <p className="mt-1 font-semibold">
            {source.increasePercent === "0"
              ? "Sin aumento automático"
              : `${source.increasePercent}% cada ${source.increaseEveryMonths} meses`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onMonthlyOverride}>
          Valor real de un mes
        </Button>
        <Button variant="outline" size="sm" onClick={onPermanentAdjustment}>
          <TrendingUp className="mr-2 size-4" />
          Cambio desde un mes
        </Button>
      </div>

      {relevantEvents.length > 0 ? (
        <div className="mt-4 border-t pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ajustes registrados</p>
          <div className="mt-2 space-y-2">
            {relevantEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.monthKey} · {EVENT_KIND_LABELS[event.kind]}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatAmount(event.amount, event.currency)} · {event.status === "actual" ? "real" : "estimado"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteEvent(event.id)}
                  disabled={deletingId === event.id}
                  aria-label="Eliminar ajuste"
                >
                  {deletingId === event.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IncomeMonthCard({
  month,
  current,
  deletingId,
  onDeleteEvent,
}: {
  month: IncomeMonthProjection;
  current: boolean;
  deletingId: string | null;
  onDeleteEvent: (eventId: string) => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${current ? "border-primary/50 bg-primary/[0.03]" : "bg-card"}`}
      data-testid={`income-month-${month.monthKey}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{current ? "Mes actual" : month.monthKey}</p>
          <h3 className="mt-1 font-semibold capitalize">{month.label}</h3>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">{formatAmount(month.totalArs, "ARS")}</p>
          {!isZeroAmount(month.totalUsd) ? (
            <p className="text-xs tabular-nums text-muted-foreground">{formatAmount(month.totalUsd, "USD")}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {month.recurring.map((item) => (
          <div key={item.sourceId} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {ORIGIN_LABELS[item.origin] || item.origin} · {item.status === "actual" ? "real" : "estimado"}
              </p>
            </div>
            <span className="shrink-0 tabular-nums">{formatAmount(item.amount, item.currency)}</span>
          </div>
        ))}

        {month.oneOffs.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50/70 px-2.5 py-2 text-sm dark:bg-emerald-950/15">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{EVENT_KIND_LABELS[item.kind]} · {item.status === "actual" ? "real" : "estimado"}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="tabular-nums">{formatAmount(item.amount, item.currency)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onDeleteEvent(item.id)}
                disabled={deletingId === item.id}
                aria-label="Eliminar ingreso extraordinario"
              >
                {deletingId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </Button>
            </div>
          </div>
        ))}

        {month.recurring.length === 0 && month.oneOffs.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Sin ingresos configurados.</p>
        ) : null}
      </div>
    </div>
  );
}

function IncomeSourceSheet({
  open,
  setOpen,
  form,
  setForm,
  submitting,
  errorMessage,
  onSubmit,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  form: SourceFormState;
  setForm: Dispatch<SetStateAction<SourceFormState>>;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex min-h-full flex-col">
          <SheetHeader>
            <SheetTitle>{form.id ? "Editar fuente de ingreso" : "Nueva fuente de ingreso"}</SheetTitle>
            <SheetDescription>
              Configurá el monto base y la regla de aumento. Los cálculos se realizan en el backend.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 py-6">
            {errorMessage ? <FormError message={errorMessage} /> : null}

            <Field label="Nombre">
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Sueldo principal"
                data-testid="income-source-name"
                required
              />
            </Field>

            <Field label="Empleador o pagador">
              <Input
                value={form.employer}
                onChange={(event) => setForm((current) => ({ ...current, employer: event.target.value }))}
                placeholder="Empresa"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.kind}
                  onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as IncomeSourceKind }))}
                >
                  {Object.entries(SOURCE_KIND_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Moneda">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.currency}
                  onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value as IncomeCurrency }))}
                  data-testid="income-source-currency"
                >
                  <option value="ARS">Pesos argentinos</option>
                  <option value="USD">Dólares</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monto base">
                <Input
                  value={form.baseAmount}
                  onChange={(event) => setForm((current) => ({ ...current, baseAmount: event.target.value }))}
                  placeholder="1.000.000,00"
                  inputMode="decimal"
                  data-testid="income-source-amount"
                  required
                />
              </Field>
              <Field label="Comienza en">
                <Input
                  type="month"
                  value={form.startMonthKey}
                  onChange={(event) => setForm((current) => ({ ...current, startMonthKey: event.target.value }))}
                  data-testid="income-source-start-month"
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Día de cobro">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.paymentDay}
                  onChange={(event) => setForm((current) => ({ ...current, paymentDay: event.target.value }))}
                />
              </Field>
              <Field label="Aumenta cada">
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={form.increaseEveryMonths}
                  onChange={(event) => setForm((current) => ({ ...current, increaseEveryMonths: event.target.value }))}
                  data-testid="income-source-increase-frequency"
                />
              </Field>
              <Field label="Aumento %">
                <Input
                  value={form.increasePercent}
                  onChange={(event) => setForm((current) => ({ ...current, increasePercent: event.target.value }))}
                  inputMode="decimal"
                  data-testid="income-source-increase-percent"
                />
              </Field>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                className="mt-1 size-4 rounded border-muted-foreground/40"
              />
              <span>
                <span className="block text-sm font-medium">Fuente activa</span>
                <span className="block text-xs text-muted-foreground">
                  Al pausarla queda guardada, pero no participa de las proyecciones.
                </span>
              </span>
            </label>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting} data-testid="save-income-source">
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Guardar fuente
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function IncomeEventSheet({
  open,
  setOpen,
  form,
  setForm,
  submitting,
  errorMessage,
  onSubmit,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  form: EventFormState;
  setForm: Dispatch<SetStateAction<EventFormState>>;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const sourceBound = form.kind === "monthly_override" || form.kind === "permanent_adjustment";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex min-h-full flex-col">
          <SheetHeader>
            <SheetTitle>{EVENT_KIND_LABELS[form.kind]}</SheetTitle>
            <SheetDescription>
              {sourceBound
                ? `${form.sourceName}: el backend recalculará los meses afectados.`
                : "Registrá un ingreso extraordinario en ARS o USD sin crear recurrencia."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 py-6">
            {errorMessage ? <FormError message={errorMessage} /> : null}

            {!sourceBound ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo de ingreso">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={form.kind}
                    onChange={(event) => {
                      const kind = event.target.value as IncomeEventKind;
                      setForm((current) => ({ ...current, kind, label: EVENT_KIND_LABELS[kind] }));
                    }}
                  >
                    <option value="bonus">Bono</option>
                    <option value="aguinaldo">Aguinaldo</option>
                    <option value="extra">Ingreso extra</option>
                    <option value="other">Otro</option>
                  </select>
                </Field>
                <Field label="Moneda">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={form.currency}
                    onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value as IncomeCurrency }))}
                    data-testid="income-event-currency"
                  >
                    <option value="ARS">Pesos argentinos</option>
                    <option value="USD">Dólares</option>
                  </select>
                </Field>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/45 px-3 py-2 text-sm">
                Moneda de la fuente: <strong>{form.currency}</strong>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mes">
                <Input
                  type="month"
                  value={form.monthKey}
                  onChange={(event) => setForm((current) => ({ ...current, monthKey: event.target.value }))}
                  data-testid="income-event-month"
                  required
                />
              </Field>
              <Field label={`Monto (${form.currency})`}>
                <Input
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  inputMode="decimal"
                  placeholder={form.currency === "ARS" ? "500.000,00" : "500.00"}
                  data-testid="income-event-amount"
                  required
                />
              </Field>
            </div>

            <Field label="Descripción">
              <Input
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                data-testid="income-event-label"
                required
              />
            </Field>

            <Field label="Estado">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as IncomeEventStatus }))}
              >
                <option value="actual">Real / confirmado</option>
                <option value="projected">Estimado</option>
              </select>
            </Field>

            <Field label="Notas">
              <textarea
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Opcional"
              />
            </Field>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting} data-testid="save-income-event">
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Guardar y recalcular
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
      {message}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
