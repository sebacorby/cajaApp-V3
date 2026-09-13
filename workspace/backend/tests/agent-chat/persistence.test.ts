import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

let prisma: PrismaClient;
let tempDir: string;

async function createAgentTables(client: PrismaClient): Promise<void> {
  const statements = [
    `CREATE TABLE "ExternalSentinel" ("id" TEXT PRIMARY KEY, "label" TEXT NOT NULL)`,
    `CREATE TABLE "AgentConversation" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "summaryText" TEXT,
      "summaryVersion" TEXT,
      "summaryThroughSequence" INTEGER,
      "lastProvider" TEXT,
      "lastModel" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "archivedAt" DATETIME
    )`,
    `CREATE TABLE "AgentMessage" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "conversationId" TEXT NOT NULL,
      "sequence" INTEGER NOT NULL,
      "role" TEXT NOT NULL,
      "contentJson" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AgentMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AgentConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  ];
  statements.push(
    `CREATE TABLE "AgentAttachment" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "conversationId" TEXT NOT NULL,
      "messageId" TEXT,
      "fileName" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "sizeBytes" INTEGER NOT NULL,
      "sha256" TEXT NOT NULL,
      "storagePath" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'staged',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AgentAttachment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AgentConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "AgentAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AgentMessage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE "AgentRun" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "conversationId" TEXT NOT NULL,
      "userMessageId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'running',
      "provider" TEXT NOT NULL,
      "model" TEXT NOT NULL,
      "systemPromptVersion" TEXT NOT NULL,
      "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" DATETIME,
      "inputTokens" INTEGER,
      "outputTokens" INTEGER,
      "toolCallCount" INTEGER NOT NULL DEFAULT 0,
      "lastEventSequence" INTEGER NOT NULL DEFAULT 0,
      "errorCode" TEXT,
      "errorMessage" TEXT,
      CONSTRAINT "AgentRun_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AgentConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "AgentRun_userMessageId_fkey" FOREIGN KEY ("userMessageId") REFERENCES "AgentMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  );
  statements.push(
    `CREATE TABLE "AgentToolCall" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "runId" TEXT NOT NULL,
      "ordinal" INTEGER NOT NULL,
      "toolName" TEXT NOT NULL,
      "riskClass" TEXT NOT NULL,
      "argumentsJson" TEXT NOT NULL,
      "idempotencyKey" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'proposed',
      "resultJson" TEXT,
      "errorCode" TEXT,
      "errorMessage" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" DATETIME,
      CONSTRAINT "AgentToolCall_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE "AgentApproval" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "toolCallId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "impactSummaryJson" TEXT NOT NULL,
      "argumentsHash" TEXT NOT NULL,
      "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "resolvedAt" DATETIME,
      CONSTRAINT "AgentApproval_toolCallId_fkey" FOREIGN KEY ("toolCallId") REFERENCES "AgentToolCall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX "AgentMessage_conversationId_sequence_key" ON "AgentMessage"("conversationId", "sequence")`,
    `CREATE UNIQUE INDEX "AgentToolCall_runId_ordinal_key" ON "AgentToolCall"("runId", "ordinal")`,
    `CREATE UNIQUE INDEX "AgentToolCall_idempotencyKey_key" ON "AgentToolCall"("idempotencyKey")`,
    `CREATE UNIQUE INDEX "AgentApproval_toolCallId_key" ON "AgentApproval"("toolCallId")`,
  );

  for (const statement of statements) await client.$executeRawUnsafe(statement);
  await client.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
}
beforeAll(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cajaapp-agent-test-"));
  const dbPath = path.join(tempDir, "agent-test.db");
  prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
  await createAgentTables(prisma);
  await prisma.$executeRawUnsafe(`INSERT INTO "ExternalSentinel" ("id", "label") VALUES ('sentinel', 'keep')`);
});

afterAll(async () => {
  await prisma?.$disconnect();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("Agent* persistence invariants", () => {
  it("persiste mensajes ordenados y bloquea secuencias duplicadas", async () => {
    const conversation = await prisma.agentConversation.create({
      data: { title: "Persistencia" },
    });
    await prisma.agentMessage.create({
      data: { conversationId: conversation.id, sequence: 1, role: "user", contentJson: "{}" },
    });
    await expect(prisma.agentMessage.create({
      data: { conversationId: conversation.id, sequence: 1, role: "assistant", contentJson: "{}" },
    })).rejects.toThrow();
    const messages = await prisma.agentMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { sequence: "asc" } });
    expect(messages.map((item) => item.sequence)).toEqual([1]);
  });
  it("impide reutilizar idempotencyKey en tool calls", async () => {
    const conversation = await prisma.agentConversation.create({ data: { title: "Idempotencia" } });
    const message = await prisma.agentMessage.create({
      data: { conversationId: conversation.id, sequence: 1, role: "user", contentJson: "{}" },
    });
    const run = await prisma.agentRun.create({
      data: {
        conversationId: conversation.id,
        userMessageId: message.id,
        provider: "fake",
        model: "fake",
        systemPromptVersion: "test",
      },
    });
    const base = {
      runId: run.id,
      toolName: "movements.create_manual",
      riskClass: "R2",
      argumentsJson: "{}",
      idempotencyKey: `${run.id}:call-1`,
    };
    await prisma.agentToolCall.create({ data: { ...base, ordinal: 1 } });
    await expect(prisma.agentToolCall.create({ data: { ...base, ordinal: 2 } })).rejects.toThrow();
  });

  it("borra sólo el grafo Agent* y conserva tablas externas", async () => {
    const conversation = await prisma.agentConversation.create({ data: { title: "Cascade" } });
    const message = await prisma.agentMessage.create({
      data: { conversationId: conversation.id, sequence: 1, role: "user", contentJson: "{}" },
    });
    const run = await prisma.agentRun.create({
      data: { conversationId: conversation.id, userMessageId: message.id, provider: "fake", model: "fake", systemPromptVersion: "test" },
    });
    const toolCall = await prisma.agentToolCall.create({
      data: {
        runId: run.id,
        ordinal: 1,
        toolName: "month_close.create",
        riskClass: "R3",
        argumentsJson: "{}",
        idempotencyKey: `${run.id}:close-1`,
        status: "awaiting_approval",
      },
    });
    await prisma.agentApproval.create({
      data: { toolCallId: toolCall.id, impactSummaryJson: "{}", argumentsHash: "hash" },
    });

    await prisma.agentConversation.delete({ where: { id: conversation.id } });

    expect(await prisma.agentMessage.count({ where: { conversationId: conversation.id } })).toBe(0);
    expect(await prisma.agentRun.count({ where: { conversationId: conversation.id } })).toBe(0);
    expect(await prisma.agentToolCall.count({ where: { runId: run.id } })).toBe(0);
    expect(await prisma.agentApproval.count({ where: { toolCallId: toolCall.id } })).toBe(0);
    const sentinel = await prisma.$queryRawUnsafe<Array<{ label: string }>>(`SELECT "label" FROM "ExternalSentinel" WHERE "id"='sentinel'`);
    expect(sentinel[0]?.label).toBe("keep");
  });
});
