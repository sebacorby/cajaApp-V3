import type { PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../shared/errors.js";
import type { AgentEntityRef } from "./agent-types.js";

const SUMMARY_VERSION = "agent-memory-v1";
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const PENDING_STATUSES = new Set(["proposed", "awaiting_approval", "running"]);

type MemoryOptions = {
  recentMessages?: number;
  maxContextCharacters?: number;
};

type PendingAction = {
  id: string;
  name: string;
  status: string;
  arguments?: unknown;
};

type StoredSummary = {
  version: string;
  throughSequence: number;
  digest: string[];
  entityRefs: AgentEntityRef[];
  identifiers: string[];
  pendingActions: PendingAction[];
};

export type AgentMemorySnapshot = {
  summaryText: string | null;
  summaryVersion: string | null;
  summaryThroughSequence: number | null;
  compacted: boolean;
};
function parseContent(contentJson: string): any {
  try { return JSON.parse(contentJson); } catch { return {}; }
}

function parseStoredSummary(value: string | null): StoredSummary | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredSummary>;
    return {
      version: typeof parsed.version === "string" ? parsed.version : SUMMARY_VERSION,
      throughSequence: typeof parsed.throughSequence === "number" ? parsed.throughSequence : 0,
      digest: Array.isArray(parsed.digest) ? parsed.digest.filter((item): item is string => typeof item === "string") : [],
      entityRefs: Array.isArray(parsed.entityRefs) ? parsed.entityRefs as AgentEntityRef[] : [],
      identifiers: Array.isArray(parsed.identifiers) ? parsed.identifiers.filter((item): item is string => typeof item === "string") : [],
      pendingActions: Array.isArray(parsed.pendingActions) ? parsed.pendingActions as PendingAction[] : [],
    };
  } catch {
    return null;
  }
}

function messageDigest(row: { sequence: number; role: string; contentJson: string }): string {
  const parsed = parseContent(row.contentJson);
  const text = typeof parsed.text === "string" ? parsed.text.replace(/\s+/g, " ").trim() : "";
  const toolName = typeof parsed.toolCall?.name === "string" ? ` tool=${parsed.toolCall.name}` : "";
  const status = typeof parsed.toolCall?.status === "string" ? ` status=${parsed.toolCall.status}` : "";
  const body = text ? ` ${text.slice(0, 500)}` : "";
  return `#${row.sequence} ${row.role}${toolName}${status}${body}`;
}

function dedupeEntityRefs(refs: AgentEntityRef[]): AgentEntityRef[] {
  const byKey = new Map<string, AgentEntityRef>();
  for (const ref of refs) {
    if (!ref || typeof ref.entityType !== "string" || typeof ref.entityId !== "string") continue;
    byKey.set(`${ref.entityType}:${ref.entityId}`, ref);
  }
  return [...byKey.values()];
}
export class AgentMemoryService {
  private readonly recentMessages: number;
  private readonly maxContextCharacters: number;

  constructor(
    private readonly db: PrismaClient = prisma,
    options: MemoryOptions = {},
  ) {
    this.recentMessages = options.recentMessages ?? env.AGENT_RECENT_MESSAGES;
    this.maxContextCharacters = options.maxContextCharacters ?? env.AGENT_MAX_CONTEXT_CHARACTERS;
  }

  async compactIfNeeded(conversationId: string): Promise<AgentMemorySnapshot> {
    const conversation = await this.db.agentConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        summaryText: true,
        summaryVersion: true,
        summaryThroughSequence: true,
      },
    });
    if (!conversation) throw new NotFoundError("Agent conversation");

    const through = conversation.summaryThroughSequence ?? 0;
    const rows = await this.db.agentMessage.findMany({
      where: { conversationId, ...(through > 0 ? { sequence: { gt: through } } : {}) },
      orderBy: { sequence: "asc" },
    });
    if (rows.length <= this.recentMessages) {
      return {
        summaryText: conversation.summaryText ?? null,
        summaryVersion: conversation.summaryVersion ?? null,
        summaryThroughSequence: conversation.summaryThroughSequence ?? null,
        compacted: false,
      };
    }

    let compactCount = rows.length - this.recentMessages;
    while (compactCount < rows.length - 1) {
      const recentCharacters = rows.slice(compactCount).reduce((sum, item) => sum + item.contentJson.length, 0);
      if (recentCharacters <= Math.floor(this.maxContextCharacters * 0.65)) break;
      compactCount += 1;
    }
    const compactRows = rows.slice(0, compactCount);
    if (compactRows.length === 0) {
      return {
        summaryText: conversation.summaryText ?? null,
        summaryVersion: conversation.summaryVersion ?? null,
        summaryThroughSequence: conversation.summaryThroughSequence ?? null,
        compacted: false,
      };
    }

    const previous = parseStoredSummary(conversation.summaryText ?? null);
    const digest = previous?.digest ? [...previous.digest] : [];
    const refs = previous?.entityRefs ? [...previous.entityRefs] : [];
    const identifiers = new Set(previous?.identifiers ?? []);
    const pending = new Map<string, PendingAction>((previous?.pendingActions ?? []).map((item) => [item.id, item]));

    for (const row of compactRows) {
      const parsed = parseContent(row.contentJson);
      digest.push(messageDigest(row));
      for (const id of JSON.stringify(parsed).match(UUID_PATTERN) ?? []) identifiers.add(id.toLowerCase());
      const toolCall = parsed?.toolCall;
      if (toolCall && typeof toolCall === "object") {
        if (Array.isArray(toolCall.entityRefs)) refs.push(...toolCall.entityRefs);
        if (typeof toolCall.id === "string" && typeof toolCall.name === "string" && typeof toolCall.status === "string") {
          if (PENDING_STATUSES.has(toolCall.status)) {
            pending.set(toolCall.id, {
              id: toolCall.id,
              name: toolCall.name,
              status: toolCall.status,
              ...(toolCall.arguments !== undefined ? { arguments: toolCall.arguments } : {}),
            });
          } else {
            pending.delete(toolCall.id);
          }
        }
      }
    }

    const summary: StoredSummary = {
      version: SUMMARY_VERSION,
      throughSequence: compactRows.at(-1)!.sequence,
      digest: digest.slice(-80),
      entityRefs: dedupeEntityRefs(refs),
      identifiers: [...identifiers].slice(-500),
      pendingActions: [...pending.values()],
    };
    let summaryText = JSON.stringify(summary);
    if (summaryText.length > Math.floor(this.maxContextCharacters * 0.55)) {
      summary.digest = summary.digest.slice(-25);
      summaryText = JSON.stringify(summary);
    }

    await this.db.agentConversation.update({
      where: { id: conversationId },
      data: {
        summaryText,
        summaryVersion: SUMMARY_VERSION,
        summaryThroughSequence: summary.throughSequence,
      },
    });
    return {
      summaryText,
      summaryVersion: SUMMARY_VERSION,
      summaryThroughSequence: summary.throughSequence,
      compacted: true,
    };
  }
}

export const agentMemoryService = new AgentMemoryService();
