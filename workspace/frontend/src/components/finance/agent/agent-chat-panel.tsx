"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AgentComposer } from "./agent-composer";
import { AgentEmptyState } from "./agent-empty-state";
import { ConversationDrawer } from "./conversation-drawer";
import { ConversationHeader } from "./conversation-header";
import { MessageList, type AgentUiMessage } from "./message-list";
import {
  cancelAgentRun,
  createAgentConversation,
  getAgentConversation,
  listAgentConversations,
  sendAgentMessage,
  subscribeAgentRun,
  type AgentConversation,
  type AgentConversationSummary,
} from "@/lib/finance/agent-api";
import { useFinanceUI, type SearchNavigationTarget, type SectionId } from "@/lib/finance/ui-store";

const AGENT_NAV_SECTIONS = new Set<SectionId>([
  "dashboard", "movimientos", "ingresos", "tarjetas", "importaciones", "conciliacion",
  "cierres", "respaldo", "deuda", "presupuestos", "objetivos", "reportes", "salud", "configuracion",
]);
const SEARCH_TARGET_SECTIONS = new Set(["movimientos", "tarjetas", "ingresos", "presupuestos", "objetivos"]);
const SEARCH_RECORD_TYPES = new Set(["movement", "card_statement", "income_source", "budget", "goal"]);

function toUiMessages(conversation: AgentConversation | null): AgentUiMessage[] {
  if (!conversation) return [];
  return conversation.messages.map((message) => ({
    id: message.id,
    role: message.role,
    text: message.content.text ?? "",
    toolCall: message.content.toolCall,
  }));
}

function navigationTarget(payload: Record<string, unknown>): SearchNavigationTarget | null {
  if (typeof payload.section !== "string" || !SEARCH_TARGET_SECTIONS.has(payload.section)) return null;
  if (typeof payload.recordId !== "string" || typeof payload.recordType !== "string" || !SEARCH_RECORD_TYPES.has(payload.recordType)) return null;
  if (typeof payload.module !== "string" || typeof payload.typeLabel !== "string" || typeof payload.title !== "string") return null;
  return {
    section: payload.section as SearchNavigationTarget["section"],
    recordId: payload.recordId,
    recordType: payload.recordType as SearchNavigationTarget["recordType"],
    module: payload.module,
    typeLabel: payload.typeLabel,
    title: payload.title,
    context: typeof payload.context === "string" ? payload.context : "",
  };
}

export function AgentChatPanel() {
  const open = useFinanceUI((state) => state.agentOpen);
  const setOpen = useFinanceUI((state) => state.setAgentOpen);
  const activeId = useFinanceUI((state) => state.activeAgentConversationId);
  const setActiveId = useFinanceUI((state) => state.setActiveAgentConversationId);
  const setSection = useFinanceUI((state) => state.setSection);
  const navigateToSearchResult = useFinanceUI((state) => state.navigateToSearchResult);

  const [mobile, setMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<AgentConversationSummary[]>([]);
  const [conversation, setConversation] = useState<AgentConversation | null>(null);
  const [draft, setDraft] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    const result = await listAgentConversations();
    setConversations(result.items);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const result = await getAgentConversation(id);
    setConversation(result);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    refreshList().catch(() => undefined);
  }, [open, refreshList]);

  useEffect(() => {
    if (!open || !activeId) {
      if (!activeId) setConversation(null);
      return;
    }
    loadConversation(activeId).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la conversación");
    });
  }, [activeId, loadConversation, open]);

  const baseMessages = useMemo(() => toUiMessages(conversation), [conversation]);
  const messages = useMemo(() => {
    if (!streamText) return baseMessages;
    return [...baseMessages, { id: "streaming", role: "assistant" as const, text: streamText }];
  }, [baseMessages, streamText]);

  const beginNewChat = useCallback(() => {
    setActiveId(null);
    setConversation(null);
    setStreamText("");
    setDraft("");
    setDrawerOpen(false);
    setError(null);
  }, [setActiveId]);

  const selectConversation = useCallback(async (id: string) => {
    setActiveId(id);
    setDrawerOpen(false);
    setStreamText("");
    setError(null);
    await loadConversation(id);
  }, [loadConversation, setActiveId]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (activeId) return activeId;
    const created = await createAgentConversation();
    setActiveId(created.id);
    setConversations((items) => [created, ...items]);
    setConversation({ ...created, messages: [] });
    return created.id;
  }, [activeId, setActiveId]);

  const send = useCallback(async () => {
    const content = draft.trim();
    if (!content || runId) return;
    setError(null);
    setStreamText("");
    try {
      const conversationId = await ensureConversation();
      setDraft("");
      const started = await sendAgentMessage(conversationId, content);
      setRunId(started.runId);
      await loadConversation(conversationId);
      const unsubscribe = subscribeAgentRun(
        started.runId,
        (event) => {
          if (event.type === "assistant.delta") {
            const text = typeof event.payload.text === "string" ? event.payload.text : "";
            setStreamText((current) => current + text);
          }
          if (event.type === "tool.completed" || event.type === "tool.failed") {
            loadConversation(conversationId).catch(() => undefined);
          }
          if (event.type === "ui.navigate") {
            const target = navigationTarget(event.payload);
            if (target) {
              navigateToSearchResult(target);
            } else if (typeof event.payload.section === "string" && AGENT_NAV_SECTIONS.has(event.payload.section as SectionId)) {
              setSection(event.payload.section as SectionId);
            }
          }
          if (["run.completed", "run.cancelled", "run.failed"].includes(event.type)) {
            unsubscribe();
            setRunId(null);
            setStreamText("");
            loadConversation(conversationId).catch(() => undefined);
            refreshList().catch(() => undefined);
            if (event.type === "run.failed") {
              setError(typeof event.payload.message === "string" ? event.payload.message : "El agente no pudo completar la respuesta");
            }
          }
        },
        () => setError("Se interrumpió el stream. Podés reabrir el chat para recuperar el estado."),
      );
    } catch (cause) {
      setRunId(null);
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el mensaje");
    }
  }, [draft, ensureConversation, loadConversation, navigateToSearchResult, refreshList, runId, setSection]);

  const stop = useCallback(async () => {
    if (!runId) return;
    await cancelAgentRun(runId).catch(() => undefined);
    setRunId(null);
  }, [runId]);

  if (!open) return null;

  const panelClass = mobile
    ? "fixed inset-0 z-50 flex h-[100dvh] w-full flex-col bg-card"
    : "fixed bottom-24 right-6 z-50 flex h-[min(76vh,760px)] min-h-[560px] w-[min(460px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl";

  return (
    <section
      className={panelClass}
      data-testid="agent-chat-panel"
      data-mobile={mobile ? "true" : "false"}
      aria-label="Agente IA"
    >
      <ConversationHeader
        title={conversation?.title ?? "Agente IA"}
        provider={conversation?.lastProvider}
        model={conversation?.lastModel}
        onHistory={() => setDrawerOpen(true)}
        onNewChat={beginNewChat}
        onMinimize={() => setOpen(false)}
        onClose={() => setOpen(false)}
      />

      <ConversationDrawer
        open={drawerOpen}
        items={conversations}
        activeId={activeId}
        onClose={() => setDrawerOpen(false)}
        onNew={beginNewChat}
        onSelect={(id) => { void selectConversation(id); }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <AgentEmptyState onSelect={setDraft} />
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {error ? (
        <div role="status" className="border-t bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <AgentComposer
        value={draft}
        running={Boolean(runId)}
        onChange={setDraft}
        onSend={() => { void send(); }}
        onStop={() => { void stop(); }}
      />
    </section>
  );
}
