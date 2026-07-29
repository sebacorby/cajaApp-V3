"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  CircleDot,
  FileText,
  Loader2,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  CARD_IMPORT_LIVE_EVENT,
  type CardImportLiveEventDetail,
  type CardImportStatus,
} from "@/lib/finance/card-import-api";

type MessageTone = "info" | "working" | "success" | "error";

type LiveMessage = {
  id: string;
  title: string;
  body: string;
  tone: MessageTone;
  timestamp: string;
};

const numberFormatter = new Intl.NumberFormat("es-AR");

function iconForTone(tone: MessageTone) {
  if (tone === "success") return CheckCircle2;
  if (tone === "error") return TriangleAlert;
  if (tone === "working") return Loader2;
  return CircleDot;
}

function messageClass(tone: MessageTone): string {
  if (tone === "success") {
    return "border-emerald-500/25 bg-emerald-500/8";
  }
  if (tone === "error") {
    return "border-destructive/30 bg-destructive/5";
  }
  if (tone === "working") {
    return "border-primary/25 bg-primary/5";
  }
  return "border-border bg-muted/25";
}

function stageLabel(stage?: string): string | null {
  switch (stage) {
    case "queued":
      return "Importación en cola";
    case "loading_document":
      return "Cargando documento";
    case "extracting_raw_text":
      return "Leyendo el PDF";
    case "sending_raw_text_to_ai":
      return "Enviando el documento a Gemma";
    case "receiving_ai_stream":
      return "Gemma está procesando el resumen";
    case "validating_ai_response":
      return "Validando la respuesta del modelo";
    case "persisting_preview":
      return "Preparando la vista previa";
    case "preview_ready":
      return "Importación lista";
    case "failed":
      return "Importación detenida";
    default:
      return null;
  }
}

function statusBody(status: CardImportStatus): string {
  const message = status.progress?.message?.trim();
  const elapsed = status.progress?.elapsedSeconds;
  if (message && typeof elapsed === "number") {
    return `${message} · ${elapsed}s transcurridos`;
  }
  return message || "Procesando…";
}

