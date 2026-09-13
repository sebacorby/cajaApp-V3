-- CreateTable
CREATE TABLE "SavingsGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "targetAmountRaw" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "targetDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "completedAt" DATETIME,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GoalContribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "contributedOn" TEXT NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "notes" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "referenceLabel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SavingsGoal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "detailJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalActivity_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SavingsGoal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SavingsGoal_status_idx" ON "SavingsGoal"("status");
CREATE INDEX "SavingsGoal_targetDate_idx" ON "SavingsGoal"("targetDate");
CREATE INDEX "SavingsGoal_currency_idx" ON "SavingsGoal"("currency");
CREATE INDEX "GoalContribution_goalId_contributedOn_idx" ON "GoalContribution"("goalId", "contributedOn");
CREATE INDEX "GoalContribution_referenceType_referenceId_idx" ON "GoalContribution"("referenceType", "referenceId");
CREATE INDEX "GoalActivity_goalId_createdAt_idx" ON "GoalActivity"("goalId", "createdAt");
