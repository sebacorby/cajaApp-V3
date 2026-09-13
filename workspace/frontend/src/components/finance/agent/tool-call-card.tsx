import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import type { AgentToolCallView } from "@/lib/finance/agent-api";

function statusLabel(status: string): string {
  if (status === "succeeded") return "Completada";
  if (status === "failed") return "Falló";
  if (status === "running") return "Ejecutando";
  if (status === "rejected") return "Rechazada";
  if (status === "cancelled") return "Cancelada";
  return "Propuesta";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "succeeded") return <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />;
  if (["failed", "rejected", "cancelled"].includes(status)) return <XCircle className="size-4 text-destructive" aria-hidden="true" />;
  return <CircleDashed className="size-4 animate-pulse text-muted-foreground" aria-hidden="true" />;
}

function details(call: AgentToolCallView): string {
  if (call.status === "failed") return call.errorMessage || call.errorCode || "La operación no pudo completarse.";
  if (call.result === undefined) return "CajaApp está procesando esta consulta.";
  const serialized = JSON.stringify(call.result, null, 2);
  return serialized.length > 1_800 ? `${serialized.slice(0, 1_800)}\n…` : serialized;
}

export function ToolCallCard({ call }: { call: AgentToolCallView }) {
  return (
    <article
      data-testid="agent-tool-card"
      data-tool-name={call.name}
      data-status={call.status}
      className="w-full rounded-xl border bg-background/80 p-3 text-xs shadow-xs"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{call.name}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{call.riskClass}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
          <StatusIcon status={call.status} />
          <span>{statusLabel(call.status)}</span>
        </div>
      </div>
      <details className="mt-2 rounded-lg bg-muted/50 px-2.5 py-2">
        <summary className="cursor-pointer select-none font-medium">Detalle</summary>
        <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-muted-foreground">
          {details(call)}
        </pre>
      </details>
    </article>
  );
}