export function CardImportLiveConsole() {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [active, setActive] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastStageRef = useRef<string | null>(null);
  const lastRawSignatureRef = useRef<string | null>(null);
  const lastModelRef = useRef<string | null>(null);
  const lastConnectionPhaseRef = useRef<string | null>(null);

  const appendMessage = (message: LiveMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) return current;
      return [...current, message];
    });
  };

  const upsertMessage = (message: LiveMessage) => {
    setMessages((current) => {
      const index = current.findIndex((item) => item.id === message.id);
      if (index < 0) return [...current, message];
      const next = [...current];
      next[index] = message;
      return next;
    });
  };

  useEffect(() => {
    const handleLiveEvent = (event: Event) => {
      const detail = (event as CustomEvent<CardImportLiveEventDetail>).detail;
      if (!detail) return;

      if (detail.type === "reset") {
        lastStageRef.current = null;
        lastRawSignatureRef.current = null;
        lastModelRef.current = null;
        lastConnectionPhaseRef.current = null;
        setDraftId(null);
        setActive(true);
        setMessages([
          {
            id: "pdf-received",
            title: "PDF recibido",
            body: `${detail.fileName} · preparando la importación`,
            tone: "info",
            timestamp: detail.timestamp,
          },
        ]);
        return;
      }

      if (detail.type === "upload_failed") {
        appendMessage({
          id: "upload-failed",
          title: "No se pudo iniciar la importación",
          body: detail.message,
          tone: "error",
          timestamp: detail.timestamp,
        });
        setActive(false);
        return;
      }

      if (detail.type === "started") {
        setDraftId(detail.draftId);
        appendMessage({
          id: `started:${detail.draftId}`,
          title: "Documento aceptado",
          body: `${detail.pageCount} páginas detectadas. El backend ya creó el trabajo de extracción.`,
          tone: "success",
          timestamp: detail.timestamp,
        });
        return;
      }

      const status = detail.status;
      const telemetry = status.telemetry;
      setDraftId(detail.draftId);

      const modelName = telemetry?.model?.name?.trim();
      const modelProvider = telemetry?.model?.provider?.trim();
      const modelSignature = [modelProvider, modelName].filter(Boolean).join(":");
      if (modelSignature && modelSignature !== lastModelRef.current) {
        lastModelRef.current = modelSignature;
        appendMessage({
          id: `model:${detail.draftId}`,
          title: "Modelo asignado",
          body: [modelName, modelProvider].filter(Boolean).join(" · "),
          tone: "info",
          timestamp: detail.timestamp,
        });
      }

      const raw = telemetry?.rawExtraction;
      if (raw) {
        const rawSignature = [raw.pageCount, raw.characterCount, raw.durationMs].join(":");
        if (rawSignature !== lastRawSignatureRef.current) {
          lastRawSignatureRef.current = rawSignature;
          const parts = [
            typeof raw.pageCount === "number"
              ? `${numberFormatter.format(raw.pageCount)} páginas`
              : null,
            typeof raw.characterCount === "number"
              ? `${numberFormatter.format(raw.characterCount)} caracteres extraídos`
              : null,
            typeof raw.durationMs === "number"
              ? `${numberFormatter.format(raw.durationMs)} ms`
              : null,
          ].filter(Boolean);
          appendMessage({
            id: `raw:${detail.draftId}`,
            title: "Texto del PDF extraído",
            body: parts.join(" · ") || "Extracción RAW completada.",
            tone: "success",
            timestamp: detail.timestamp,
          });
        }
      }

      const stage = status.progress?.stage;
      if (stage && stage !== lastStageRef.current) {
        lastStageRef.current = stage;
        const label = stageLabel(stage);
        if (label) {
          appendMessage({
            id: `stage:${detail.draftId}:${stage}`,
            title: label,
            body: statusBody(status),
            tone:
              stage === "failed"
                ? "error"
                : stage === "preview_ready"
                  ? "success"
                  : "working",
            timestamp: detail.timestamp,
          });
        }
      }

      const providerProgress = telemetry?.providerProgress;
      if (providerProgress) {
        const phase = providerProgress.phase || "streaming";
        if (
          phase === "connecting" &&
          lastConnectionPhaseRef.current !== "connecting"
        ) {
          lastConnectionPhaseRef.current = "connecting";
          appendMessage({
            id: `provider-connecting:${detail.draftId}`,
            title: "Conectando con Ollama",
            body: "La solicitud fue enviada al modelo y esperamos el primer fragmento del stream.",
            tone: "working",
            timestamp: detail.timestamp,
          });
        }

        if (phase === "streaming" || phase === "completed") {
          lastConnectionPhaseRef.current = phase;
          const chunks = providerProgress.chunkCount ?? 0;
          const outputChars = providerProgress.contentCharacters ?? 0;
          const reasoningChars = providerProgress.thinkingCharacters ?? 0;
          const elapsedMs = providerProgress.elapsedMs ?? 0;
          const streamParts = [
            `${numberFormatter.format(chunks)} fragmentos recibidos`,
            `${numberFormatter.format(outputChars)} caracteres de respuesta`,
            reasoningChars > 0
              ? `${numberFormatter.format(reasoningChars)} caracteres de actividad de razonamiento detectada`
              : "sin canal de razonamiento separado",
            elapsedMs > 0
              ? `${Math.max(1, Math.round(elapsedMs / 1000))}s de generación`
              : null,
          ].filter(Boolean);

          upsertMessage({
            id: `provider-stream:${detail.draftId}`,
            title:
              phase === "completed"
                ? "Respuesta del modelo recibida"
                : "Gemma está respondiendo en vivo",
            body: streamParts.join(" · "),
            tone: phase === "completed" ? "success" : "working",
            timestamp: detail.timestamp,
          });
        }
      }

      if (status.status === "failed") {
        appendMessage({
          id: `failed:${detail.draftId}`,
          title: "La importación falló",
          body:
            status.error?.message ||
            "El backend informó un error sin detalle adicional.",
          tone: "error",
          timestamp: detail.timestamp,
        });
        setActive(false);
      }

      if (status.status === "preview_ready") {
        appendMessage({
          id: `ready:${detail.draftId}`,
          title: "Vista previa lista",
          body: "La extracción terminó y CajaApp ya puede mostrar el resultado para revisión.",
          tone: "success",
          timestamp: detail.timestamp,
        });
        setActive(false);
      }
    };

    window.addEventListener(CARD_IMPORT_LIVE_EVENT, handleLiveEvent);
    return () => window.removeEventListener(CARD_IMPORT_LIVE_EVENT, handleLiveEvent);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const shortDraftId = useMemo(
    () => (draftId ? `${draftId.slice(0, 8)}…` : null),
    [draftId],
  );

  if (messages.length === 0) return null;

  return (
    <section
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
      data-testid="card-import-live-console"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-foreground">Actividad del modelo</h2>
              {active ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Sparkles className="size-3" aria-hidden="true" />
                  En vivo
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Eventos reales del pipeline de importación
              {shortDraftId ? ` · ${shortDraftId}` : ""}
            </p>
          </div>
        </div>
        {active ? <Loader2 className="size-4 animate-spin text-primary" /> : null}
      </div>

      <div
        ref={scrollRef}
        className="max-h-[430px] space-y-3 overflow-y-auto p-4"
      >
        {messages.map((message) => {
          const Icon = iconForTone(message.tone);
          return (
            <div key={message.id} className="flex items-start gap-3">
              <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon
                  className={`size-4 ${message.tone === "working" ? "animate-pulse" : ""}`}
                  aria-hidden="true"
                />
              </div>
              <div
                className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 ${messageClass(message.tone)}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {message.title}
                  </p>
                  <time className="text-[11px] text-muted-foreground">
                    {new Intl.DateTimeFormat("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      timeZone: "America/Argentina/Tucuman",
                    }).format(new Date(message.timestamp))}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {message.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
        <FileText className="size-3.5" aria-hidden="true" />
        Se muestran etapas, métricas y actividad observable del procesamiento; el resultado financiero sigue validándose por separado.
      </div>
    </section>
  );
}
