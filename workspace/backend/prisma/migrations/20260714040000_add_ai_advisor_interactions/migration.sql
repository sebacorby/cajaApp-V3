-- CreateTable
CREATE TABLE "AiAdvisorInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodFrom" TEXT NOT NULL,
    "periodTo" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "currency" TEXT,
    "contextFingerprint" TEXT NOT NULL,
    "financialHealthFormulaVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "promptSha256" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "providerRequestId" TEXT NOT NULL,
    "requestJson" TEXT NOT NULL,
    "contextJson" TEXT NOT NULL,
    "responseJson" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX "AiAdvisorInteraction_createdAt_idx"
ON "AiAdvisorInteraction"("createdAt");


CREATE INDEX "AiAdvisorInteraction_periodFrom_periodTo_idx"
ON "AiAdvisorInteraction"("periodFrom", "periodTo");


CREATE INDEX "AiAdvisorInteraction_contextFingerprint_idx"
ON "AiAdvisorInteraction"("contextFingerprint");


CREATE INDEX "AiAdvisorInteraction_promptVersion_idx"
ON "AiAdvisorInteraction"("promptVersion");