import { Activity } from "lucide-react";
import type { AgentRunSnapshot, AgentToolCallView } from "@/lib/finance/agent-api";

export function ActivityPanel({ calls, run }: { calls: AgentToolCallView[]; run?: AgentRunSnapshot | null }) {
  if (calls.length === 0 && !run) return null;
  const completed = calls.filter((call) => call.status === "succeeded").length;
  const failed = calls.filter((call) => call.status === "failed").length;
  const active = calls.length - completed - failed;

  return (
    <div
      data-testid="agent-activity-panel"
      data-run-status={run?.status ?? "idle"}
      className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground"
    >
      <Activity className="size-3.5" aria-hidden="true" />
      {run ? <span>{run.provider} / {run.model}</span> : null}
      {run ? <><span aria-hidden="true">·</span><span>{run.status}</span></> : null}
      <span>{calls.length} tool{calls.length === 1 ? "" : "s"}</span>
      <span aria-hidden="true">·</span>
      <span>{completed} completada{completed === 1 ? "" : "s"}</span>
      {active > 0 ? <><span aria-hidden="true">·</span><span>{active} activa{active === 1 ? "" : "s"}</span></> : null}
      {failed > 0 ? <><span aria-hidden="true">·</span><span>{failed} con error</span></> : null}
      {run?.inputTokens != null || run?.outputTokens != null ? (
        <><span aria-hidden="true">·</span><span>{run.inputTokens ?? 0} in / {run.outputTokens ?? 0} out</span></>
      ) : null}
      {run?.errorCode ? <><span aria-hidden="true">·</span><span>{run.errorCode}</span></> : null}
    </div>
  );
}
