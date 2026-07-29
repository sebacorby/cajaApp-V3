"use client";

import { CalendarDays, Check, CirclePause, CirclePlay, Edit3, Flag, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GoalRecord, GoalStatus } from "@/lib/finance/goals-api";

interface GoalsGridProps {
  goals: GoalRecord[];
  busyGoalId: string | null;
  onEdit: (goal: GoalRecord) => void;
  onContribute: (goal: GoalRecord) => void;
  onStatus: (goal: GoalRecord, status: GoalStatus) => void;
  onDelete: (goal: GoalRecord) => void;
  onSelect: (goal: GoalRecord) => void;
}

const statusLabels: Record<GoalStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  completed: "Alcanzado",
  closed: "Cerrado",
};

function deadlineLabel(value: string | null) {
  if (!value) return "Sin fecha objetivo";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

export function GoalsGrid({ goals, busyGoalId, onEdit, onContribute, onStatus, onDelete, onSelect }: GoalsGridProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2" data-testid="goals-grid">
      {goals.map((goal) => {
        const busy = busyGoalId === goal.id;
        const mutable = goal.status === "active" || goal.status === "paused";
        const progress = Math.min(100, Math.max(0, goal.progressBasisPoints / 100));
        return (
          <Card key={goal.id} className="overflow-hidden" data-goal-name={goal.name}>
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{goal.name}</CardTitle>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{deadlineLabel(goal.targetDate)}</p>
                </div>
                <Badge variant={goal.status === "completed" ? "default" : "secondary"}>{statusLabels[goal.status]}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="font-medium">{goal.currency} {goal.contributedAmount}</span><span className="text-muted-foreground">de {goal.currency} {goal.targetAmount}</span></div>
                <Progress value={progress} aria-label={`Progreso de ${goal.name}: ${goal.progressPercent}%`} />
                <div className="flex justify-between text-xs text-muted-foreground"><span>{goal.progressPercent}%</span><span>Restan {goal.currency} {goal.remainingAmount}</span></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {goal.notes ? <p className="text-sm text-muted-foreground">{goal.notes}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onSelect(goal)}><Flag className="mr-1.5 size-4" />Detalle</Button>
                {mutable ? <Button size="sm" onClick={() => onContribute(goal)} disabled={busy}><Plus className="mr-1.5 size-4" />Aporte</Button> : null}
                {mutable ? <Button size="sm" variant="outline" onClick={() => onEdit(goal)} disabled={busy}><Edit3 className="mr-1.5 size-4" />Editar</Button> : null}
                {goal.status === "active" ? <Button size="sm" variant="outline" onClick={() => onStatus(goal, "paused")} disabled={busy}><CirclePause className="mr-1.5 size-4" />Pausar</Button> : null}
                {goal.status === "paused" ? <Button size="sm" variant="outline" onClick={() => onStatus(goal, "active")} disabled={busy}><CirclePlay className="mr-1.5 size-4" />Reanudar</Button> : null}
                {goal.status === "completed" ? <Button size="sm" variant="outline" onClick={() => onStatus(goal, "closed")} disabled={busy}><Check className="mr-1.5 size-4" />Cerrar</Button> : null}
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(goal)} disabled={busy}><Trash2 className="mr-1.5 size-4" />Eliminar</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
