"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinanceUI } from "@/lib/finance/ui-store";

export function AgentLauncher() {
  const open = useFinanceUI((state) => state.agentOpen);
  const setOpen = useFinanceUI((state) => state.setAgentOpen);
  const activity = useFinanceUI((state) => state.agentActivityStatus);

  if (open) return null;

  return (
    <Button
      type="button"
      size="icon"
      data-testid="agent-launcher"
      aria-label="Abrir Agente IA"
      title="Abrir Agente IA"
      onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 z-40 size-[60px] rounded-full shadow-lg max-sm:bottom-4 max-sm:right-4 max-sm:size-[54px]"
    >
      <MessageCircle className="size-6" aria-hidden="true" />
      {activity !== "idle" && (
        <span
          data-testid="agent-launcher-activity"
          data-status={activity}
          className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-background bg-amber-500"
          aria-label={activity === "awaiting_approval" ? "Agente IA esperando aprobación" : "Agente IA con actividad"}
        />
      )}
    </Button>
  );
}
