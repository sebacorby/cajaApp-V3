"use client";


import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, Loader2, Plus, RotateCcw, Target, Trash2 } from "lucide-react";
import { GoalsGrid } from "@/components/finance/goals/goals-grid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addGoalContribution,
  changeGoalStatus,
  createGoal,
  deleteGoal,
  deleteGoalContribution,
  getGoalsOverview,
  listGoals,
  updateGoal,
  type GoalCurrency,
  type GoalOverviewCurrency,
  type GoalPayload,
  type GoalRecord,
  type GoalsOverview,
  type GoalStatus,
} from "@/lib/finance/goals-api";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";


type EditorMode = "closed" | "create" | "edit" | "contribute";


type GoalForm = {
  name: string;
  targetAmount: string;
  currency: GoalCurrency;
  targetDate: string;
  notes: string;
};


type ContributionForm = {
  contributedOn: string;
  amount: string;
  notes: string;
  referenceType: string;
  referenceId: string;
  referenceLabel: string;
};


const emptyGoal: GoalForm = { name: "", targetAmount: "", currency: "ARS", targetDate: "", notes: "" };
const today = () => new Date().toISOString().slice(0, 10);
const emptyContribution = (): ContributionForm => ({ contributedOn: today(), amount: "", notes: "", referenceType: "", referenceId: "", referenceLabel: "" });


function statusLabel(status: GoalStatus) {
  return ({ active: "Activo", paused: "Pausado", completed: "Alcanzado", closed: "Cerrado" } as const)[status];
}


function formatTargetDate(value: string | null): string {
  if (!value) return "Sin fecha objetivo";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(date);
}


