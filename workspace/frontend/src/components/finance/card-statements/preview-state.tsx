"use client";

import { AlertCircle, Check, FileCheck2, PencilLine, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  CardExchangeRate,
  CardMoneyEquivalents,
  CardStatementPreview,
} from "@/lib/finance/card-statements-api";
import type { EditableRowField } from "./types";
import { ExchangeRateCard } from "./exchange-rate-card";
import { StatementDocument } from "./statement-document";
import { StatementOverview } from "./statement-overview";

interface PreviewStateProps {
  preview: CardStatementPreview;
  fileName: string;
  pendingEdits: number;
  errorMessage: string | null;
  onEdit: (rowId: string, field: EditableRowField, value: string) => void;
  onRestore: () => void;
  onAccept: () => void;
  onNewImport: () => void;
  exchangeRate: CardExchangeRate | null;
  equivalents: CardMoneyEquivalents;
  rateSaving: boolean;
  rateMessage: string | null;
  onExchangeRateSave: (rate: string, effectiveDate: string) => Promise<void>;
}

/** Vista de revisión de un borrador recién importado, antes de confirmarlo. */
export function PreviewState({
  preview,
  fileName,
  pendingEdits,
  errorMessage,
  onEdit,
  onRestore,
  onAccept,
  onNewImport,
  exchangeRate,
  equivalents,
  rateSaving,
  rateMessage,
  onExchangeRateSave,
}: PreviewStateProps) {
  return (
    <div className="space-y-6" data-testid="card-statement-preview">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <FileCheck2 className="h-4 w-4" />
            Resumen interpretado
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Revisión del resumen</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Los bloques y las filas respetan el orden recibido desde el backend. Sólo las
            celdas habilitadas pueden modificarse.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onNewImport}>
            <Upload className="mr-2 h-4 w-4" />
            Otro PDF
          </Button>
          <Button variant="outline" disabled={pendingEdits === 0} onClick={onRestore}>
            <X className="mr-2 h-4 w-4" />
            Restablecer
          </Button>
          <Button onClick={onAccept}>
            <Check className="mr-2 h-4 w-4" />
            Confirmar resumen
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      ) : null}

      <StatementOverview preview={preview} fileName={fileName} pendingEdits={pendingEdits} />

      <ExchangeRateCard
        totalPesos={preview.summary.totalPesos}
        totalDollars={preview.summary.totalDollars}
        exchangeRate={exchangeRate}
        equivalents={equivalents}
        saving={rateSaving}
        message={rateMessage}
        onSave={onExchangeRateSave}
      />

      <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <PencilLine className="h-3.5 w-3.5" />
          Las celdas con borde visible son editables.
        </span>
        <span>{pendingEdits > 0 ? `${pendingEdits} fila(s) modificada(s)` : "Sin cambios manuales"}</span>
      </div>

      <StatementDocument preview={preview} onEdit={onEdit} />
    </div>
  );
}
