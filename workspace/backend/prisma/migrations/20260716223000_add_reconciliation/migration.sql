-- CreateTable
CREATE TABLE "ReconciliationCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fingerprint" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "confidence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "rationaleJson" TEXT NOT NULL,
    "suggestedResolution" TEXT NOT NULL,
    "currency" TEXT,
    "amountRaw" TEXT,
    "occurredOn" TEXT,
    "excludedMovementId" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "lastDetectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReconciliationParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "movementId" TEXT,
    "description" TEXT NOT NULL,
    "occurredOn" TEXT,
    "currency" TEXT,
    "amountRaw" TEXT,
    "metadataJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReconciliationParticipant_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ReconciliationCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationCase_fingerprint_key" ON "ReconciliationCase"("fingerprint");
CREATE INDEX "ReconciliationCase_status_relationType_idx" ON "ReconciliationCase"("status", "relationType");
CREATE INDEX "ReconciliationCase_isCurrent_status_idx" ON "ReconciliationCase"("isCurrent", "status");
CREATE INDEX "ReconciliationCase_excludedMovementId_idx" ON "ReconciliationCase"("excludedMovementId");
CREATE INDEX "ReconciliationCase_lastDetectedAt_idx" ON "ReconciliationCase"("lastDetectedAt");
CREATE UNIQUE INDEX "ReconciliationParticipant_caseId_entityKey_key" ON "ReconciliationParticipant"("caseId", "entityKey");
CREATE INDEX "ReconciliationParticipant_caseId_role_idx" ON "ReconciliationParticipant"("caseId", "role");
CREATE INDEX "ReconciliationParticipant_movementId_idx" ON "ReconciliationParticipant"("movementId");
CREATE INDEX "ReconciliationParticipant_entityType_sourceId_idx" ON "ReconciliationParticipant"("entityType", "sourceId");
