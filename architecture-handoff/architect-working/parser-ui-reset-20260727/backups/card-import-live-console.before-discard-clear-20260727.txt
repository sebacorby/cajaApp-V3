"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleDot, FileText, Loader2, TriangleAlert } from "lucide-react";
import {
  CARD_IMPORT_LIVE_EVENT,
  type CardImportLiveEventDetail,
} from "@/lib/finance/card-import-api";

type Tone = "info" | "working" | "success" | "error";
type Message = {
  id: string;
  title: string;
  body: string;
  tone: Tone;
  timestamp: string;
};

function toneClass(tone: Tone): string {
  if (tone === "success") return "border-emerald-500/25 bg-emerald-500/8";
  if (tone === "error") return "border-destructive/30 bg-destructive/5";
  if (tone === "working") return "border-primary/25 bg-primary/5";
  return "border-border bg-muted/25";
}

function iconFor(tone: Tone) {
  if (tone === "success") return CheckCircle2;
  if (tone === "error") return TriangleAlert;
  if (tone === "working") return Loader2;
  return CircleDot;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function CardImportLiveConsole() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const append = (message: Message) => {
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      );
    };

    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<CardImportLiveEventDetail>).detail;
      if (!detail) return;

      if (detail.type === "reset") {
        setDraftId(null);
        setActive(true);
        setMessages([
          {
            id: "pdf",
            title: "PDF recibido",
            body: `${detail.fileName} · iniciando lectura programática`,
            tone: "info",
            timestamp: detail.timestamp,
          },
          {
            id: "parser-start",
            title: "Procesando resumen",
            body: "CajaApp extrae el texto del PDF y aplica reglas determinísticas. No se utiliza IA.",
            tone: "working",
            timestamp: detail.timestamp,
          },
        ]);
        return;
      }

      if (detail.type === "upload_failed") {
        append({
          id: "upload-failed",
          title: "No se pudo importar el PDF",
          body: detail.message,
          tone: "error",
          timestamp: detail.timestamp,
        });
        setActive(false);
        return;
      }

      if (detail.type === "started") {
        setDraftId(detail.draftId);
        append({
          id: `processed:${detail.draftId}`,
          title: "Documento interpretado",
          body: `${detail.pageCount} páginas procesadas por el parser programático.`,
          tone: "success",
          timestamp: detail.timestamp,
        });
        return;
      }

      setDraftId(detail.draftId);
      const { status } = detail;

      if (status.status === "processing") {
        append({
          id: `processing:${detail.draftId}:${status.progress?.stage ?? "processing"}`,
          title: "Procesando resumen",
          body: status.progress?.message?.trim() || "Interpretando movimientos y cuotas.",
          tone: "working",
          timestamp: detail.timestamp,
        });
        return;
      }

      if (status.status === "failed") {
        append({
          id: `failed:${detail.draftId}`,
          title: "La importación se detuvo",
          body:
            status.error?.message ||
            "El parser encontró datos que no pudo interpretar con seguridad.",
          tone: "error",
          timestamp: detail.timestamp,
        });
        setActive(false);
        return;
      }

      if (status.status === "preview_ready") {
        append({
          id: `ready:${detail.draftId}`,
          title: "Vista previa lista",
          body: "El PDF fue convertido a datos estructurados y ya puede revisarse antes de aceptar el resumen.",
          tone: "success",
          timestamp: detail.timestamp,
        });
        setActive(false);
      }
    };

    window.addEventListener(CARD_IMPORT_LIVE_EVENT, onEvent);
    return () => window.removeEventListener(CARD_IMPORT_LIVE_EVENT, onEvent);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const shortDraft = useMemo(
    () => (draftId ? `${draftId.slice(0, 8)}…` : null),
    [draftId],
  );

  if (!messages.length) return null;

  return (
    <section
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
      data-testid="card-import-live-console"
      aria-live="polite"
    >
      <header className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Procesamiento del resumen</p>
            <p className="text-xs text-muted-foreground">
              PDF → texto RAW → parser programático → validación
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {active ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          {shortDraft ? `Draft ${shortDraft}` : active ? "Procesando" : "Finalizado"}
        </div>
      </header>

      <div ref={scrollRef} className="max-h-[430px] space-y-3 overflow-y-auto p-4">
        {messages.map((message) => {
          const Icon = iconFor(message.tone);
          return (
            <div key={message.id} className="flex gap-3">
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className={message.tone === "working" ? "size-4 animate-spin" : "size-4"} />
              </div>
              <div className={`min-w-0 flex-1 rounded-xl border px-4 py-3 ${toneClass(message.tone)}`}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium">{message.title}</p>
                  <time className="shrink-0 text-[11px] text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </time>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{message.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="border-t px-5 py-3 text-xs text-muted-foreground">
        La importación de tarjetas usa reglas programáticas y validación de cobertura; la IA está fuera de este flujo.
      </footer>
    </section>
  );
}
