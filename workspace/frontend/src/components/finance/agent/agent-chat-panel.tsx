"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentComposer, type ComposerAttachment } from "./agent-composer";
import { AgentEmptyState } from "./agent-empty-state";
import { ApprovalCard } from "./approval-card";
import { ConversationDrawer } from "./conversation-drawer";
import { ConversationHeader } from "./conversation-header";
import { MessageList, type AgentUiMessage } from "./message-list";
import {
  approveAgentToolCall,
  cancelAgentRun,
  createAgentConversation,
  deleteAgentAttachment,
  getAgentConversation,
  getAgentRun,
  listAgentAttachments,
  listAgentConversations,
  rejectAgentToolCall,
  sendAgentMessage,
  subscribeAgentRun,
  uploadAgentAttachment,
  type AgentAttachment,
  type AgentConversation,
  type AgentConversationSummary,
  type AgentEvent,
  type AgentRunSnapshot,
  type AgentToolCallView,
} from "@/lib/finance/agent-api";
import { useFinanceUI, type SearchNavigationTarget, type SectionId } from "@/lib/finance/ui-store";

const AGENT_NAV_SECTIONS = new Set<SectionId>([
  "dashboard", "movimientos", "ingresos", "tarjetas", "importaciones", "conciliacion",
  "cierres", "respaldo", "deuda", "presupuestos", "objetivos", "reportes", "salud", "configuracion",
]);
const SEARCH_TARGET_SECTIONS = new Set(["movimientos", "tarjetas", "ingresos", "presupuestos", "objetivos"]);
const SEARCH_RECORD_TYPES = new Set(["movement", "card_statement", "income_source", "budget", "goal"]);
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ACTIVE_CONVERSATION_STORAGE_KEY = "cajaapp-agent-active-conversation";

type PanelAttachment = ComposerAttachment & {
  id?: string;
  conversationId?: string;
};

