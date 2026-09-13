import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../shared/errors.js";
import type { AgentChatMessage } from "../ai/agent/agent-chat-provider.js";
import type { AgentMessageRole } from "./agent-types.js";

const DEFAULT_TITLE = "Nuevo chat";

type Db = PrismaClient;

function conversationDto(row: any) {
  return {
    id: row.id, title: row.title, status: row.status,
    lastProvider: row.lastProvider ?? null, lastModel: row.lastModel ?? null,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

function messageDto(row: any) {
  let content: unknown = {};
  try { content = JSON.parse(row.contentJson); } catch { content = { text: "" }; }
  return { id: row.id, sequence: row.sequence, role: row.role, content, createdAt: row.createdAt.toISOString() };
}

export class AgentChatService {
  constructor(private readonly db: Db = prisma) {}

  async createConversation(input: { title?: string }) {
    const row = await this.db.agentConversation.create({ data: { title: input.title?.trim() || DEFAULT_TITLE } });
    return conversationDto(row);
  }

  async listConversations(input: { status?: "active" | "archived"; cursor?: string; limit: number }) {
    let cursorRow: { updatedAt: Date } | null = null;
    if (input.cursor) cursorRow = await this.db.agentConversation.findUnique({ where: { id: input.cursor }, select: { updatedAt: true } });
    const where: any = {};
    if (input.status) where.status = input.status;
    if (input.cursor && cursorRow) {
      where.OR = [
        { updatedAt: { lt: cursorRow.updatedAt } },
        { updatedAt: cursorRow.updatedAt, id: { lt: input.cursor } },
      ];
    }
    const rows = await this.db.agentConversation.findMany({
      where, take: input.limit + 1,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
    const hasMore = rows.length > input.limit;
    const items = rows.slice(0, input.limit);
    return { items: items.map(conversationDto), nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
  }

  async getConversation(id: string, options: { beforeSequence?: number; limit?: number } = {}) {
    const row = await this.db.agentConversation.findUnique({ where: { id } });
    if (!row) throw new NotFoundError("Agent conversation");
    const limit = options.limit ?? 50;
    const messages = await this.db.agentMessage.findMany({
      where: { conversationId: id, ...(options.beforeSequence ? { sequence: { lt: options.beforeSequence } } : {}) },
      orderBy: { sequence: "desc" }, take: limit,
    });
    return { ...conversationDto(row), messages: messages.reverse().map(messageDto) };
  }

  async updateConversation(id: string, input: { title?: string; status?: "active" | "archived" }) {
    const archivedAt = input.status === "archived" ? new Date() : input.status === "active" ? null : undefined;
    const row = await this.db.agentConversation.update({
      where: { id },
      data: { ...(input.title !== undefined ? { title: input.title.trim() } : {}), ...(input.status ? { status: input.status, archivedAt } : {}) },
    });
    return conversationDto(row);
  }

  async deleteConversation(id: string): Promise<void> {
    await this.db.agentConversation.delete({ where: { id } });
  }

  async appendMessage(conversationId: string, role: AgentMessageRole, content: unknown) {
    return this.db.$transaction(async (tx) => {
      const latest = await tx.agentMessage.findFirst({
        where: { conversationId }, orderBy: { sequence: "desc" }, select: { sequence: true },
      });
      const row = await tx.agentMessage.create({
        data: { conversationId, sequence: (latest?.sequence ?? 0) + 1, role, contentJson: JSON.stringify(content) },
      });
      await tx.agentConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return messageDto(row);
    });
  }

  async getProviderMessages(conversationId: string): Promise<AgentChatMessage[]> {
    const rows = await this.db.agentMessage.findMany({ where: { conversationId }, orderBy: { sequence: "asc" } });
    return rows.map((row) => {
      let parsed: any = {};
      try { parsed = JSON.parse(row.contentJson); } catch { parsed = {}; }
      return { role: row.role as AgentChatMessage["role"], content: typeof parsed.text === "string" ? parsed.text : "" };
    });
  }
}

export const agentChatService = new AgentChatService();
