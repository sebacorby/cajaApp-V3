-- CreateTable
CREATE TABLE "CategoryBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "limitAmountRaw" TEXT NOT NULL,
    "rolloverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CategoryBudget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MovementCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CategoryBudget_status_idx" ON "CategoryBudget"("status");
CREATE INDEX "CategoryBudget_periodStart_periodEnd_idx" ON "CategoryBudget"("periodStart", "periodEnd");
CREATE INDEX "CategoryBudget_categoryId_currency_idx" ON "CategoryBudget"("categoryId", "currency");
