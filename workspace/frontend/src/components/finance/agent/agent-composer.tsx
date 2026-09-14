"use client";

import { useRef } from "react";
import { Paperclip, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentChip, type AttachmentUiStatus } from "./attachment-chip";

export interface ComposerAttachment {
  key: string;
  fileName: string;
  status: AttachmentUiStatus;
  error?: string;
}

interface AgentComposerProps {
  value: string;
  running: boolean;
  attachments: ComposerAttachment[];
  disabled?: boolean;
  onChange: (value: string) => void;
  onFilesSelected: (files: File[]) => void;
  onRemoveAttachment: (key: string) => void;
  onSend: () => void;
  onStop: () => void;
}

export function AgentComposer(props: AgentComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasStagedAttachment = props.attachments.some((item) => item.status === "staged");
  const canSend = Boolean(props.value.trim()) || hasStagedAttachment;
  return (
    <div className="shrink-0 border-t bg-card p-3">
      {props.attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {props.attachments.map((attachment) => (
            <AttachmentChip
              key={attachment.key}
              fileName={attachment.fileName}
              status={attachment.status}
              error={attachment.error}
              onRemove={() => props.onRemoveAttachment(attachment.key)}
            />
          ))}
        </div>
      ) : null}
      <input
        ref={fileInputRef}
        data-testid="agent-attachment-input"
        type="file"
        accept=".pdf,.csv"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length > 0) props.onFilesSelected(files);
        }}
      />
      <div className="flex items-end gap-2 rounded-xl border bg-background p-2 shadow-xs focus-within:ring-2 focus-within:ring-ring/50">        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          disabled={props.disabled || props.running}
          aria-label="Adjuntar archivo"
          title="Adjuntar archivo"
          onClick={() => fileInputRef.current?.click()}
        >
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
              if (!props.running && canSend) props.onSend();
            }
          }}
        />
        {props.running ? (
          <Button type="button" size="icon" variant="outline" className="min-h-11 min-w-11" aria-label="Detener respuesta" onClick={props.onStop}>
            <Square className="size-4" />
          </Button>
        ) : (          <Button
            type="button"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label="Enviar mensaje"
            disabled={!canSend || props.disabled}
            onClick={props.onSend}
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">Enter envía · Shift+Enter agrega una línea</p>
    </div>
  );
}