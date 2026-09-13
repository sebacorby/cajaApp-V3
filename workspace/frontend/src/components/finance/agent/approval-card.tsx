import { ShieldAlert } from "lucide-react";
import type { AgentToolCallView } from "@/lib/finance/agent-api";

function serializeImpact(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

export function ApprovalCard({
  call,
  impact,
  onApprove,
  onReject,
  busy = false,
}: {
  call: AgentToolCallView;
  impact?: unknown;
  onApprove?: () => void;
  onReject?: () => void;
  busy?: boolean;
}) {
  return (
    <article
      data-testid="agent-approval-card"
      data-tool-name={call.name}
      data-risk-class={call.riskClass}
      data-approval-status="pending"
      className="w-full rounded-xl border border-amber-500/60 bg-amber-500/5 p-3 text-xs shadow-xs"
      aria-label={`Aprobación requerida para ${call.name}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldAlert className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate font-medium">{call.name}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {call.riskClass} · Aprobación requerida
            </p>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full border border-amber-500/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700"
          role="status"
        >
          Pendiente
        </span>
      </div>

      <div className="mt-2 rounded-lg bg-muted/60 px-2.5 py-2">
        <p className="font-medium">Impacto</p>
        {impact ? (
          <pre
            data-testid="agent-approval-impact"
            className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-muted-foreground"
          >
            {serializeImpact(impact)}
          </pre>
        ) : (
          <p className="mt-1 text-[10px] text-muted-foreground">
            CajaApp se detuvo antes de ejecutar esta acción crítica. Revisá la entidad afectada antes de confirmar.
          </p>
        )}
        <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-muted-foreground">
          {serializeImpact(call.arguments ?? {})}
        </pre>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          data-testid="agent-approval-reject"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-4 py-2 font-medium hover:bg-muted"
          disabled={busy}
          onClick={onReject}
        >
          Cancelar
        </button>
        <button
          type="button"
          data-testid="agent-approval-approve"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          disabled={busy}
          onClick={onApprove}
        >
          Confirmar
        </button>
      </div>
    </article>
  );
}