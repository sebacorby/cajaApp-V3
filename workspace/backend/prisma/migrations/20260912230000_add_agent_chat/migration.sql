-- CreateTable
CREATE TABLE "AgentConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
);

-- CreateTable
CREATE TABLE "AgentMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "contentJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AgentConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
);

-- CreateTable
CREATE TABLE "AgentToolCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
);

-- CreateTable
CREATE TABLE "AgentApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "toolCallId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "impactSummaryJson" TEXT NOT NULL,
    "argumentsHash" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "AgentApproval_toolCallId_fkey" FOREIGN KEY ("toolCallId") REFERENCES "AgentToolCall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AgentConversation_status_updatedAt_idx" ON "AgentConversation"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentMessage_conversationId_sequence_idx" ON "AgentMessage"("conversationId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMessage_conversationId_sequence_key" ON "AgentMessage"("conversationId", "sequence");

-- CreateIndex
CREATE INDEX "AgentAttachment_conversationId_createdAt_idx" ON "AgentAttachment"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentAttachment_sha256_idx" ON "AgentAttachment"("sha256");

-- CreateIndex
CREATE INDEX "AgentRun_conversationId_startedAt_idx" ON "AgentRun"("conversationId", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_status_startedAt_idx" ON "AgentRun"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentToolCall_idempotencyKey_key" ON "AgentToolCall"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentToolCall_runId_ordinal_idx" ON "AgentToolCall"("runId", "ordinal");

-- CreateIndex
CREATE INDEX "AgentToolCall_toolName_createdAt_idx" ON "AgentToolCall"("toolName", "createdAt");

-- CreateIndex
CREATE INDEX "AgentToolCall_status_createdAt_idx" ON "AgentToolCall"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentToolCall_runId_ordinal_key" ON "AgentToolCall"("runId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "AgentApproval_toolCallId_key" ON "AgentApproval"("toolCallId");
