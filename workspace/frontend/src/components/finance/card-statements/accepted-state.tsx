"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Check, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Amount } from "@/components/finance/shared/amount";
import type {
  AcceptResult,
  AcceptedCardStatement,
  CardExchangeRate,
  CardMoneyEquivalents,
  CardStatementListItem,
  CardStatementPreview,
  CardStatementTraceability,
  UpdatedValuesResponse,
} from "@/lib/finance/card-statements-api";
import type { ManualPurchaseForm } from "./types";
import { ExchangeRateCard } from "./exchange-rate-card";
import { formatDateLabel, formatSavedAt } from "./helpers";
import { ManualPurchaseSheet } from "./manual-purchase-sheet";
import { StatementDocument } from "./statement-document";
import { StatementHistoryPanel } from "./statement-history-panel";
import { StatementOverview } from "./statement-overview";

interface AcceptedStateProps {
  preview: CardStatementPreview;
  statement: AcceptedCardStatement | null;
  result: AcceptResult | null;
  updatedValues: UpdatedValuesResponse[];
  history: CardStatementListItem[];
  statementLoading: boolean;
  historyActionId: string | null;
  historyMessage: string | null;
  traceability: CardStatementTraceability | null;
  traceabilityLoadingId: string | null;
  onSelectStatement: (statementId: string) => void;
  onActivateStatement: (statementId: string) => void;
  onArchiveStatement: (statementId: string) => void;
  onOpenTraceability: (statementId: string) => void;
  onNewImport: () => void;
  onManualPurchase: () => void;
  manualPurchaseOpen: boolean;
  setManualPurchaseOpen: (open: boolean) => void;
  manualPurchase: ManualPurchaseForm;
  setManualPurchase: Dispatch<SetStateAction<ManualPurchaseForm>>;
  cardOptions: Array<{ cardLast4: string; holderName: string }>;
  onManualPurchaseSubmit: (event: FormEvent<HTMLFormElement>) => void;
  manualSubmitting: boolean;
  manualMessage: string | null;
  deletingPurchaseId: string | null;
  onDeleteManualPurchase: (purchaseId: string) => void;
  exchangeRate: CardExchangeRate | null;
  equivalents: CardMoneyEquivalents;
  rateSaving: boolean;
  rateMessage: string | null;
  onExchangeRateSave: (rate: string, effectiveDate: string) => Promise<void>;
}

