-- CreateTable
CREATE TABLE "DebitCsvImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "bankName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "delimiter" TEXT NOT NULL,
    "encoding" TEXT NOT NULL,
    "headerRow" INTEGER NOT NULL,
    "headersJson" TEXT NOT NULL,
    "mappingJson" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "omittedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "reversedAt" DATETIME
);

-- CreateTable
CREATE TABLE "DebitCsvRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "occurredOn" TEXT,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "movementType" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "amountRaw" TEXT NOT NULL,
    "categoryId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "duplicateOrdinal" INTEGER NOT NULL DEFAULT 1,
    "dedupeKey" TEXT,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "validationError" TEXT,
    "originalJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    CONSTRAINT "DebitCsvRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "DebitCsvImport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DebitCsvRow_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MovementCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DebitCsvImport_sha256_key" ON "DebitCsvImport"("sha256");
CREATE INDEX "DebitCsvImport_status_idx" ON "DebitCsvImport"("status");
CREATE INDEX "DebitCsvImport_createdAt_idx" ON "DebitCsvImport"("createdAt");

CREATE UNIQUE INDEX "DebitCsvRow_dedupeKey_key" ON "DebitCsvRow"("dedupeKey");
CREATE UNIQUE INDEX "DebitCsvRow_importId_rowNumber_key" ON "DebitCsvRow"("importId", "rowNumber");
CREATE INDEX "DebitCsvRow_importId_status_idx" ON "DebitCsvRow"("importId", "status");
CREATE INDEX "DebitCsvRow_occurredOn_idx" ON "DebitCsvRow"("occurredOn");
CREATE INDEX "DebitCsvRow_categoryId_idx" ON "DebitCsvRow"("categoryId");
CREATE INDEX "DebitCsvRow_fingerprint_idx" ON "DebitCsvRow"("fingerprint");
