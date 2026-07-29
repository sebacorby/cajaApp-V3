-- CreateTable
CREATE TABLE "SalaryReceiptDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "aiRunId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "previewJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalaryReceiptDraft_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalaryReceiptDraft_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "AiExtractionRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalaryReceiptDraftItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "sourcePage" INTEGER,
    "originalText" TEXT NOT NULL,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalaryReceiptDraftItem_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "SalaryReceiptDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalaryReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "draftId" TEXT,
    "historyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActiveForPeriod" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "employerName" TEXT NOT NULL,
    "employerTaxId" TEXT,
    "employeeName" TEXT NOT NULL,
    "employeeTaxId" TEXT,
    "periodMonthKey" TEXT NOT NULL,
    "payDate" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "grossAmountRaw" TEXT NOT NULL,
    "deductionsAmountRaw" TEXT NOT NULL,
    "netAmountRaw" TEXT NOT NULL,
    "sourceId" TEXT,
    "actualIncomeEventId" TEXT,
    "projectionIncomeEventId" TEXT,
    "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalaryReceipt_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalaryReceipt_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "SalaryReceiptDraft" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalaryReceipt_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IncomeSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalaryReceipt_actualIncomeEventId_fkey" FOREIGN KEY ("actualIncomeEventId") REFERENCES "IncomeEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalaryReceipt_projectionIncomeEventId_fkey" FOREIGN KEY ("projectionIncomeEventId") REFERENCES "IncomeEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalaryReceiptItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "sourcePage" INTEGER,
    "originalText" TEXT NOT NULL,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalaryReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "SalaryReceipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SalaryReceiptDraft_aiRunId_key" ON "SalaryReceiptDraft"("aiRunId");
CREATE INDEX "SalaryReceiptDraft_status_createdAt_idx" ON "SalaryReceiptDraft"("status", "createdAt");
CREATE INDEX "SalaryReceiptDraft_documentId_idx" ON "SalaryReceiptDraft"("documentId");
CREATE INDEX "SalaryReceiptDraftItem_draftId_displayOrder_idx" ON "SalaryReceiptDraftItem"("draftId", "displayOrder");
CREATE UNIQUE INDEX "SalaryReceipt_draftId_key" ON "SalaryReceipt"("draftId");
CREATE UNIQUE INDEX "SalaryReceipt_actualIncomeEventId_key" ON "SalaryReceipt"("actualIncomeEventId");
CREATE UNIQUE INDEX "SalaryReceipt_projectionIncomeEventId_key" ON "SalaryReceipt"("projectionIncomeEventId");
CREATE UNIQUE INDEX "SalaryReceipt_historyKey_version_key" ON "SalaryReceipt"("historyKey", "version");
CREATE INDEX "SalaryReceipt_periodMonthKey_status_idx" ON "SalaryReceipt"("periodMonthKey", "status");
CREATE INDEX "SalaryReceipt_historyKey_isActiveForPeriod_idx" ON "SalaryReceipt"("historyKey", "isActiveForPeriod");
CREATE INDEX "SalaryReceipt_sourceId_idx" ON "SalaryReceipt"("sourceId");
CREATE INDEX "SalaryReceiptItem_receiptId_displayOrder_idx" ON "SalaryReceiptItem"("receiptId", "displayOrder");
