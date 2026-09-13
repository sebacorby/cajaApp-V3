CREATE TABLE "MonthClose" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "activeKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'closed',
    "summaryJson" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "closedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reopenedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "MonthCloseActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "closeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "detailJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthCloseActivity_closeId_fkey" FOREIGN KEY ("closeId") REFERENCES "MonthClose" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MonthClose_monthKey_version_key" ON "MonthClose"("monthKey", "version");
CREATE UNIQUE INDEX "MonthClose_activeKey_key" ON "MonthClose"("activeKey");
CREATE INDEX "MonthClose_monthKey_status_idx" ON "MonthClose"("monthKey", "status");
CREATE INDEX "MonthClose_status_closedAt_idx" ON "MonthClose"("status", "closedAt");
CREATE INDEX "MonthCloseActivity_closeId_createdAt_idx" ON "MonthCloseActivity"("closeId", "createdAt");
