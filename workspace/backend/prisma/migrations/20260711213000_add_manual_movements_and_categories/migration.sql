-- CreateTable
CREATE TABLE "MovementCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "icon" TEXT NOT NULL DEFAULT 'circle',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ManualMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "occurredOn" TEXT NOT NULL,
    "effectiveMonthKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "amountRaw" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'actual',
    "notes" TEXT,
    "dedupeKey" TEXT,
    "voidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManualMovement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MovementCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MovementCategory_name_key" ON "MovementCategory"("name");
CREATE INDEX "MovementCategory_active_idx" ON "MovementCategory"("active");
CREATE UNIQUE INDEX "ManualMovement_dedupeKey_key" ON "ManualMovement"("dedupeKey");
CREATE INDEX "ManualMovement_occurredOn_idx" ON "ManualMovement"("occurredOn");
CREATE INDEX "ManualMovement_effectiveMonthKey_idx" ON "ManualMovement"("effectiveMonthKey");
CREATE INDEX "ManualMovement_type_currency_idx" ON "ManualMovement"("type", "currency");
CREATE INDEX "ManualMovement_sourceType_idx" ON "ManualMovement"("sourceType");
CREATE INDEX "ManualMovement_categoryId_idx" ON "ManualMovement"("categoryId");
CREATE INDEX "ManualMovement_voidedAt_idx" ON "ManualMovement"("voidedAt");
