-- CreateTable
CREATE TABLE "UploadedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "pageCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AiExtractionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "promptFilePath" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "promptVersion" TEXT,
    "modelProvider" TEXT NOT NULL,
    "modelBaseUrl" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "rawResponsePath" TEXT,
    "rawResponseHash" TEXT,
    "jsonOutput" TEXT,
    "validationErrors" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'started',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "AiExtractionRun_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardStatementDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "aiRunId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'imported',
    "previewJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardStatementDraft_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CardStatementDraft_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "AiExtractionRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardStatementDraftSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    CONSTRAINT "CardStatementDraftSection_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "CardStatementDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardStatementDraftGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "cardLast4" TEXT,
    "holderName" TEXT,
    CONSTRAINT "CardStatementDraftGroup_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "CardStatementDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardStatementDraftRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "groupKey" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "sourcePage" INTEGER,
    "rowType" TEXT NOT NULL,
    "editable" BOOLEAN NOT NULL DEFAULT false,
    "dateRaw" TEXT,
    "dateIso" TEXT,
    "markerRaw" TEXT,
    "referenceRaw" TEXT,
    "installmentRaw" TEXT,
    "receiptRaw" TEXT,
    "amountPesosRaw" TEXT,
    "amountDollarsRaw" TEXT,
    "currencyOriginal" TEXT,
    "originalText" TEXT NOT NULL,
    "confidence" REAL,
    CONSTRAINT "CardStatementDraftRow_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "CardStatementDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardStatement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "draftId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "bankName" TEXT,
    "brand" TEXT,
    "statementNumber" TEXT,
    "accountNumber" TEXT,
    "holderName" TEXT,
    "periodLabel" TEXT,
    "totalPesosRaw" TEXT,
    "totalDollarsRaw" TEXT,
    "minimumPaymentPesosRaw" TEXT,
    "currentDueDate" TEXT,
    "nextClosingDate" TEXT,
    "nextDueDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardStatement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CardStatement_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "CardStatementDraft" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardStatementSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statementId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    CONSTRAINT "CardStatementSection_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardStatementGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statementId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "cardLast4" TEXT,
    "holderName" TEXT,
    "totalPesosRaw" TEXT,
    "totalDollarsRaw" TEXT,
    CONSTRAINT "CardStatementGroup_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardStatementRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statementId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "groupKey" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "sourcePage" INTEGER,
    "rowType" TEXT NOT NULL,
    "editable" BOOLEAN NOT NULL,
    "dateRaw" TEXT,
    "dateIso" TEXT,
    "markerRaw" TEXT,
    "referenceRaw" TEXT,
    "installmentRaw" TEXT,
    "receiptRaw" TEXT,
    "amountPesosRaw" TEXT,
    "amountDollarsRaw" TEXT,
    "currencyOriginal" TEXT,
    "originalText" TEXT NOT NULL,
    "confidence" REAL,
    CONSTRAINT "CardStatementRow_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardInstallmentProjection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statementId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "installmentCurrent" INTEGER,
    "installmentTotal" INTEGER,
    "amountPesosRaw" TEXT,
    "amountDollarsRaw" TEXT,
    "currencyOriginal" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardInstallmentProjection_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManualCardPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statementId" TEXT NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "purchaseDate" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "installments" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManualCardPurchase_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CardStatementDraft_aiRunId_key" ON "CardStatementDraft"("aiRunId");

-- CreateIndex
CREATE INDEX "CardStatementDraftSection_draftId_idx" ON "CardStatementDraftSection"("draftId");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatementDraftSection_draftId_sectionKey_key" ON "CardStatementDraftSection"("draftId", "sectionKey");

-- CreateIndex
CREATE INDEX "CardStatementDraftGroup_draftId_idx" ON "CardStatementDraftGroup"("draftId");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatementDraftGroup_draftId_groupKey_key" ON "CardStatementDraftGroup"("draftId", "groupKey");

-- CreateIndex
CREATE INDEX "CardStatementDraftRow_draftId_idx" ON "CardStatementDraftRow"("draftId");

-- CreateIndex
CREATE INDEX "CardStatementDraftRow_draftId_sectionKey_idx" ON "CardStatementDraftRow"("draftId", "sectionKey");

-- CreateIndex
CREATE INDEX "CardStatementDraftRow_draftId_groupKey_idx" ON "CardStatementDraftRow"("draftId", "groupKey");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatement_draftId_key" ON "CardStatement"("draftId");

-- CreateIndex
CREATE INDEX "CardStatementSection_statementId_idx" ON "CardStatementSection"("statementId");

-- CreateIndex
CREATE INDEX "CardStatementGroup_statementId_idx" ON "CardStatementGroup"("statementId");

-- CreateIndex
CREATE INDEX "CardStatementRow_statementId_idx" ON "CardStatementRow"("statementId");

-- CreateIndex
CREATE INDEX "CardStatementRow_statementId_sectionKey_idx" ON "CardStatementRow"("statementId", "sectionKey");

-- CreateIndex
CREATE INDEX "CardStatementRow_statementId_groupKey_idx" ON "CardStatementRow"("statementId", "groupKey");

-- CreateIndex
CREATE INDEX "CardInstallmentProjection_statementId_idx" ON "CardInstallmentProjection"("statementId");

-- CreateIndex
CREATE INDEX "CardInstallmentProjection_statementId_monthKey_idx" ON "CardInstallmentProjection"("statementId", "monthKey");

-- CreateIndex
CREATE INDEX "ManualCardPurchase_statementId_idx" ON "ManualCardPurchase"("statementId");
