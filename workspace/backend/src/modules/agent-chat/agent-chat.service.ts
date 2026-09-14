import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import type { AgentChatMessage } from "../ai/agent/agent-chat-provider.js";
import type { AgentMessageRole } from "./agent-types.js";

const DEFAULT_TITLE = "Nuevo chat";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_BY_EXTENSION = new Map([
  [".pdf", "application/pdf"],
  [".csv", "text/csv"],
]);
const ATTACHMENT_CANONICAL_MIMES = new Set(ATTACHMENT_BY_EXTENSION.values());

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

function attachmentDto(row: any) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    messageId: row.messageId ?? null,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function attachmentError(message: string, statusCode = 400): AppError {
  return new AppError("AGENT_ATTACHMENT_INVALID", message, statusCode);
}

export class AgentChatService {
  private readonly attachmentRoot: string;

  constructor(private readonly db: Db = prisma, attachmentRoot?: string) {
    this.attachmentRoot = path.resolve(attachmentRoot ?? path.join(env.STORAGE_DIR, "agent-chat"));
  }

  private safeAttachmentPath(storagePath: string): string {
    const resolved = path.resolve(storagePath);
    if (resolved !== this.attachmentRoot && !resolved.startsWith(`${this.attachmentRoot}${path.sep}`)) {
      throw attachmentError("Attachment storage metadata is outside the controlled staging directory.");
    }
    return resolved;
  }

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
    const activeRun = await this.db.agentRun?.findFirst?.({
      where: { conversationId: id, status: { in: ["running", "awaiting_approval"] } },
      orderBy: { startedAt: "desc" },
      select: { id: true, status: true, lastEventSequence: true },
    }) ?? null;
    return {
      ...conversationDto(row),
      activeRun: activeRun ? { id: activeRun.id, status: activeRun.status, lastEventSequence: activeRun.lastEventSequence ?? 0 } : null,
      messages: messages.reverse().map(messageDto),
    };
  }

  async updateConversation(id: string, input: { title?: string; status?: "active" | "archived" }) {
    const archivedAt = input.status === "archived" ? new Date() : input.status === "active" ? null : undefined;
    const row = await this.db.agentConversation.update({
      where: { id },
      data: { ...(input.title !== undefined ? { title: input.title.trim() } : {}), ...(input.status ? { status: input.status, archivedAt } : {}) },
    });
    return conversationDto(row);
  }

  async stageAttachment(conversationId: string, input: { filename: string; mimetype: string; buffer: Buffer }) {
    const conversation = await this.db.agentConversation.findUnique({ where: { id: conversationId }, select: { id: true } });
    if (!conversation) throw new NotFoundError("Agent conversation");
    const displayName = path.basename(input.filename.replaceAll("\\", "/"));
    const extension = path.extname(displayName).toLowerCase();
    const canonicalMime = ATTACHMENT_BY_EXTENSION.get(extension);
    if (!canonicalMime) throw attachmentError("Only PDF and CSV attachments are supported.", 415);
    if (!input.buffer.length || input.buffer.length > MAX_ATTACHMENT_BYTES) {
      throw attachmentError(`Attachment size must be between 1 and ${MAX_ATTACHMENT_BYTES} bytes.`, input.buffer.length ? 413 : 400);
    }
    const conversationRoot = this.safeAttachmentPath(path.join(this.attachmentRoot, conversationId));
    await fs.mkdir(conversationRoot, { recursive: true });
    const storagePath = this.safeAttachmentPath(path.join(conversationRoot, `${randomUUID()}${extension}`));
    const sha256 = createHash("sha256").update(input.buffer).digest("hex");
    await fs.writeFile(storagePath, input.buffer, { flag: "wx" });
    try {
      const row = await this.db.agentAttachment.create({
        data: {
          conversationId,
          fileName: displayName,
          mimeType: canonicalMime,
          sizeBytes: input.buffer.length,
          sha256,
          storagePath,
          status: "staged",
        },
      });
      return attachmentDto(row);
    } catch (error) {
      await fs.rm(storagePath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async listAttachments(conversationId: string) {
    const conversation = await this.db.agentConversation.findUnique({ where: { id: conversationId }, select: { id: true } });
    if (!conversation) throw new NotFoundError("Agent conversation");
    const rows = await this.db.agentAttachment.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
    return rows.map(attachmentDto);
  }

  async resolveAttachment(conversationId: string, attachmentId: string) {
    const row = await this.db.agentAttachment.findFirst({ where: { id: attachmentId, conversationId, status: "staged" } });
    if (!row) throw new NotFoundError("Agent attachment");
    const storagePath = this.safeAttachmentPath(row.storagePath);
    let buffer: Buffer;
    try { buffer = await fs.readFile(storagePath); } catch { throw attachmentError("Attachment staging file is unavailable."); }
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const extension = path.extname(row.fileName).toLowerCase();
    const expectedMime = ATTACHMENT_BY_EXTENSION.get(extension);
    if (
      buffer.length !== row.sizeBytes ||
      sha256 !== row.sha256 ||
      !expectedMime ||
      !ATTACHMENT_CANONICAL_MIMES.has(row.mimeType) ||
      row.mimeType !== expectedMime
    ) {
      throw attachmentError("Attachment metadata/hash verification failed.");
    }
    return {
      id: row.id,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      sha256: row.sha256,
      buffer,
    };
  }

  async consumeAttachment(conversationId: string, attachmentId: string): Promise<void> {
    const row = await this.db.agentAttachment.findFirst({ where: { id: attachmentId, conversationId, status: "staged" } });
    if (!row) throw new NotFoundError("Agent attachment");
    await this.db.agentAttachment.update({ where: { id: row.id }, data: { status: "consumed" } });
    const storagePath = this.safeAttachmentPath(row.storagePath);
    await fs.rm(storagePath, { force: true }).catch(() => undefined);
  }

  async deleteAttachment(conversationId: string, attachmentId: string): Promise<void> {
    const row = await this.db.agentAttachment.findFirst({ where: { id: attachmentId, conversationId } });
    if (!row) throw new NotFoundError("Agent attachment");
    await this.db.agentAttachment.delete({ where: { id: row.id } });
    const storagePath = this.safeAttachmentPath(row.storagePath);
    await fs.rm(storagePath, { force: true }).catch(() => undefined);
  }

  async deleteConversation(id: string): Promise<void> {
    const staged = await this.db.agentAttachment.findMany({
      where: { conversationId: id, status: "staged" }, select: { storagePath: true },
    });
    await this.db.agentConversation.delete({ where: { id } });
    await Promise.all(staged.map(async ({ storagePath }) => {
      const safePath = this.safeAttachmentPath(storagePath);
      await fs.rm(safePath, { force: true }).catch(() => undefined);
    }));
  }

  async appendMessage(conversationId: string, role: AgentMessageRole, content: unknown) {
    return this.db.$transaction(async (tx) => {
      const attachmentIds: string[] = role === "user" && content && typeof content === "object" && Array.isArray((content as any).attachmentIds)
        ? Array.from(new Set<string>(((content as any).attachmentIds as unknown[]).filter((id: unknown): id is string => typeof id === "string")))
        : [];
      if (attachmentIds.length) {
        const owned = await tx.agentAttachment.findMany({
          where: { id: { in: attachmentIds }, conversationId, status: "staged" }, select: { id: true },
        });
        if (owned.length !== attachmentIds.length) throw attachmentError("Every attachment must belong to this conversation and remain staged.");
      }
      const latest = await tx.agentMessage.findFirst({
        where: { conversationId }, orderBy: { sequence: "desc" }, select: { sequence: true },
      });
      const row = await tx.agentMessage.create({
        data: { conversationId, sequence: (latest?.sequence ?? 0) + 1, role, contentJson: JSON.stringify(content) },
      });
      if (attachmentIds.length) {
        const linked = await tx.agentAttachment.updateMany({
          where: { id: { in: attachmentIds }, conversationId, status: "staged" }, data: { messageId: row.id },
        });
        if (linked.count !== attachmentIds.length) throw attachmentError("Attachment ownership changed while linking the message.");
      }
      await tx.agentConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return messageDto(row);
    });
  }

  async getProviderMessages(
    conversationId: string,
    options: { afterSequence?: number; limit?: number } = {},
  ): Promise<AgentChatMessage[]> {
    const fetched = await this.db.agentMessage.findMany({
      where: {
        conversationId,
        ...(options.afterSequence ? { sequence: { gt: options.afterSequence } } : {}),
      },
      orderBy: { sequence: options.limit ? "desc" : "asc" },
      ...(options.limit ? { take: options.limit } : {}),
    });
    const rows = options.limit ? [...fetched].reverse() : fetched;
    const parsedRows = rows.map((row) => {
      let parsed: any = {};
      try { parsed = JSON.parse(row.contentJson); } catch { parsed = {}; }
      return { row, parsed };
    });
    const attachmentIds = [...new Set(parsedRows.flatMap(({ parsed }) => Array.isArray(parsed.attachmentIds) ? parsed.attachmentIds.filter((id: unknown): id is string => typeof id === "string") : []))];
    const attachments = attachmentIds.length
      ? await this.db.agentAttachment.findMany({
          where: { conversationId, id: { in: attachmentIds } },
          select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
        })
      : [];
    const attachmentById = new Map(attachments.map((item) => [item.id, item]));
    return parsedRows.map(({ row, parsed }) => {
      let content = typeof parsed.text === "string" ? parsed.text : "";
      if (row.role === "user" && Array.isArray(parsed.attachmentIds) && parsed.attachmentIds.length) {
        const safeMetadata = parsed.attachmentIds
          .map((id: string) => attachmentById.get(id))
          .filter(Boolean)
          .map((item: any) => `attachmentId=${item.id}; fileName=${item.fileName}; mimeType=${item.mimeType}; sizeBytes=${item.sizeBytes}`);
        if (safeMetadata.length) content += `${content ? "\n\n" : ""}[Adjuntos de esta conversación: ${safeMetadata.join(" | ")}]`;
      }
      const message: AgentChatMessage = { role: row.role as AgentChatMessage["role"], content };
      if (message.role === "assistant" && Array.isArray(parsed.toolCalls)) message.toolCalls = parsed.toolCalls;
      if (message.role === "tool" && parsed.toolCall && typeof parsed.toolCall === "object") {
        if (typeof parsed.toolCall.providerCallId === "string") message.toolCallId = parsed.toolCall.providerCallId;
        if (typeof parsed.toolCall.name === "string") message.name = parsed.toolCall.name;
      }
      return message;
    });
  }
}

export const agentChatService = new AgentChatService();