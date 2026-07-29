"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deletePendingSalaryReceiptDraft,
  listPendingSalaryReceiptDrafts,
  type PendingSalaryReceiptDraft,
} from "@/lib/finance/salary-receipt-delete-api";

type PendingSalaryReceiptDraftsCleanupPanelProps = {
  onDeleted?: () => void;
};

export function PendingSalaryReceiptDraftsCleanupPanel({
  onDeleted,
}: PendingSalaryReceiptDraftsCleanupPanelProps) {
  const [drafts, setDrafts] = useState<PendingSalaryReceiptDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDrafts(await listPendingSalaryReceiptDrafts());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los borradores pendientes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (draft: PendingSalaryReceiptDraft) => {
    setDeletingId(draft.id);
    setError(null);
    try {
      await deletePendingSalaryReceiptDraft(draft.id);
      setDrafts((current) => current.filter((entry) => entry.id !== draft.id));
      onDeleted?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el borrador.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!loading && drafts.length === 0 && !error) return null;

  return (
    <Card className="shadow-sm" data-testid="pending-salary-receipts-cleanup">
      <CardHeader>
        <CardTitle className="text-base">Recibos pendientes de validar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Podés descartar un recibo que todavía no aceptaste ni rechazaste. El PDF
          quedará disponible para volver a importarlo.
        </p>
        {error ? (
          <div
            className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        {loading ? (
          <div className="flex items-center py-4 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Cargando borradores…
          </div>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{draft.document.fileName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pendiente de validar
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === draft.id}
                  >
                    {deletingId === draft.id ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 size-4" />
                    )}
                    Eliminar importación
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ¿Descartar este recibo pendiente?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán el borrador, la extracción y el documento
                      original. Después podrás importar nuevamente el mismo PDF.
                      Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        variant="destructive"
                        onClick={() => void remove(draft)}
                        disabled={deletingId === draft.id}
                      >
                        Eliminar definitivamente
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
