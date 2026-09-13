"use client";


import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import type {
  MovementCategory,
  MovementRecord,
} from "@/lib/finance/movements-api";
import { cn } from "@/lib/utils";


interface TransactionsListProps {
  movements: MovementRecord[];
  categories: MovementCategory[];
  onEdit: (movement: MovementRecord) => void;
  onDelete: (movement: MovementRecord) => void;
  onCategoryChange: (movement: MovementRecord, categoryId: string | null) => void;
  deletingId: string | null;
  assigningCategoryId: string | null;
}


function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}


function statusLabel(status: MovementRecord["status"]): string {
  if (status === "actual") return "Real";
  if (status === "pending") return "Pendiente";
  if (status === "projected") return "Proyectado";
  return "Anulado";
}


function CategorySelector({
  movement,
  categories,
  onCategoryChange,
  disabled,
}: {
  movement: MovementRecord;
  categories: MovementCategory[];
  onCategoryChange: (movement: MovementRecord, categoryId: string | null) => void;
  disabled: boolean;
}) {
  if (!movement.categoryEditable) {
    return <span className="text-muted-foreground">{movement.category.name}</span>;
  }


  const selectedCategoryValue =
    movement.category.name === "Sin clasificar"
      ? "none"
      : movement.category.id ?? "none";


  return (
    <div className="flex items-center gap-2">
      {disabled && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      <Select
        value={selectedCategoryValue}
        onValueChange={(value) => onCategoryChange(movement, value === "none" ? null : value)}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-8 min-w-40 text-xs"
          aria-label={`Categoría de ${movement.description}`}
          data-testid={`movement-category-select-${movement.sourceId}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sin clasificar</SelectItem>
          {categories
            .filter((category) => category.active && category.name !== "Sin clasificar")
            .map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}


export function TransactionsList({
  movements,
  categories,
  onEdit,
  onDelete,
  onCategoryChange,
  deletingId,
  assigningCategoryId,
}: TransactionsListProps) {
  if (movements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
        No hay movimientos para los filtros seleccionados.
      </div>
    );
  }


  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Descripción</th>
              <th className="px-4 py-2.5 font-medium">Categoría</th>
              <th className="px-4 py-2.5 font-medium">Origen</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 text-right font-medium">Monto</th>
              <th className="w-24 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr
                key={movement.id}
                className="border-b last:border-0 hover:bg-muted/30"
                data-testid={`movement-row-${movement.sourceId}`}
              >
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDate(movement.occurredOn)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg",
                        movement.type === "income"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-rose-50 text-rose-600",
                      )}
                    >
                      {movement.type === "income" ? (
                        <ArrowDownLeft className="size-4" />
                      ) : (
                        <ArrowUpRight className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{movement.description}</p>
                      {movement.notes && (
                        <p className="max-w-[320px] truncate text-xs text-muted-foreground">
                          {movement.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CategorySelector
                    movement={movement}
                    categories={categories}
                    onCategoryChange={onCategoryChange}
                    disabled={assigningCategoryId === movement.sourceId}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <p>{movement.trace.sourceLabel}</p>
                  <p className="text-[11px]">{movement.sourceType.replaceAll("_", " ")}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      movement.status === "actual"
                        ? "bg-emerald-50 text-emerald-700"
                        : movement.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700",
                    )}
                  >
                    {movement.status === "pending" && <Clock className="size-3" />}
                    {statusLabel(movement.status)}
                  </span>
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums",
                    movement.type === "income" ? "text-emerald-700" : "text-foreground",
                  )}
                >
                  {movement.type === "income" ? "+" : "−"}
                  {formatFinancialAmount(movement.amount, movement.currency)}
                </td>
                <td className="px-4 py-3">
                  {movement.editable && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onEdit(movement)}
                        aria-label={`Editar ${movement.description}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-rose-600"
                        disabled={deletingId === movement.sourceId}
                        onClick={() => onDelete(movement)}
                        aria-label={`Eliminar ${movement.description}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <ul className="divide-y sm:hidden">
        {movements.map((movement) => (
          <li
            key={movement.id}
            className="space-y-3 p-4"
            data-testid={`movement-card-${movement.sourceId}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  movement.type === "income"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600",
                )}
              >
                {movement.type === "income" ? (
                  <ArrowDownLeft className="size-4" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{movement.description}</p>
                <p className="text-xs text-muted-foreground">{formatDate(movement.occurredOn)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{movement.trace.sourceLabel}</p>
              </div>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  movement.type === "income" && "text-emerald-700",
                )}
              >
                {movement.type === "income" ? "+" : "−"}
                {formatFinancialAmount(movement.amount, movement.currency)}
              </span>
            </div>


            <CategorySelector
              movement={movement}
              categories={categories}
              onCategoryChange={onCategoryChange}
              disabled={assigningCategoryId === movement.sourceId}
            />


            {movement.editable && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(movement)}>
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600"
                  disabled={deletingId === movement.sourceId}
                  onClick={() => onDelete(movement)}
                >
                  Anular
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}