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

export interface AgentMessage {
  id: string;
  sequence: number;
  role: "user" | "assistant" | "tool";
  content: { text?: string; attachmentIds?: string[] };
  createdAt: string;
}

export interface AgentConversation extends AgentConversationSummary {
  messages: AgentMessage[];
}

export interface AgentEvent {
  runId: string;
  sequence: number;
  timestamp: string;
  type: "run.started" | "assistant.delta" | "assistant.completed" | "run.completed" | "run.cancelled" | "run.failed" | "heartbeat";
  payload: Record<string, unknown>;
}

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

export async function sendAgentMessage(conversationId: string, content: string): Promise<{ runId: string; status: AgentRunStatus }> {
  return parseResponse(await fetch(`${API_BASE_URL}/api/agent/conversations/${conversationId}/messages`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ content, attachmentIds: [] }),
  }));
}

export async function cancelAgentRun(runId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/agent/runs/${runId}/cancel`, { method: "POST" });
  if (!response.ok) await parseResponse(response);
}

export function subscribeAgentRun(
  runId: string,
  onEvent: (event: AgentEvent) => void,
  onError?: (error: Event) => void,
): () => void {
  const source = new EventSource(`${API_BASE_URL}/api/agent/runs/${runId}/events`);
  const eventTypes: AgentEvent["type"][] = [
    "run.started", "assistant.delta", "assistant.completed", "run.completed", "run.cancelled", "run.failed", "heartbeat",
  ];
  for (const type of eventTypes) {
    source.addEventListener(type, (event) => {
      const parsed = JSON.parse((event as MessageEvent).data) as AgentEvent;
      onEvent(parsed);
      if (["run.completed", "run.cancelled", "run.failed"].includes(parsed.type)) source.close();
    });
  }
  if (onError) source.onerror = onError;
  return () => source.close();
}
