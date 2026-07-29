"use client";


import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  changeBudgetStatus,
  createBudget,
  deleteBudget,
  getBudgetOverview,
  listBudgets,
  updateBudget,
  type BudgetCurrency,
  type BudgetOverview,
  type BudgetOverviewCurrency,
  type BudgetPayload,
  type BudgetRecord,
  type BudgetStatus,
} from "@/lib/finance/budgets-api";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  listMovementCategories,
  type MovementCategory,
} from "@/lib/finance/movements-api";


type FormState = {
  categoryId: string;
  currency: BudgetCurrency;
  periodStart: string;
  periodEnd: string;
  limitAmount: string;
  rolloverEnabled: boolean;
  notes: string;
};


const currentMonth = () => new Date().toISOString().slice(0, 7);


const emptyForm = (): FormState => ({
  categoryId: "",
  currency: "ARS",
  periodStart: currentMonth(),
  periodEnd: currentMonth(),
  limitAmount: "",
  rolloverEnabled: false,
  notes: "",
});


const statusLabel: Record<BudgetStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  closed: "Cerrado",
};


function OverviewCurrencyCard({
  currency,
  summary,
}: {
  currency: BudgetCurrency;
  summary: BudgetOverviewCurrency;
}) {
  const progress = Math.min(
    100,
    Math.max(0, summary.usageBasisPoints / 100),
  );
  return (
    <Card data-testid={`budget-overview-${currency.toLowerCase()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{currency}</CardTitle>
          <Badge variant="secondary">
            {summary.budgetCount} presupuesto{summary.budgetCount === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Límite efectivo</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatFinancialAmount(summary.effectiveLimit, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gastado</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatFinancialAmount(summary.spent, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Disponible</p>
            <p className="mt-1 font-semibold tabular-nums text-emerald-700">
              {formatFinancialAmount(summary.available, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Excedido</p>
            <p className="mt-1 font-semibold tabular-nums text-rose-700">
              {formatFinancialAmount(summary.exceeded, currency)}
            </p>
          </div>
        </div>
        <Progress
          value={progress}
          aria-label={`Uso global ${currency}: ${summary.usagePercent}%`}
        />
        <p className="text-xs text-muted-foreground">
          {summary.usagePercent.replace(".", ",")}% utilizado
        </p>
      </CardContent>
    </Card>
  );
}


function BudgetOverviewPanel({
  overview,
  month,
}: {
  overview: BudgetOverview;
  month: string;
}) {
  return (
    <section className="space-y-3" data-testid="budget-overview">
      <div>
        <h3 className="font-semibold">Resumen agregado</h3>
        <p className="text-sm text-muted-foreground">
          Participan los presupuestos que se superponen con {month} y coinciden
          con el estado seleccionado. Incluye rollover y sólo egresos reales.
        </p>
      </div>
      {overview.participantCount === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay presupuestos aplicables al mes y estado seleccionados.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <OverviewCurrencyCard
              currency="ARS"
              summary={overview.currencies.ARS}
            />
            <OverviewCurrencyCard
              currency="USD"
              summary={overview.currencies.USD}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-2.5 py-1">
              {overview.participantCount} participantes
            </span>
            <span className="rounded-full border px-2.5 py-1">
              {overview.activeCount} activos
            </span>
            <span className="rounded-full border border-amber-200 px-2.5 py-1 text-amber-700">
              {overview.attentionCount} en atención
            </span>
            <span className="rounded-full border border-rose-200 px-2.5 py-1 text-rose-700">
              {overview.exceededCount} excedidos
            </span>
          </div>
        </>
      )}
    </section>
  );
}


export function PresupuestosSection() {
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [categories, setCategories] = useState<MovementCategory[]>([]);
  const [overview, setOverview] = useState<BudgetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<BudgetRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | BudgetStatus>("all");
  const [summaryMonth, setSummaryMonth] = useState(currentMonth());


  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overviewStatus = filter === "all" ? undefined : filter;
      const [budgetData, categoryData, overviewData] = await Promise.all([
        listBudgets(),
        listMovementCategories(false),
        getBudgetOverview({
          from: summaryMonth,
          to: summaryMonth,
          status: overviewStatus,
        }),
      ]);
      setBudgets(budgetData);
      setCategories(categoryData.filter((item) => item.active));
      setOverview(overviewData);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar los presupuestos.",
      );
    } finally {
      setLoading(false);
    }
  }, [filter, summaryMonth]);


  useEffect(() => {
    void refresh();
  }, [refresh]);


  const visible = useMemo(
    () => filter === "all"
      ? budgets
      : budgets.filter((item) => item.status === filter),
    [budgets, filter],
  );
  const alerts = useMemo(
    () => budgets.filter((item) => item.alert),
    [budgets],
  );


  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
    setMessage(null);
  }


  function openEdit(item: BudgetRecord) {
    setEditing(item);
    setForm({
      categoryId: item.category.id,
      currency: item.currency,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      limitAmount: item.limitAmount,
      rolloverEnabled: item.rolloverEnabled,
      notes: item.notes ?? "",
    });
    setFormOpen(true);
    setMessage(null);
  }


  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.categoryId || !form.limitAmount.trim()) {
      setMessage("Seleccioná categoría e ingresá un límite.");
      return;
    }
    setBusyId(editing?.id ?? "new");
    setMessage(null);
    const payload: BudgetPayload = {
      ...form,
      limitAmount: form.limitAmount.trim(),
      notes: form.notes.trim() || null,
    };
    try {
      if (editing) await updateBudget(editing.id, payload);
      else await createBudget(payload);
      await refresh();
      setFormOpen(false);
      setEditing(null);
      setMessage(editing ? "Presupuesto actualizado." : "Presupuesto creado.");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar el presupuesto.",
      );
    } finally {
      setBusyId(null);
    }
  }


  async function setStatus(item: BudgetRecord, status: BudgetStatus) {
    setBusyId(item.id);
    try {
      await changeBudgetStatus(item.id, status);
      await refresh();
      setMessage(
        `Presupuesto marcado como ${statusLabel[status].toLowerCase()}.`,
      );
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "No se pudo cambiar el estado.",
      );
    } finally {
      setBusyId(null);
    }
  }


  async function remove(item: BudgetRecord) {
    if (!window.confirm(`¿Eliminar el presupuesto de ${item.category.name}?`)) {
      return;
    }
    setBusyId(item.id);
    try {
      await deleteBudget(item.id);
      await refresh();
      setMessage("Presupuesto eliminado.");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "No se pudo eliminar el presupuesto.",
      );
    } finally {
      setBusyId(null);
    }
  }


  if (loading && budgets.length === 0 && !overview) {
    return (
      <div
        className="flex min-h-64 items-center justify-center"
        data-testid="budgets-section"
      >
        <Loader2 className="mr-2 size-5 animate-spin" />
        <span className="text-sm text-muted-foreground">
          Cargando presupuestos…
        </span>
      </div>
    );
  }


  return (
    <div className="space-y-4" data-testid="budgets-section">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Wallet className="size-5" />
            Presupuestos
          </h2>
          <p className="text-sm text-muted-foreground">
            Límites por categoría calculados contra egresos reales del ledger.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="new-budget">
          <Plus className="mr-2 size-4" />
          Nuevo presupuesto
        </Button>
      </div>


      <Alert>
        <CheckCircle2 className="size-4" />
        <AlertDescription>
          Las alertas son determinísticas: atención desde 80% y excedido desde
          100%. Pendientes y proyecciones no consumen presupuesto.
        </AlertDescription>
      </Alert>


      {alerts.map((item) => (
        <Alert
          key={item.id}
          variant={item.alert?.severity === "critical" ? "destructive" : "default"}
        >
          <AlertTriangle className="size-4" />
          <AlertDescription>
            {item.alert?.message} Gastado {item.currency} {item.spentAmount} de{" "}
            {item.effectiveLimit} ({item.usagePercent}%).
          </AlertDescription>
        </Alert>
      ))}


      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RotateCcw className="mr-1.5 size-4" />
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}


      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}


      {formOpen ? (
        <Card data-testid="budget-editor">
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? "Editar presupuesto" : "Nuevo presupuesto"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, categoryId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((item) => (
                      <SelectItem value={item.id} key={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      currency: value as BudgetCurrency,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-start">Desde</Label>
                <Input
                  id="budget-start"
                  type="month"
                  value={form.periodStart}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      periodStart: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-end">Hasta</Label>
                <Input
                  id="budget-end"
                  type="month"
                  value={form.periodEnd}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      periodEnd: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-limit">Límite</Label>
                <Input
                  id="budget-limit"
                  value={form.limitAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      limitAmount: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="flex items-center gap-2 pt-7">
                <Checkbox
                  id="budget-rollover"
                  checked={form.rolloverEnabled}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      rolloverEnabled: checked === true,
                    }))
                  }
                />
                <Label htmlFor="budget-rollover">
                  Arrastrar saldo positivo del período contiguo anterior
                </Label>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="budget-notes">Notas</Label>
                <Textarea
                  id="budget-notes"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  maxLength={1000}
                />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={Boolean(busyId)}>
                  {busyId ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {editing ? "Guardar cambios" : "Crear presupuesto"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormOpen(false);
                    setEditing(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}


      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="budget-summary-month">Mes resumido</Label>
          <Input
            id="budget-summary-month"
            data-testid="budget-summary-month"
            type="month"
            value={summaryMonth}
            onChange={(event) => setSummaryMonth(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select
            value={filter}
            onValueChange={(value) =>
              setFilter(value as "all" | BudgetStatus)
            }
          >
            <SelectTrigger data-testid="budget-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="paused">Pausados</SelectItem>
              <SelectItem value="closed">Cerrados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>


      {overview ? (
        <BudgetOverviewPanel overview={overview} month={summaryMonth} />
      ) : null}


      {visible.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {visible.map((item) => {
            const progress = Math.min(
              100,
              Math.max(0, item.usageBasisPoints / 100),
            );
            return (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {item.category.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {item.periodStart} a {item.periodEnd} · {item.currency}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.alert?.severity === "critical"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {statusLabel[item.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>
                      Gastado {item.currency} {item.spentAmount}
                    </span>
                    <span className="text-muted-foreground">
                      Límite efectivo {item.effectiveLimit}
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    aria-label={`Uso de ${item.category.name}: ${item.usagePercent}%`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.usagePercent}% usado</span>
                    <span>
                      Disponible {item.currency} {item.availableAmount}
                    </span>
                  </div>
                  {item.rolloverEnabled ? (
                    <p className="text-xs text-muted-foreground">
                      Rollover aplicado: {item.currency} {item.rolloverAmount}
                    </p>
                  ) : null}
                  {item.notes ? (
                    <p className="text-sm text-muted-foreground">
                      {item.notes}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {item.status !== "closed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(item)}
                      >
                        <Edit3 className="mr-1.5 size-4" />
                        Editar
                      </Button>
                    ) : null}
                    {item.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void setStatus(item, "paused")}
                      >
                        <PauseCircle className="mr-1.5 size-4" />
                        Pausar
                      </Button>
                    ) : null}
                    {item.status === "paused" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void setStatus(item, "active")}
                      >
                        <PlayCircle className="mr-1.5 size-4" />
                        Reanudar
                      </Button>
                    ) : null}
                    {item.status !== "closed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void setStatus(item, "closed")}
                      >
                        Cerrar
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => void remove(item)}
                    >
                      <Trash2 className="mr-1.5 size-4" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Wallet className="size-8 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">
                No hay presupuestos en este estado
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Creá un límite real para una categoría.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}