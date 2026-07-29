"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteFutureDebtRow,
  FutureDebtApiError,
} from "@/lib/finance/future-debt-api";

const DELETE_CONCURRENCY = 4;

interface DeleteRowsButtonProps {
  selectedIds: Set<string>;
  onDeleted: () => void;
  onError?: (message: string) => void;
}

type DeleteFailure = {
  id: string;
  message: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error al eliminar";
}

export function DeleteRowsButton({
  selectedIds,
  onDeleted,
  onError,
}: DeleteRowsButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [completed, setCompleted] = useState(0);

  if (selectedIds.size === 0) return null;

  const count = selectedIds.size;
  const label = `Eliminar ${count} ${count === 1 ? "fila" : "filas"}`;

  const handleDelete = async () => {
    if (isDeleting) return;

    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const confirmed = window.confirm(
      `¿Eliminar ${ids.length} ${ids.length === 1 ? "fila" : "filas"} de Deuda futura? Esta acción elimina las proyecciones seleccionadas.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setCompleted(0);

    const failures: DeleteFailure[] = [];
    let processed = 0;

    try {
      for (let offset = 0; offset < ids.length; offset += DELETE_CONCURRENCY) {
        const batch = ids.slice(offset, offset + DELETE_CONCURRENCY);
        const results = await Promise.all(
          batch.map(async (id): Promise<DeleteFailure | null> => {
            try {
              await deleteFutureDebtRow(id);
              return null;
            } catch (error) {
              // Idempotent delete: a projection that is already gone is success.
              if (error instanceof FutureDebtApiError && error.status === 404) {
                return null;
              }
              return { id, message: errorMessage(error) };
            }
          }),
        );

        failures.push(
          ...results.filter((result): result is DeleteFailure => result !== null),
        );
        processed += batch.length;
        setCompleted(processed);
      }

      const succeeded = ids.length - failures.length;

      // Only report a successful deletion cycle when at least one row was really removed.
      // This prevents the UI from clearing the selection when every DELETE failed.
      if (succeeded > 0) {
        onDeleted();
      }

      if (failures.length > 0) {
        const firstFailure = failures[0]?.message ?? "Error al eliminar";
        onError?.(
          `Se eliminaron ${succeeded} de ${ids.length} filas. Fallaron ${failures.length}. ${firstFailure}`,
        );
      }
    } finally {
      setIsDeleting(false);
      setCompleted(0);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => void handleDelete()}
      disabled={isDeleting}
      aria-busy={isDeleting}
      data-testid="future-debt-delete-selected"
    >
      <Trash2 className="size-4" />
      {isDeleting ? `Eliminando ${completed}/${count}…` : label}
    </Button>
  );
}
