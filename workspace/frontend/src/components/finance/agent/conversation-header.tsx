"use client";

import { Bot, History, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConversationHeaderProps {
  title: string;
  provider?: string | null;
  model?: string | null;
  onHistory: () => void;
  onNewChat: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export function ConversationHeader(props: ConversationHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{props.title}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{props.provider && props.model ? `${props.provider} · ${props.model}` : "Agente IA"}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">Acceso CajaApp: completo</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Nuevo chat" title="Nuevo chat" onClick={props.onNewChat}>
          <Plus className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Historial de Agente IA" title="Historial" onClick={props.onHistory}>
          <History className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Minimizar Agente IA" title="Minimizar" onClick={props.onMinimize}>
          <Minus className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Cerrar Agente IA" title="Cerrar" onClick={props.onClose}>
          <X className="size-4" />
        </Button>
      </div>
    </header>
  );
}
