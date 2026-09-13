"use client";

import { MessageSquare, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentConversationSummary } from "@/lib/finance/agent-api";

interface ConversationDrawerProps {
  open: boolean;
  items: AgentConversationSummary[];
  activeId: string | null;
  onClose: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
}

export function ConversationDrawer(props: ConversationDrawerProps) {
  if (!props.open) return null;
  return (
    <div className="absolute inset-0 z-20 flex bg-black/20" data-testid="agent-conversation-drawer">
      <div className="flex h-full w-[82%] max-w-xs flex-col border-r bg-card shadow-xl">
        <div className="flex items-center justify-between border-b p-3">
          <p className="font-semibold">Conversaciones</p>
          <Button variant="ghost" size="icon" aria-label="Cerrar historial" onClick={props.onClose}><X className="size-4" /></Button>
        </div>
        <div className="p-3"><Button className="w-full" variant="outline" onClick={props.onNew}><Plus /> Nuevo chat</Button></div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {props.items.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">Todavía no hay conversaciones.</p>
          ) : props.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelect(item.id)}
              className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${item.id === props.activeId ? "bg-accent" : ""}`}
            >
              <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{item.title}</span>
            </button>
          ))}
        </div>
      </div>
      <button type="button" aria-label="Cerrar historial" className="flex-1" onClick={props.onClose} />
    </div>
  );
}