/** Vista de consulta del resumen ya confirmado: overview, historial, cuotas futuras y compras manuales. */
export function AcceptedState({
  preview,
  statement,
  result,
  updatedValues,
  history,
  statementLoading,
  historyActionId,
  historyMessage,
  traceability,
  traceabilityLoadingId,
  onSelectStatement,
  onActivateStatement,
  onArchiveStatement,
  onOpenTraceability,
  onNewImport,
  onManualPurchase,
  manualPurchaseOpen,
  setManualPurchaseOpen,
  manualPurchase,
  setManualPurchase,
  cardOptions,
  onManualPurchaseSubmit,
  manualSubmitting,
  manualMessage,
  deletingPurchaseId,
  onDeleteManualPurchase,
  exchangeRate,
  equivalents,
  rateSaving,
  rateMessage,
  onExchangeRateSave,
}: AcceptedStateProps) {
  const statementIsActive = statement
    ? statement.status === "accepted" && statement.history.isActiveForPeriod
    : Boolean(result?.statementId);
  const activeStatementId = statementIsActive
    ? statement?.id ?? result?.statementId ?? ""
    : "";
  const manualPurchases = statement?.manualPurchases ?? [];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-emerald-200 bg-emerald-50/50 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/10">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Check className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">
                Resumen guardado
              </p>
              <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-300/80">
                La información proviene de la base real y sus cuotas ya impactan en las
                proyecciones mensuales.
              </p>
              {statement ? (
                <p className="mt-2 text-xs text-emerald-700/75 dark:text-emerald-400/75">
                  Guardado {formatSavedAt(statement.createdAt)} · {statement.document.fileName}
                </p>
              ) : result?.statementId ? (
                <p className="mt-2 font-mono text-xs text-emerald-700/75 dark:text-emerald-400/75">
                  ID {result.statementId}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onNewImport}>
              <Upload className="mr-2 h-4 w-4" />
              Importar nuevo
            </Button>
            <Button onClick={onManualPurchase} disabled={!activeStatementId}>
              <Plus className="mr-2 h-4 w-4" />
              Compra manual
            </Button>
          </div>
        </CardContent>
      </Card>

      {manualMessage ? (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{manualMessage}</span>
        </div>
      ) : null}

      <StatementHistoryPanel
        history={history}
        selectedStatementId={statement?.id ?? result?.statementId ?? null}
        activeStatementId={activeStatementId}
        loading={statementLoading}
        actionId={historyActionId}
        message={historyMessage}
        traceability={traceability}
        traceabilityLoadingId={traceabilityLoadingId}
        onSelect={onSelectStatement}
        onActivate={onActivateStatement}
        onArchive={onArchiveStatement}
        onTraceability={onOpenTraceability}
      />

      <StatementOverview
        preview={preview}
        fileName={statement?.document.fileName ?? "Resumen confirmado"}
        pendingEdits={0}
      />

      <ExchangeRateCard
        totalPesos={preview.summary.totalPesos}
        totalDollars={preview.summary.totalDollars}
        exchangeRate={exchangeRate}
        equivalents={equivalents}
        saving={rateSaving}
        message={rateMessage}
        onSave={onExchangeRateSave}
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            Proyección de cuotas y consumos futuros
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Totales calculados y persistidos por el backend, incluyendo compras manuales.
          </p>
        </CardHeader>
        <CardContent>
          {updatedValues.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {updatedValues.map((item) => (
                <div key={item.monthKey} className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-2 font-semibold tabular-nums">
                    <Amount value={item.totalPesos} currency="ARS" />
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                    <Amount value={item.totalDollars} currency="USD" />
                  </p>
                  <div className="mt-3 border-t pt-3">
                    <p className="text-[11px] text-muted-foreground">
                      USD convertidos a ARS
                    </p>
                    <p className="mt-1 text-sm font-medium tabular-nums">
                      <Amount value={item.usdEquivalentPesos} currency="ARS" />
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Total mensual estimado en pesos
                    </p>
                    <p className="mt-1 font-semibold tabular-nums text-primary">
                      <Amount value={item.combinedTotalPesos} currency="ARS" />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Este resumen no tiene cuotas futuras ni compras manuales proyectadas.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Compras manuales</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Consumos agregados fuera del PDF y vinculados al resumen seleccionado.
            </p>
          </div>
          <Button variant="outline" onClick={onManualPurchase} disabled={!activeStatementId}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar compra
          </Button>
        </CardHeader>
        <CardContent>
          {manualPurchases.length > 0 ? (
            <div className="divide-y rounded-xl border">
              {manualPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{purchase.description}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        •••• {purchase.cardLast4}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {purchase.installments} cuota{purchase.installments === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateLabel(purchase.purchaseDate)} · {purchase.holderName}
                      {purchase.notes ? ` · ${purchase.notes}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <p className="font-semibold tabular-nums">
                      <Amount
                        value={purchase.amount}
                        currency={purchase.currency === "USD" ? "USD" : "ARS"}
                      />
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar compra manual"
                      disabled={deletingPurchaseId === purchase.id}
                      onClick={() => onDeleteManualPurchase(purchase.id)}
                    >
                      {deletingPurchaseId === purchase.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Todavía no agregaste compras manuales para este resumen.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Detalle guardado</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vista de consulta de las filas persistidas en la base.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <StatementDocument preview={preview} onEdit={() => undefined} readOnly />
        </CardContent>
      </Card>

      <ManualPurchaseSheet
        open={manualPurchaseOpen}
        setOpen={setManualPurchaseOpen}
        form={manualPurchase}
        setForm={setManualPurchase}
        cardOptions={cardOptions}
        onSubmit={onManualPurchaseSubmit}
        submitting={manualSubmitting}
        message={manualPurchaseOpen ? manualMessage : null}
      />
    </div>
  );
}
