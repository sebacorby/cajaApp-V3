-- CreateTable
CREATE TABLE "FinancialHealthSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodFrom" TEXT NOT NULL,
    "periodTo" TEXT NOT NULL,
    "formulaVersion" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE UNIQUE INDEX "FinancialHealthSnapshot_periodFrom_periodTo_formulaVersion_sourceFingerprint_key"
ON "FinancialHealthSnapshot"("periodFrom", "periodTo", "formulaVersion", "sourceFingerprint");


CREATE INDEX "FinancialHealthSnapshot_formulaVersion_createdAt_idx"
ON "FinancialHealthSnapshot"("formulaVersion", "createdAt");


CREATE INDEX "FinancialHealthSnapshot_periodFrom_periodTo_idx"
ON "FinancialHealthSnapshot"("periodFrom", "periodTo");