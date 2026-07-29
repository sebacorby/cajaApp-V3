"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardPaymentsView } from "./CardPaymentsView";
import {
  createManualCardPurchase,
  deleteManualCardPurchase,
  fetchCardPayments,
  type CardPaymentCard,
  type CardPaymentMovement,
  type CardPaymentsResponse,
} from "@/lib/finance/card-payments-api";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FormState {
  cardId: string;
  purchaseDate: string;
  description: string;
  currency: "ARS" | "USD";
  amount: string;
  installments: string;
}

const EMPTY_FORM: FormState = {
  cardId: "",
  purchaseDate: "",
  description: "",
  currency: "ARS",
  amount: "",
  installments: "1",
};

function manualPurchaseId(movement: CardPaymentMovement): string | null {
  return movement.sourceType === "manual_purchase" && movement.id.startsWith("manual:")
    ? movement.id.slice("manual:".length)
    : null;
}

export function CardPaymentsWorkspace() {
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<CardPaymentsResponse | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, purchaseDate: todayIso() });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadToolbarData = useCallback(async () => {
    try {
      const response = await fetchCardPayments(6);
      setData(response);
      setForm((current) => ({
        ...current,
        cardId:
          current.cardId && response.cards.some((card) => card.cardId === current.cardId)
            ? current.cardId
            : response.cards[0]?.cardId ?? "",
      }));
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    void loadToolbarData();
  }, [loadToolbarData, reloadKey]);

  const selectedCard = useMemo<CardPaymentCard | null>(
    () => data?.cards.find((card) => card.cardId === form.cardId) ?? null,
    [data, form.cardId],
  );

  const manualMovements = useMemo(
    () =>
      data?.cards.flatMap((card) =>
        card.movements
          .filter((movement) => movement.sourceType === "manual_purchase")
          .map((movement) => ({ card, movement })),
      ) ?? [],
    [data],
  );

  const handleCreate = async () => {
    if (!data?.baseline || !selectedCard) return;
    const installments = Number.parseInt(form.installments, 10);

    if (!form.purchaseDate || !form.description.trim() || !form.amount.trim()) {
      setError("Completá fecha, descripción e importe.");
      return;
    }

    if (!Number.isInteger(installments) || installments < 1 || installments > 60) {
      setError("La cantidad de cuotas debe estar entre 1 y 60.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createManualCardPurchase({
        statementId: data.baseline.statementId,
        cardLast4: selectedCard.cardLast4 ?? "NONE",
        holderName: selectedCard.cardLast4
          ? selectedCard.holderName || selectedCard.cardLabel
          : selectedCard.cardLabel,
        purchaseDate: form.purchaseDate,
        description: form.description.trim(),
        currency: form.currency,
        amount: form.amount.trim(),
        installments,
      });

      setForm({
        ...EMPTY_FORM,
        cardId: selectedCard.cardId,
        purchaseDate: todayIso(),
      });
      setPanelOpen(false);
      setReloadKey((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo registrar la compra.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (movement: CardPaymentMovement) => {
    const purchaseId = manualPurchaseId(movement);
    if (!purchaseId) return;

    setDeletingId(purchaseId);
    setError(null);
    try {
      await deleteManualCardPurchase(purchaseId);
      setReloadKey((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar la compra.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {data?.baseline ? (
        <div className="flex justify-end">
          <Button
            variant={panelOpen ? "outline" : "default"}
            onClick={() => {
              setPanelOpen((value) => !value);
              setError(null);
            }}
          >
            {panelOpen ? <X className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
            {panelOpen ? "Cerrar" : "Registrar compra"}
          </Button>
        </div>
      ) : null}

      {panelOpen && data?.baseline ? (
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="space-y-1 xl:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Tarjeta</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.cardId}
                onChange={(event) => setForm((current) => ({ ...current, cardId: event.target.value }))}
              >
                {data.cards.map((card) => (
                  <option key={card.cardId} value={card.cardId}>
                    {card.cardLabel}{card.cardLast4 ? ` •••• ${card.cardLast4}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Fecha</span>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.purchaseDate}
                onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))}
              />
            </label>

            <label className="space-y-1 xl:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Descripción</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Ej. Supermercado"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Moneda</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.currency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currency: event.target.value as "ARS" | "USD",
                  }))
                }
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </label>

            <label className="space-y-1 xl:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Importe total</span>
              <input
                inputMode="decimal"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="0,00"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Cuotas</span>
              <input
                type="number"
                min={1}
                max={60}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.installments}
                onChange={(event) => setForm((current) => ({ ...current, installments: event.target.value }))}
              />
            </label>

            <div className="flex items-end xl:col-span-3">
              <Button className="w-full xl:w-auto" disabled={saving || !selectedCard} onClick={() => void handleCreate()}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                Agregar a pagos proyectados
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {manualMovements.length > 0 ? (
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Compras registradas desde el último resumen
              </p>
              <div className="space-y-2">
                {manualMovements.map(({ card, movement }) => {
                  const purchaseId = manualPurchaseId(movement);
                  return (
                    <div key={movement.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/10 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{movement.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {card.cardLabel} · {movement.dateIso ?? "sin fecha"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={!purchaseId || deletingId === purchaseId}
                        onClick={() => void handleDelete(movement)}
                      >
                        {deletingId === purchaseId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        <span className="sr-only">Eliminar compra manual</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <CardPaymentsView key={reloadKey} />
    </div>
  );
}
