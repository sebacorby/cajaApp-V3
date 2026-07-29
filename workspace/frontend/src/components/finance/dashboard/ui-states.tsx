"use client";

import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Estado de carga con skeleton. */
export function LoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border bg-muted/40"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl border bg-muted/40 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl border bg-muted/40" />
      </div>
      <div className="h-96 animate-pulse rounded-2xl border bg-muted/40" />
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
}

/** Estado sin datos. */
export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-14 text-center",
        className
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Inbox className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/** Estado de error simulado. */
export function ErrorState({
  title = "No pudimos cargar la información",
  description = "Ocurrió un error al obtener tus datos financieros. Reintentá en unos segundos.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
        <AlertTriangle className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-rose-900">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-rose-700/80">
          {description}
        </p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-1 gap-1.5"
        >
          <RefreshCw className="size-3.5" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
