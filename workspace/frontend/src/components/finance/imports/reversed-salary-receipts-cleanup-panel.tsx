"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteReversedSalaryReceipt,
  listReversedSalaryReceipts,
  type ReversedSalaryReceipt,
} from "@/lib/finance/salary-receipt-delete-api";

export function ReversedSalaryReceiptsCleanupPanel() {
  const [receipts, setReceipts] = useState<ReversedSalaryReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReceipts(await listReversedSalaryReceipts());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los recibos anulados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (receipt: ReversedSalaryReceipt) => {
    setDeletingId(receipt.id);
    setError(null);
    try {
      await deleteReversedSalaryReceipt(receipt.id);
      setReceipts((current) => current.filter((entry) => entry.id !== receipt.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el recibo anulado.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!loading && receipts.length === 0 && !error) return null;

  return (
    <Card className="shadow-sm" data-testid="reversed-salary-receipts-cleanup">
      <CardHeader>
        <CardTitle className="text-base">Recibos anulados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Eliminá definitivamente los recibos anulados para liberar el PDF y poder importarlo nuevamente.
        </p>
        {error ? (
          <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        {loading ? (
          <div className="flex items-center py-4 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Cargando recibos anulados…
          </div>
        ) : (
          receipts.map((receipt) => (
            <div key={receipt.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{receipt.document.fileName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {receipt.employerName} · {receipt.employeeName} · Período {receipt.periodMonthKey}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deletingId === receipt.id}>
                    {deletingId === receipt.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                    Eliminar importación
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar este recibo anulado?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán el recibo, su borrador, la extracción y el documento original. Después podrás importar nuevamente el mismo PDF. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button variant="destructive" onClick={() => void remove(receipt)} disabled={deletingId === receipt.id}>
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
