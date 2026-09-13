import { Activity } from "lucide-react";
import type { AgentToolCallView } from "@/lib/finance/agent-api";

export function ActivityPanel({ calls }: { calls: AgentToolCallView[] }) {
  if (calls.length === 0) return null;
  const completed = calls.filter((call) => call.status === "succeeded").length;
  const failed = calls.filter((call) => call.status === "failed").length;
  const active = calls.length - completed - failed;

  return (
    <div
      data-testid="agent-activity-panel"
      className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground"
    >
      <Activity className="size-3.5" aria-hidden="true" />
      <span>{calls.length} tool{calls.length === 1 ? "" : "s"}</span>
      <span aria-hidden="true">·</span>
      <span>{completed} completada{completed === 1 ? "" : "s"}</span>
      {active > 0 ? <><span aria-hidden="true">·</span><span>{active} activa{active === 1 ? "" : "s"}</span></> : null}
      {failed > 0 ? <><span aria-hidden="true">·</span><span>{failed} con error</span></> : null}
    </div>
  );
}
