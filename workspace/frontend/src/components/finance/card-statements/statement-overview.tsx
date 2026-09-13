"use client";

import {
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  FileText,
  Landmark,
  PencilLine,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Amount } from "@/components/finance/shared/amount";
import type { CardStatementPreview } from "@/lib/finance/card-statements-api";
import { cleanText, formatDateLabel } from "./helpers";

interface StatementOverviewProps {
  preview: CardStatementPreview;
  fileName: string;
  pendingEdits: number;
}

/** Datos principales del resumen (totales, banco, marca) y estructura detectada. */
export function StatementOverview({ preview, fileName, pendingEdits }: StatementOverviewProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                General
              </p>
              <CardTitle className="mt-2 text-xl">Datos principales</CardTitle>
            </div>
            <span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              {cleanText(fileName)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricBox
              icon={CircleDollarSign}
              label="Total en pesos"
              value={<Amount value={preview.summary.totalPesos} currency="ARS" />}
              testId="card-statement-total-pesos"
            />
            <MetricBox
              icon={CreditCard}
              label="Total en dólares"
              value={<Amount value={preview.summary.totalDollars} currency="USD" />}
              testId="card-statement-total-dollars"
            />
            <MetricBox
              icon={ShieldCheck}
              label="Pago mínimo"
              value={<Amount value={preview.summary.minimumPaymentPesos} currency="ARS" />}
            />
            <MetricBox
              icon={CalendarDays}
              label="Vencimiento"
              value={formatDateLabel(preview.summary.currentDueDate)}
            />
          </div>

          <div className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <InfoLine icon={Landmark} label="Banco" value={preview.source.bankName} testId="card-statement-bank-name" />
            <InfoLine icon={CreditCard} label="Marca" value={preview.source.brand} testId="card-statement-brand" />
            <InfoLine icon={FileText} label="N.º de resumen" value={preview.source.statementNumber} />
            <InfoLine icon={CalendarDays} label="Próximo cierre" value={formatDateLabel(preview.summary.nextClosingDate)} />
            <InfoLine icon={CalendarDays} label="Próximo vencimiento" value={formatDateLabel(preview.summary.nextDueDate)} />
            <InfoLine icon={PencilLine} label="Cambios manuales" value={pendingEdits === 0 ? "Ninguno" : String(pendingEdits)} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estructura detectada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StructureItem label="Páginas" value={preview.source.pageCount} />
          <StructureItem label="Secciones" value={preview.sections.length} />
          <StructureItem label="Tarjetas / personas" value={preview.groups.length} />
          <StructureItem label="Filas" value={preview.rows.length} />
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-200">
            <p className="font-medium">Orden preservado</p>
            <p className="mt-1 text-xs leading-5 opacity-80">
              La pantalla no reordena ni recalcula los importes del documento.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: ReactNode;
  testId?: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: typeof Landmark;
  label: string;
  value: string | null;
  testId?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium" data-testid={testId}>{cleanText(value)}</p>
      </div>
    </div>
  );
}

function StructureItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  );
}
