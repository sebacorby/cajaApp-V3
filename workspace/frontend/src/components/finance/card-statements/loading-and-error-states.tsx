"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Estado de arranque mientras se consultan resúmenes ya persistidos. */
export function PersistedDataLoadingState() {
  return (
    <div className="flex min-h-[520px] items-center justify-center">
      <Card className="w-full max-w-lg shadow-sm">
        <CardContent className="flex flex-col items-center px-8 py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
          <h2 className="mt-6 text-lg font-semibold">
            Cargando tus resúmenes
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Consultando datos, proyecciones y compras manuales guardadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface LoadingStateProps {
  message: string;
  elapsedSeconds: number;
  onCancel: () => void;
}

/** Estado de progreso durante la subida/procesamiento IA del PDF. */
export function LoadingState({ message, elapsedSeconds, onCancel }: LoadingStateProps) {
  return (
    <div className="flex min-h-[520px] items-center justify-center" data-testid="card-statement-import-state">
      <Card className="w-full max-w-xl shadow-sm">
        <CardContent className="flex flex-col items-center px-8 py-14 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-background bg-emerald-500" />
          </div>
          <h2 className="mt-7 text-xl font-semibold">Procesando el resumen</h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            {elapsedSeconds}s transcurridos
          </p>
          <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
          </div>
          <Button variant="ghost" className="mt-6" onClick={onCancel}>
            Cancelar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}

/** Estado de error tras un intento de importación fallido. */
export function ErrorState({ message, onRetry, onReset }: ErrorStateProps) {
  return (
    <div className="flex min-h-[520px] items-center justify-center">
      <Card className="w-full max-w-xl border-destructive/30 shadow-sm" data-testid="card-statement-error">
        <CardContent className="px-8 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">No pudimos completar la importación</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
          <div className="mt-7 flex justify-center gap-3">
            <Button data-testid="card-statement-retry" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
            <Button variant="outline" onClick={onReset}>
              Elegir otro PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
