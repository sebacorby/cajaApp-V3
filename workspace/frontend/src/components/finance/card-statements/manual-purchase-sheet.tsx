"use client";

import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { ManualPurchaseForm } from "./types";

interface ManualPurchaseSheetProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  form: ManualPurchaseForm;
  setForm: Dispatch<SetStateAction<ManualPurchaseForm>>;
  cardOptions: Array<{ cardLast4: string; holderName: string }>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  message: string | null;
}

/** Formulario para registrar una compra manual fuera del PDF del banco. */
export function ManualPurchaseSheet({
  open,
  setOpen,
  form,
  setForm,
  cardOptions,
  onSubmit,
  submitting,
  message,
}: ManualPurchaseSheetProps) {
  const update = (field: keyof ManualPurchaseForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Agregar compra manual</SheetTitle>
          <SheetDescription>
            Registrá una compra que todavía no aparece en el resumen bancario.
          </SheetDescription>
        </SheetHeader>

        <form className="mt-7 space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="manual-card">Tarjeta</Label>
            <select
              id="manual-card"
              value={form.cardLast4}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const selected = cardOptions.find((option) => option.cardLast4 === event.target.value);
                update("cardLast4", event.target.value);
                if (selected) update("holderName", selected.holderName);
              }}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              required
            >
              <option value="" disabled>Seleccionar tarjeta</option>
              {cardOptions.map((option) => (
                <option key={option.cardLast4} value={option.cardLast4}>
                  •••• {option.cardLast4}{option.holderName ? ` · ${option.holderName}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="manual-date">Fecha</Label>
            <Input id="manual-date" type="date" value={form.purchaseDate} onChange={(event: ChangeEvent<HTMLInputElement>) => update("purchaseDate", event.target.value)} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="manual-description">Descripción</Label>
            <Input id="manual-description" value={form.description} onChange={(event: ChangeEvent<HTMLInputElement>) => update("description", event.target.value)} placeholder="Ej. Compra supermercado" required />
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="manual-currency">Moneda</Label>
              <select id="manual-currency" value={form.currency} onChange={(event: ChangeEvent<HTMLSelectElement>) => update("currency", event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="manual-amount">Importe</Label>
              <Input id="manual-amount" inputMode="decimal" value={form.amount} onChange={(event: ChangeEvent<HTMLInputElement>) => update("amount", event.target.value)} placeholder="0,00" required />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="manual-installments">Cantidad de cuotas</Label>
            <Input id="manual-installments" type="number" min="1" value={form.installments} onChange={(event: ChangeEvent<HTMLInputElement>) => update("installments", event.target.value)} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="manual-holder">Titular</Label>
            <Input id="manual-holder" value={form.holderName} onChange={(event: ChangeEvent<HTMLInputElement>) => update("holderName", event.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="manual-notes">Observación</Label>
            <Input id="manual-notes" value={form.notes} onChange={(event: ChangeEvent<HTMLInputElement>) => update("notes", event.target.value)} placeholder="Opcional" />
          </div>

          {message ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">{message}</div>
          ) : null}

          <SheetFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Agregar compra
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
