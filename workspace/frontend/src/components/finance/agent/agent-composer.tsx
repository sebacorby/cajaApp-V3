"use client";

import { Paperclip, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AgentComposerProps {
  value: string;
  running: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
}

export function AgentComposer(props: AgentComposerProps) {
  return (
    <div className="shrink-0 border-t bg-card p-3">
      <div className="flex items-end gap-2 rounded-xl border bg-background p-2 shadow-xs focus-within:ring-2 focus-within:ring-ring/50">
        <Button type="button" variant="ghost" size="icon" disabled aria-label="Adjuntar archivo" title="Adjuntar archivo">
          <Paperclip className="size-4" />
        </Button>
        <Textarea
          aria-label="Mensaje para Agente IA"
          value={props.value}
          disabled={props.disabled}
          placeholder="Escribí un mensaje…"
          className="max-h-48 min-h-11 resize-none border-0 px-2 py-2 shadow-none focus-visible:ring-0"
          onChange={(event) => props.onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!props.running && props.value.trim()) props.onSend();
            }
          }}
        />
        {props.running ? (
          <Button type="button" size="icon" variant="outline" aria-label="Detener respuesta" onClick={props.onStop}>
            <Square className="size-4" />
          </Button>
        ) : (
          <Button type="button" size="icon" aria-label="Enviar mensaje" disabled={!props.value.trim() || props.disabled} onClick={props.onSend}>
            <Send className="size-4" />
          </Button>
        )}
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">Enter envía · Shift+Enter agrega una línea</p>
    </div>
  );
}