function GoalOverviewCurrencyCard({
  currency,
  summary,
}: {
  currency: GoalCurrency;
  summary: GoalOverviewCurrency;
}) {
  const progress = Math.min(
    100,
    Math.max(0, summary.progressBasisPoints / 100),
  );
  return (
    <Card data-testid={`goal-overview-${currency.toLowerCase()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{currency}</CardTitle>
          <Badge variant="secondary">
            {summary.goalCount} objetivo{summary.goalCount === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Meta total</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatFinancialAmount(summary.targetAmount, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Aportado</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatFinancialAmount(summary.contributedAmount, currency)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Restante</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatFinancialAmount(summary.remainingAmount, currency)}
            </p>
          </div>
        </div>
        <Progress
          value={progress}
          aria-label={`Progreso global ${currency}: ${summary.progressPercent}%`}
        />
        <p className="text-xs text-muted-foreground">
          {summary.progressPercent.replace(".", ",")}% de progreso global
        </p>
      </CardContent>
    </Card>
  );
}


function GoalsOverviewPanel({ overview }: { overview: GoalsOverview }) {
  return (
    <section className="space-y-3" data-testid="goals-overview">
      <div>
        <h3 className="font-semibold">Resumen agregado</h3>
        <p className="text-sm text-muted-foreground">
          Los totales corresponden al estado seleccionado. Los contadores de
          estado y la próxima fecha consideran todos los objetivos.
        </p>
      </div>
      {overview.participantCount === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay objetivos que participen del resumen actual.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <GoalOverviewCurrencyCard
            currency="ARS"
            summary={overview.currencies.ARS}
          />
          <GoalOverviewCurrencyCard
            currency="USD"
            summary={overview.currencies.USD}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border px-2.5 py-1">
          {overview.statusCounts.active} activos
        </span>
        <span className="rounded-full border px-2.5 py-1">
          {overview.statusCounts.paused} pausados
        </span>
        <span className="rounded-full border px-2.5 py-1">
          {overview.statusCounts.completed} alcanzados
        </span>
        <span className="rounded-full border px-2.5 py-1">
          {overview.statusCounts.closed} cerrados
        </span>
        <span className="rounded-full border px-2.5 py-1">
          Próxima fecha: {formatTargetDate(overview.nearestActiveTargetDate)}
        </span>
      </div>
    </section>
  );
}


export function ObjetivosSection() {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [overview, setOverview] = useState<GoalsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | GoalStatus>("all");
  const [mode, setMode] = useState<EditorMode>("closed");
  const [selected, setSelected] = useState<GoalRecord | null>(null);
  const [goalForm, setGoalForm] = useState<GoalForm>(emptyGoal);
  const [contributionForm, setContributionForm] = useState<ContributionForm>(emptyContribution());
  const [busyGoalId, setBusyGoalId] = useState<string | null>(null);


  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overviewStatus = filter === "all" ? undefined : filter;
      const [goalData, overviewData] = await Promise.all([
        listGoals(),
        getGoalsOverview({ status: overviewStatus }),
      ]);
      setGoals(goalData);
      setOverview(overviewData);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar los objetivos.",
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);


  useEffect(() => { void refresh(); }, [refresh]);


  const visibleGoals = useMemo(
    () => filter === "all"
      ? goals
      : goals.filter((goal) => goal.status === filter),
    [filter, goals],
  );


  function openCreate() {
    setSelected(null); setGoalForm(emptyGoal); setMode("create"); setMessage(null);
  }
  function openEdit(goal: GoalRecord) {
    setSelected(goal);
    setGoalForm({ name: goal.name, targetAmount: goal.targetAmount, currency: goal.currency, targetDate: goal.targetDate ?? "", notes: goal.notes ?? "" });
    setMode("edit"); setMessage(null);
  }
  function openContribution(goal: GoalRecord) {
    setSelected(goal); setContributionForm(emptyContribution()); setMode("contribute"); setMessage(null);
  }
  function closeEditor() { setMode("closed"); setSelected(null); }


  async function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goalForm.name.trim() || !goalForm.targetAmount.trim()) { setMessage("Completá nombre e importe objetivo."); return; }
    setBusyGoalId(selected?.id ?? "new"); setMessage(null);
    const payload: GoalPayload = { name: goalForm.name.trim(), targetAmount: goalForm.targetAmount.trim(), currency: goalForm.currency, targetDate: goalForm.targetDate || null, notes: goalForm.notes.trim() || null };
    try {
      if (mode === "edit" && selected) await updateGoal(selected.id, payload); else await createGoal(payload);
      await refresh(); closeEditor(); setMessage(mode === "edit" ? "Objetivo actualizado." : "Objetivo creado.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo guardar el objetivo."); }
    finally { setBusyGoalId(null); }
  }


  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !contributionForm.amount.trim()) return;
    if (Boolean(contributionForm.referenceType.trim()) !== Boolean(contributionForm.referenceId.trim())) { setMessage("El tipo y el identificador de referencia deben completarse juntos."); return; }
    setBusyGoalId(selected.id); setMessage(null);
    try {
      await addGoalContribution(selected.id, {
        contributedOn: contributionForm.contributedOn,
        amount: contributionForm.amount.trim(),
        notes: contributionForm.notes.trim() || null,
        referenceType: contributionForm.referenceType.trim() || null,
        referenceId: contributionForm.referenceId.trim() || null,
        referenceLabel: contributionForm.referenceLabel.trim() || null,
      });
      await refresh(); closeEditor(); setMessage("Aporte registrado. No se modificó el saldo general ni se reservó dinero automáticamente.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo registrar el aporte."); }
    finally { setBusyGoalId(null); }
  }


  async function updateStatus(goal: GoalRecord, status: GoalStatus) {
    setBusyGoalId(goal.id); setMessage(null);
    try { await changeGoalStatus(goal.id, status); await refresh(); setMessage(`Objetivo marcado como ${statusLabel(status).toLowerCase()}.`); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo cambiar el estado."); }
    finally { setBusyGoalId(null); }
  }


  async function removeGoal(goal: GoalRecord) {
    if (!window.confirm(`¿Eliminar el objetivo “${goal.name}” y su historial?`)) return;
    setBusyGoalId(goal.id); setMessage(null);
    try { await deleteGoal(goal.id); await refresh(); if (selected?.id === goal.id) closeEditor(); setMessage("Objetivo eliminado."); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo eliminar el objetivo."); }
    finally { setBusyGoalId(null); }
  }


  async function removeContribution(goal: GoalRecord, contributionId: string) {
    if (!window.confirm("¿Eliminar este aporte del historial?")) return;
    setBusyGoalId(goal.id); setMessage(null);
    try {
      const updated = await deleteGoalContribution(goal.id, contributionId);
      await refresh(); setSelected(updated); setMessage("Aporte eliminado y progreso recalculado.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo eliminar el aporte."); }
    finally { setBusyGoalId(null); }
  }


  if (loading && goals.length === 0 && !overview) return <div className="flex min-h-64 items-center justify-center" data-testid="goals-section"><Loader2 className="mr-2 size-5 animate-spin" /><span className="text-sm text-muted-foreground">Cargando objetivos…</span></div>;


  return (
    <div className="space-y-4" data-testid="goals-section">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h2 className="flex items-center gap-2 text-xl font-semibold"><Target className="size-5" />Objetivos</h2><p className="text-sm text-muted-foreground">Metas y aportes manuales separados del saldo disponible.</p></div>
        <Button onClick={openCreate} data-testid="new-goal"><Plus className="mr-2 size-4" />Nuevo objetivo</Button>
      </div>


      <div className="flex items-center gap-2">
        <Label htmlFor="goals-filter" className="text-sm">Estado</Label>
        <Select
          value={filter}
          onValueChange={(value) => setFilter(value as "all" | GoalStatus)}
        >
          <SelectTrigger
            id="goals-filter"
            className="w-44"
            data-testid="goals-status-filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
            <SelectItem value="completed">Alcanzados</SelectItem>
            <SelectItem value="closed">Cerrados</SelectItem>
          </SelectContent>
        </Select>
      </div>


      {overview ? <GoalsOverviewPanel overview={overview} /> : null}


      <Alert><AlertCircle className="size-4" /><AlertDescription>Los aportes son registros de planificación. No descuentan dinero del ledger ni convierten el saldo general en fondos reservados.</AlertDescription></Alert>
      {error ? <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription className="flex flex-wrap items-center justify-between gap-2"><span>{error}</span><Button type="button" size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}><RotateCcw className="mr-1.5 size-4" />Reintentar</Button></AlertDescription></Alert> : null}
      {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}


      {mode !== "closed" ? (
        <Card data-testid="goal-editor">
          <CardHeader><CardTitle className="flex items-center justify-between text-base"><span>{mode === "contribute" ? `Aporte a ${selected?.name}` : mode === "edit" ? "Editar objetivo" : "Nuevo objetivo"}</span><Button variant="ghost" size="sm" onClick={closeEditor}><ArrowLeft className="mr-1.5 size-4" />Volver</Button></CardTitle></CardHeader>
          <CardContent>
            {mode === "contribute" ? (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={submitContribution}>
                <div className="space-y-2"><Label htmlFor="goal-contribution-date">Fecha</Label><Input id="goal-contribution-date" type="date" value={contributionForm.contributedOn} onChange={(event) => setContributionForm((current) => ({ ...current, contributedOn: event.target.value }))} required /></div>
                <div className="space-y-2"><Label htmlFor="goal-contribution-amount">Importe ({selected?.currency})</Label><Input id="goal-contribution-amount" value={contributionForm.amount} onChange={(event) => setContributionForm((current) => ({ ...current, amount: event.target.value }))} placeholder={selected?.currency === "ARS" ? "100.000,00" : "1,000.00"} required /></div>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="goal-contribution-notes">Notas</Label><Textarea id="goal-contribution-notes" value={contributionForm.notes} onChange={(event) => setContributionForm((current) => ({ ...current, notes: event.target.value }))} maxLength={500} /></div>
                <div className="space-y-2"><Label htmlFor="goal-reference-type">Tipo de referencia opcional</Label><Input id="goal-reference-type" value={contributionForm.referenceType} onChange={(event) => setContributionForm((current) => ({ ...current, referenceType: event.target.value }))} placeholder="manual, debit_csv, card…" /></div>
                <div className="space-y-2"><Label htmlFor="goal-reference-id">ID de movimiento opcional</Label><Input id="goal-reference-id" value={contributionForm.referenceId} onChange={(event) => setContributionForm((current) => ({ ...current, referenceId: event.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="goal-reference-label">Descripción de referencia</Label><Input id="goal-reference-label" value={contributionForm.referenceLabel} onChange={(event) => setContributionForm((current) => ({ ...current, referenceLabel: event.target.value }))} maxLength={200} /></div>
                <div className="md:col-span-2"><Button type="submit" disabled={Boolean(busyGoalId)}>{busyGoalId ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}Registrar aporte</Button></div>
              </form>
            ) : (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={submitGoal}>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="goal-name">Nombre</Label><Input id="goal-name" value={goalForm.name} onChange={(event) => setGoalForm((current) => ({ ...current, name: event.target.value }))} maxLength={120} required /></div>
                <div className="space-y-2"><Label htmlFor="goal-target">Importe objetivo</Label><Input id="goal-target" value={goalForm.targetAmount} onChange={(event) => setGoalForm((current) => ({ ...current, targetAmount: event.target.value }))} required /></div>
                <div className="space-y-2"><Label>Moneda</Label><Select value={goalForm.currency} onValueChange={(value) => setGoalForm((current) => ({ ...current, currency: value as GoalCurrency }))} disabled={mode === "edit" && Boolean(selected?.contributions.length)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="goal-target-date">Fecha objetivo</Label><Input id="goal-target-date" type="date" value={goalForm.targetDate} onChange={(event) => setGoalForm((current) => ({ ...current, targetDate: event.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="goal-notes">Notas</Label><Textarea id="goal-notes" value={goalForm.notes} onChange={(event) => setGoalForm((current) => ({ ...current, notes: event.target.value }))} maxLength={1000} /></div>
                <div className="md:col-span-2"><Button type="submit" disabled={Boolean(busyGoalId)}>{busyGoalId ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{mode === "edit" ? "Guardar cambios" : "Crear objetivo"}</Button></div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : selected ? (
        <Card data-testid="goal-detail">
          <CardHeader><CardTitle className="flex items-center justify-between text-base"><span>{selected.name}</span><Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Cerrar detalle</Button></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2"><Badge>{statusLabel(selected.status)}</Badge><Badge variant="outline">{selected.currency} {selected.contributedAmount} / {selected.targetAmount}</Badge><Badge variant="outline">{selected.progressPercent}%</Badge></div>
            <div><h3 className="mb-2 text-sm font-semibold">Aportes</h3>{selected.contributions.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay aportes.</p> : <div className="space-y-2">{selected.contributions.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"><div><p className="font-medium">{selected.currency} {item.amount}</p><p className="text-xs text-muted-foreground">{item.contributedOn}{item.referenceLabel ? ` · ${item.referenceLabel}` : ""}</p>{item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}</div><Button variant="ghost" size="icon" aria-label="Eliminar aporte" onClick={() => void removeContribution(selected, item.id)}><Trash2 className="size-4 text-destructive" /></Button></div>)}</div>}</div>
            <div><h3 className="mb-2 text-sm font-semibold">Historial</h3><div className="space-y-1 text-xs text-muted-foreground">{selected.history.map((item) => <p key={item.id}>{new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt))} · {item.kind}</p>)}</div></div>
          </CardContent>
        </Card>
      ) : null}


      {visibleGoals.length ? <GoalsGrid goals={visibleGoals} busyGoalId={busyGoalId} onEdit={openEdit} onContribute={openContribution} onStatus={(goal, status) => void updateStatus(goal, status)} onDelete={(goal) => void removeGoal(goal)} onSelect={setSelected} /> : <Card className="border-dashed"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><Target className="size-8 text-muted-foreground" /><div><h3 className="font-semibold">No hay objetivos en este estado</h3><p className="mt-1 text-sm text-muted-foreground">Creá una meta o cambiá el filtro.</p></div></CardContent></Card>}
    </div>
  );
}