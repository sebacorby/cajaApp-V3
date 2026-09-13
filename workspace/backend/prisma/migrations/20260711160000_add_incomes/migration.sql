-- CreateTable
CREATE TABLE "IncomeSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "employer" TEXT,
    "kind" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "baseAmountRaw" TEXT NOT NULL,
    "startMonthKey" TEXT NOT NULL,
    "paymentDay" INTEGER,
    "increaseEveryMonths" INTEGER NOT NULL DEFAULT 3,
    "increasePercentRaw" TEXT NOT NULL DEFAULT '0',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IncomeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT,
    "dedupeKey" TEXT,
    "monthKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'projected',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IncomeEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IncomeSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IncomeSource_startMonthKey_idx" ON "IncomeSource"("startMonthKey");

-- CreateIndex
CREATE INDEX "IncomeSource_active_idx" ON "IncomeSource"("active");

-- CreateIndex
CREATE INDEX "IncomeEvent_monthKey_idx" ON "IncomeEvent"("monthKey");

-- CreateIndex
CREATE INDEX "IncomeEvent_sourceId_monthKey_idx" ON "IncomeEvent"("sourceId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeEvent_dedupeKey_key" ON "IncomeEvent"("dedupeKey");
