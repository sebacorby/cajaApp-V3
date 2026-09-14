const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";

export type AgentConversationStatus = "active" | "archived";
export type AgentRunStatus = "running" | "awaiting_approval" | "completed" | "cancelled" | "cancelled_after_tool" | "failed";

export interface AgentConversationSummary {
  id: string;
  title: string;
  status: AgentConversationStatus;
  lastProvider: string | null;
  lastModel: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface AgentToolCallView {
  id: string;
  providerCallId?: string;
  name: string;
  riskClass: string;
  status: "proposed" | "awaiting_approval" | "running" | "succeeded" | "failed" | "rejected" | "cancelled" | string;
  arguments?: unknown;
  result?: unknown;
  entityRefs?: Array<{ entityType: string; entityId: string; label?: string; section?: string }>;
  errorCode?: string;
  errorMessage?: string;
}

export interface AgentApprovalView {
  id: string;
  toolCallId: string;
  status: "pending" | "approved" | "rejected" | "expired";
  argumentsHash: string;
  impact?: unknown;
  requestedAt: string;
  resolvedAt: string | null;
}

export interface AgentMessage {
  id: string;
  sequence: number;
  role: "user" | "assistant" | "tool";
  content: { text?: string; attachmentIds?: string[]; toolCall?: AgentToolCallView };
  createdAt: string;
}

export interface AgentConversation extends AgentConversationSummary {
  activeRun?: { id: string; status: AgentRunStatus; lastEventSequence: number } | null;
  messages: AgentMessage[];
}

export interface AgentRunSnapshotToolCall extends AgentToolCallView {
  ordinal: number;
  approval?: {
    id: string;
    status: "pending" | "approved" | "rejected" | "expired";
    argumentsHash: string;
    impact?: unknown;
    requestedAt: string;
    resolvedAt: string | null;
  } | null;
}

export interface AgentRunSnapshot {
  id: string;
  conversationId: string;
  status: AgentRunStatus;
  provider: string;
  model: string;
  startedAt: string;
  completedAt: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  toolCallCount: number;
  lastEventSequence: number;
  errorCode: string | null;
  errorMessage: string | null;
  toolCalls: AgentRunSnapshotToolCall[];
}
export interface AgentAttachment {
  id: string;
  conversationId: string;
  messageId: string | null;
  fileName: string;
  mimeType: "application/pdf" | "text/csv";
  sizeBytes: number;
  sha256: string;
  status: "staged" | "consumed";
  createdAt: string;
}

export type AgentEvent = {
  runId: string;
  sequence: number;
  timestamp: string;
  type: "run.started" | "assistant.delta" | "tool.proposed" | "tool.started" | "tool.completed" | "tool.failed" | "approval.required" | "approval.resolved" | "ui.navigate" | "assistant.completed" | "run.completed" | "run.cancelled" | "run.failed" | "heartbeat";
  payload: Record<string, unknown>;
};

export class AgentApiError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = "AgentApiError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = await response.json() as { message?: string; code?: string };
    message = body.message || message;
    code = body.code;
  } catch { /* noop */ }
  throw new AgentApiError(message, response.status, code);
}

export async function listAgentConversations(): Promise<{ items: AgentConversationSummary[]; nextCursor: string | null }> {
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/conversations`, { cache: "no-store" }));
}

export async function createAgentConversation(title?: string): Promise<AgentConversationSummary> {
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/conversations`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(title ? { title } : {}),
  }));
}

export async function getAgentConversation(id: string): Promise<AgentConversation> {
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/conversations/${id}`, { cache: "no-store" }));
}

export async function updateAgentConversation(id: string, input: { title?: string; status?: AgentConversationStatus }): Promise<AgentConversationSummary> {
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/conversations/${id}`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  }));
}

export async function deleteAgentConversation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/agent/conversations/${id}`, { method: "DELETE" });
  if (!response.ok) await parseResponse(response);
}

export async function uploadAgentAttachment(conversationId: string, file: File): Promise<AgentAttachment> {
  const body = new FormData();
  body.append("file", file);
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/conversations/${conversationId}/attachments`, {
    method: "POST",
    body,
  }));
}

export async function listAgentAttachments(conversationId: string): Promise<{ items: AgentAttachment[] }> {
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/conversations/${conversationId}/attachments`, { cache: "no-store" }));
}

export async function deleteAgentAttachment(conversationId: string, attachmentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/agent/conversations/${conversationId}/attachments/${attachmentId}`, { method: "DELETE" });
  if (!response.ok) await parseResponse(response);
}

export async function sendAgentMessage(
  conversationId: string,
  content: string,
  attachmentIds: string[] = [],
): Promise<{ runId: string; status: AgentRunStatus }> {
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/conversations/${conversationId}/messages`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ content, attachmentIds }),
  }));
}

export async function getAgentRun(runId: string): Promise<AgentRunSnapshot> {
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/runs/${runId}`, { cache: "no-store" }));
}
export async function cancelAgentRun(runId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/agent/runs/${runId}/cancel`, { method: "POST" });
  if (!response.ok) await parseResponse(response);
}

export async function approveAgentToolCall(toolCallId: string): Promise<AgentApprovalView> {
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/tool-calls/${toolCallId}/approve`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}),
  }));
}

export async function rejectAgentToolCall(toolCallId: string, reason?: string): Promise<AgentApprovalView> {
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/tool-calls/${toolCallId}/reject`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(reason ? { reason } : {}),
  }));
}

export function subscribeAgentRun(
  runId: string,
  onEvent: (event: AgentEvent) => void,
  onError?: (error: Error) => void,
  afterSequence = 0,
): () => void {
  const controller = new AbortController();
  let terminal = false;
  void (async () => {
    try {
      const headers: Record<string, string> = { Accept: "text/event-stream" };
      if (afterSequence > 0) headers["Last-Event-ID"] = String(afterSequence);
      const response = await fetch(`${API_BASE_URL}/api/agent/runs/${runId}/events`, {
        headers,
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(`Agent stream HTTP ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!controller.signal.aborted) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const block = buffer.slice(0, boundary).replaceAll("\r", "");
          buffer = buffer.slice(boundary + 2);
          const data = block.split("\n").filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim()).join("\n");
          if (data) {
            const parsed = JSON.parse(data) as AgentEvent;
            onEvent(parsed);
            if (["run.completed", "run.cancelled", "run.failed"].includes(parsed.type)) {
              terminal = true;
              controller.abort();
              return;
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
        if (done) break;
      }
      if (!terminal && !controller.signal.aborted) throw new Error("Agent stream disconnected");
    } catch (caught) {
      if (!controller.signal.aborted && onError) {
        onError(caught instanceof Error ? caught : new Error("Agent stream failed"));
      }
    }
  })();
  return () => controller.abort();
}