function stagedAttachmentView(attachment: AgentAttachment): PanelAttachment {
  return {
    key: attachment.id,
    id: attachment.id,
    conversationId: attachment.conversationId,
    fileName: attachment.fileName,
    status: attachment.status,
  };
}

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
  const setActivityStatus = useFinanceUI((state) => state.setAgentActivityStatus);

  const [mobile, setMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<AgentConversationSummary[]>([]);
  const [conversation, setConversation] = useState<AgentConversation | null>(null);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<PanelAttachment[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [runSnapshot, setRunSnapshot] = useState<AgentRunSnapshot | null>(null);
  const [streamEpoch, setStreamEpoch] = useState(0);
  const lastEventRef = useRef<{ runId: string; sequence: number } | null>(null);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{ call: AgentToolCallView; impact?: unknown } | null>(null);
  const [approvalBusy, setApprovalBusy] = useState(false);

  const refreshList = useCallback(async () => {
    const result = await listAgentConversations();
    setConversations(result.items);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const result = await getAgentConversation(id);
    setConversation(result);
    if (result.activeRun) {
      setRunId(result.activeRun.id);
      setActivityStatus(result.activeRun.status === "awaiting_approval" ? "awaiting_approval" : "running");
    }
    return result;
  }, [setActivityStatus]);

  const refreshAttachments = useCallback(async (id: string) => {
    const result = await listAgentAttachments(id);
    const persisted = result.items.filter((item) => item.status === "staged").map(stagedAttachmentView);
    setAttachments((current) => [
      ...current.filter((item) => item.status === "uploading" || item.status === "error"),
      ...persisted,
    ]);
  }, []);

  useEffect(() => {
    const persisted = window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    if (persisted && !activeId) setActiveId(persisted);
  }, [activeId, setActiveId]);

  useEffect(() => {
    if (activeId) window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, activeId);
  }, [activeId]);
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
    if (!activeId) {
      setConversation(null);
      setAttachments([]);
      setRunSnapshot(null);
      setActivityStatus("idle");
      return;
    }
    const tasks: Promise<unknown>[] = [loadConversation(activeId)];
    if (open) tasks.push(refreshAttachments(activeId));
    Promise.all(tasks).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la conversación");
    });
  }, [activeId, loadConversation, open, refreshAttachments, setActivityStatus]);

  const baseMessages = useMemo(() => toUiMessages(conversation), [conversation]);
  const messages = useMemo(() => {
    if (!streamText) return baseMessages;
    return [...baseMessages, { id: "streaming", role: "assistant" as const, text: streamText }];
  }, [baseMessages, streamText]);

  const applyRunSnapshot = useCallback((snapshot: AgentRunSnapshot) => {
    setRunSnapshot(snapshot);
    const pending = snapshot.toolCalls.find((call) =>
      call.status === "awaiting_approval" && call.approval?.status === "pending",
    );
    if (pending) {
      setPendingApproval({ call: pending, impact: pending.approval?.impact });
    } else if (snapshot.status !== "awaiting_approval") {
      setPendingApproval(null);
    }
    if (snapshot.status === "awaiting_approval") setActivityStatus("awaiting_approval");
    else if (snapshot.status === "running") setActivityStatus("running");
    else if (snapshot.status === "failed") setActivityStatus("failed");
    else setActivityStatus("idle");
  }, [setActivityStatus]);

  const handleRunEvent = useCallback((conversationId: string, event: AgentEvent) => {
    const last = lastEventRef.current;
    if (last?.runId === event.runId && event.sequence <= last.sequence) return;
    lastEventRef.current = { runId: event.runId, sequence: event.sequence };
    setRunSnapshot((current) => current?.id === event.runId
      ? { ...current, lastEventSequence: event.sequence }
      : current);

    if (event.type === "run.started") setActivityStatus("running");
    if (event.type === "assistant.delta") {
      const text = typeof event.payload.text === "string" ? event.payload.text : "";
      setStreamText((current) => current + text);
    }
    if (event.type === "tool.completed" || event.type === "tool.failed") {
      void loadConversation(conversationId);
      void refreshAttachments(conversationId);
    }
    if (event.type === "approval.required") {
      setActivityStatus("awaiting_approval");
      setPendingApproval({
        call: {
          id: typeof event.payload.toolCallId === "string" ? event.payload.toolCallId : "",
          name: typeof event.payload.name === "string" ? event.payload.name : "",
          riskClass: typeof event.payload.riskClass === "string" ? event.payload.riskClass : "",
          status: "awaiting_approval",
          arguments: event.payload.arguments,
        },
        impact: event.payload.impact,
      });
    }
    if (event.type === "approval.resolved") {
      setPendingApproval((current) => current && current.call.id === event.payload.toolCallId ? null : current);
      setActivityStatus("running");
      void loadConversation(conversationId);
    }
    if (event.type === "ui.navigate") {
      const target = navigationTarget(event.payload);
      if (target) navigateToSearchResult(target);
      else if (typeof event.payload.section === "string" && AGENT_NAV_SECTIONS.has(event.payload.section as SectionId)) {
        setSection(event.payload.section as SectionId);
      }
    }
    if (["run.completed", "run.cancelled", "run.failed"].includes(event.type)) {
      setRunId(null);
      setStreamText("");
      setPendingApproval(null);
      setActivityStatus(event.type === "run.failed" ? "failed" : "idle");
      void loadConversation(conversationId);
      void refreshAttachments(conversationId);
      void refreshList();
      if (event.type === "run.failed") {
        setError(typeof event.payload.message === "string" ? event.payload.message : "El agente no pudo completar la respuesta");
      }
    }
  }, [loadConversation, navigateToSearchResult, refreshAttachments, refreshList, setActivityStatus, setSection]);

  useEffect(() => {
    if (!runId || !activeId) return;
    let disposed = false;
    let unsubscribe: () => void = () => {};
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = async (afterSequence = 0) => {
      try {
        const snapshot = await getAgentRun(runId);
        if (disposed) return;
        applyRunSnapshot(snapshot);
        const terminal = ["completed", "cancelled", "cancelled_after_tool", "failed"].includes(snapshot.status);
        if (terminal) {
          setRunId(null);
          setStreamText("");
          await loadConversation(activeId).catch(() => undefined);
          return;
        }
        const last = lastEventRef.current?.runId === runId ? lastEventRef.current.sequence : 0;
        const resumeFrom = Math.max(afterSequence, last);
        if (snapshot.status === "awaiting_approval" && streamEpoch === 0) return;
        unsubscribe = subscribeAgentRun(runId, (event) => handleRunEvent(activeId, event), async () => {
          if (disposed) return;
          try {
            const recovered = await getAgentRun(runId);
            if (disposed) return;
            applyRunSnapshot(recovered);
            if (["completed", "cancelled", "cancelled_after_tool", "failed"].includes(recovered.status)) {
              setRunId(null);
              await loadConversation(activeId).catch(() => undefined);
              return;
            }
            if (recovered.status === "awaiting_approval") return;
            const processed = lastEventRef.current?.runId === runId ? lastEventRef.current.sequence : 0;
            reconnectTimer = setTimeout(() => { void connect(processed); }, 250);
          } catch {
            setError("No se pudo recuperar el estado del Agente IA.");
          }
        }, resumeFrom);
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : "No se pudo recuperar el run del Agente IA");
      }
    };

    void connect(lastEventRef.current?.runId === runId ? lastEventRef.current.sequence : 0);
    return () => {
      disposed = true;
      unsubscribe();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [activeId, applyRunSnapshot, handleRunEvent, loadConversation, runId, streamEpoch]);
  const beginNewChat = useCallback(() => {
    window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    setActiveId(null);
    setConversation(null);
    setRunId(null);
    setRunSnapshot(null);
    setStreamText("");
    setPendingApproval(null);
    setActivityStatus("idle");
    setDraft("");
    setAttachments([]);
    setDrawerOpen(false);
    setError(null);
  }, [setActiveId, setActivityStatus]);

  const selectConversation = useCallback(async (id: string) => {
    setRunId(null);
    setRunSnapshot(null);
    setPendingApproval(null);
    setActivityStatus("idle");
    setActiveId(id);
    setDrawerOpen(false);
    setStreamText("");
    setError(null);
    await Promise.all([loadConversation(id), refreshAttachments(id)]);
  }, [loadConversation, refreshAttachments, setActiveId, setActivityStatus]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (activeId) return activeId;
    const created = await createAgentConversation();
    setActiveId(created.id);
    setConversations((items) => [created, ...items]);
    setConversation({ ...created, messages: [] });
    return created.id;
  }, [activeId, setActiveId]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setError(null);
    const seed = Date.now();
    const prepared = files.map((file, index) => {
      const key = `${seed}-${index}-${file.name}`;
      const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "";
      if (extension !== "pdf" && extension !== "csv") {
        return { file, view: { key, fileName: file.name, status: "error" as const, error: "Solo se admiten archivos PDF o CSV." } };
      }
      if (file.size === 0) {
        return { file, view: { key, fileName: file.name, status: "error" as const, error: "El archivo está vacío." } };
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        return { file, view: { key, fileName: file.name, status: "error" as const, error: "El archivo supera el límite de 10 MiB." } };
      }
      return { file, view: { key, fileName: file.name, status: "uploading" as const } };
    });

    setAttachments((current) => [...current, ...prepared.map((item) => item.view)]);
    const uploadable = prepared.filter((item) => item.view.status === "uploading");
    if (uploadable.length === 0) return;

    let conversationId: string;
    try {
      conversationId = await ensureConversation();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo crear la conversación";
      setAttachments((current) => current.map((item) =>
        uploadable.some((candidate) => candidate.view.key === item.key) ? { ...item, status: "error", error: message } : item,
      ));
      return;
    }

    for (const item of uploadable) {
      try {
        const uploaded = await uploadAgentAttachment(conversationId, item.file);
        setAttachments((current) => current.map((attachment) =>
          attachment.key === item.view.key ? stagedAttachmentView(uploaded) : attachment,
        ));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "No se pudo adjuntar el archivo";
        setAttachments((current) => current.map((attachment) =>
          attachment.key === item.view.key ? { ...attachment, status: "error", error: message } : attachment,
        ));
      }
    }
  }, [ensureConversation]);

  const send = useCallback(async () => {
    const content = draft.trim();
    const attachmentIds = attachments
      .filter((item) => item.status === "staged" && item.id)
      .map((item) => item.id as string);
    if ((!content && attachmentIds.length === 0) || runId) return;
    setError(null);
    setStreamText("");
    try {
      const conversationId = await ensureConversation();
      setDraft("");
      const started = await sendAgentMessage(conversationId, content, attachmentIds);
      setRunId(started.runId);
      await loadConversation(conversationId);
      setActivityStatus("running");
      setRunSnapshot(null);
      lastEventRef.current = { runId: started.runId, sequence: 0 };
    } catch (cause) {
      setRunId(null);
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el mensaje");
    }
  }, [attachments, draft, ensureConversation, loadConversation, navigateToSearchResult, refreshAttachments, refreshList, runId, setSection]);

  const removeAttachment = useCallback(async (key: string) => {
    const target = attachments.find((item) => item.key === key);
    if (!target) return;
    if (target.id && target.conversationId) {
      try {
        await deleteAgentAttachment(target.conversationId, target.id);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo quitar el archivo");
        return;
      }
    }
    setAttachments((current) => current.filter((item) => item.key !== key));
  }, [attachments]);

  const stop = useCallback(async () => {
    if (!runId) return;
    await cancelAgentRun(runId).catch(() => undefined);
    setStreamEpoch((value) => value + 1);
  }, [runId]);

  const resolveApproval = useCallback(async (approve: boolean) => {
    if (!pendingApproval) return;
    setApprovalBusy(true);
    try {
      if (approve) {
        await approveAgentToolCall(pendingApproval.call.id);
      } else {
        await rejectAgentToolCall(pendingApproval.call.id);
      }
      setPendingApproval((current) => (current?.call.id === pendingApproval.call.id ? null : current));
      setActivityStatus("running");
      setStreamEpoch((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo resolver la aprobación");
    } finally {
      setApprovalBusy(false);
    }
  }, [pendingApproval, setActivityStatus]);

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
        {messages.length === 0 && !runSnapshot ? (
          <AgentEmptyState onSelect={setDraft} />
        ) : (
          <MessageList messages={messages} run={runSnapshot} />
        )}
      </div>

      {pendingApproval ? (
        <div className="border-t bg-background/95 px-4 py-2">
          <ApprovalCard
            call={pendingApproval.call}
            impact={pendingApproval.impact}
            busy={approvalBusy}
            onApprove={() => { void resolveApproval(true); }}
            onReject={() => { void resolveApproval(false); }}
          />
        </div>
      ) : null}

      {error ? (
        <div role="status" className="border-t bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <AgentComposer
        value={draft}
        running={Boolean(runId)}
        attachments={attachments}
        onChange={setDraft}
        onFilesSelected={(files) => { void handleFilesSelected(files); }}
        onRemoveAttachment={(key) => { void removeAttachment(key); }}
        onSend={() => { void send(); }}
        onStop={() => { void stop(); }}
      />
    </section>
  );
}
