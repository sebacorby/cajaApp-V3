"use client";

import {
  Component,
  Suspense,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AsyncStateKind = "loading" | "empty" | "error" | "success";
export type StateSection =
  | "cierres"
  | "respaldo"
  | "importaciones"
  | "conciliacion"
  | "asesor";

export interface StateAction {
  label: string;
  onClick: () => void;
  testId?: string;
}

interface AsyncStatePanelProps {
  kind: AsyncStateKind;
  title: string;
  description?: string;
  action?: StateAction;
  compact?: boolean;
  className?: string;
  testId?: string;
}

const PANEL_TONES: Record<AsyncStateKind, string> = {
  loading: "border-border bg-muted/20 text-foreground",
  empty: "border-border bg-muted/10 text-foreground",
  error:
    "border-destructive/30 bg-destructive/5 text-destructive dark:bg-destructive/10",
  success:
    "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300",
};

function StateIcon({ kind }: { kind: AsyncStateKind }) {
  if (kind === "loading") {
    return (
      <Loader2
        className="size-5 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
    );
  }
  if (kind === "error") {
    return <AlertTriangle className="size-5" aria-hidden="true" />;
  }
  if (kind === "success") {
    return <CheckCircle2 className="size-5" aria-hidden="true" />;
  }
  return <Inbox className="size-5" aria-hidden="true" />;
}

export function AsyncStatePanel({
  kind,
  title,
  description,
  action,
  compact = false,
  className,
  testId,
}: AsyncStatePanelProps) {
  const isError = kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-busy={kind === "loading"}
      data-state-kind={kind}
      data-state-contract="real-v1"
      data-testid={testId}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border text-center",
        compact ? "min-h-24 gap-2 px-4 py-5" : "min-h-48 gap-3 px-6 py-10",
        PANEL_TONES[kind],
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-background/80">
        <StateIcon kind={kind} />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 gap-1.5"
          onClick={action.onClick}
          data-testid={action.testId}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

interface BoundaryState {
  error: Error | null;
  revision: number;
}

class RenderErrorBoundary extends Component<
  { children: ReactNode; section: StateSection },
  BoundaryState
> {
  state: BoundaryState = { error: null, revision: 0 };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The visible fallback is the authoritative client-side result.
  }

  private retry = () => {
    this.setState((current) => ({
      error: null,
      revision: current.revision + 1,
    }));
  };

  render() {
    if (this.state.error) {
      return (
        <AsyncStatePanel
          kind="error"
          title="No se pudo mostrar esta sección"
          description="El contenido falló antes de completar su renderizado. Reintentá sin perder los datos almacenados."
          action={{ label: "Reintentar", onClick: this.retry }}
          testId={`state-render-error-${this.props.section}`}
        />
      );
    }
    return <div key={this.state.revision}>{this.props.children}</div>;
  }
}

export function StateConsistencyBoundary({
  section,
  label,
  children,
}: {
  section: StateSection;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-label={`${label}: estados reales`}
      aria-live="polite"
      data-state-scope={section}
      data-state-contract="real-v1"
      data-testid={`state-scope-${section}`}
      className={cn(
        "[&_.animate-spin]:motion-reduce:animate-none",
        "[&_[role=alert]]:outline-none [&_[role=alert]]:focus-within:ring-2 [&_[role=alert]]:focus-within:ring-ring",
        "[&_[role=status]]:outline-none [&_[role=status]]:focus-within:ring-2 [&_[role=status]]:focus-within:ring-ring",
      )}
    >
      <RenderErrorBoundary section={section}>
        <Suspense
          fallback={
            <AsyncStatePanel
              kind="loading"
              title={`Cargando ${label.toLocaleLowerCase("es-AR")}`}
              description="Esperando una respuesta real del módulo."
              testId={`state-suspense-loading-${section}`}
            />
          }
        >
          {children}
        </Suspense>
      </RenderErrorBoundary>
    </div>
  );
}
