ALTER TABLE "CardStatement" ADD COLUMN "periodKey" TEXT;
ALTER TABLE "CardStatement" ADD COLUMN "historyKey" TEXT;
ALTER TABLE "CardStatement" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CardStatement" ADD COLUMN "isActiveForPeriod" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CardStatement" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "CardStatement" ADD COLUMN "archivedReason" TEXT;


UPDATE "CardStatement"
SET "periodKey" = CASE
  WHEN "currentDueDate" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' THEN substr("currentDueDate", 1, 7)
  WHEN "nextClosingDate" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' THEN substr("nextClosingDate", 1, 7)
  WHEN "nextDueDate" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' THEN substr("nextDueDate", 1, 7)
  ELSE NULL
END;


UPDATE "CardStatement"
SET "historyKey" = lower(trim(coalesce(nullif("bankName", ''), 'unknown')))
  || '|'
  || lower(trim(coalesce(nullif("brand", ''), 'unknown')))
  || '|'
  || CASE
       WHEN nullif(trim("statementNumber"), '') IS NULL THEN 'unknown'
       ELSE 'statement:' || lower(trim("statementNumber"))
     END
  || '|'
  || "periodKey"
WHERE "periodKey" IS NOT NULL;


WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "historyKey"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "versionNumber"
  FROM "CardStatement"
  WHERE "historyKey" IS NOT NULL
)
UPDATE "CardStatement"
SET "version" = (
  SELECT "versionNumber"
  FROM ranked
  WHERE ranked."id" = "CardStatement"."id"
)
WHERE "id" IN (SELECT "id" FROM ranked);


WITH latest AS (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "historyKey"
        ORDER BY "version" DESC, "createdAt" DESC, "id" DESC
      ) AS "position"
    FROM "CardStatement"
    WHERE "historyKey" IS NOT NULL
  )
  WHERE "position" = 1
)
UPDATE "CardStatement"
SET
  "isActiveForPeriod" = CASE WHEN "id" IN (SELECT "id" FROM latest) THEN true ELSE false END,
  "status" = CASE
    WHEN "id" IN (SELECT "id" FROM latest) THEN 'accepted'
    WHEN "status" = 'accepted' THEN 'superseded'
    ELSE "status"
  END
WHERE "historyKey" IS NOT NULL;


CREATE UNIQUE INDEX "CardStatement_historyKey_version_key"
  ON "CardStatement"("historyKey", "version");
CREATE UNIQUE INDEX "CardStatement_one_active_per_history_key"
  ON "CardStatement"("historyKey")
  WHERE "historyKey" IS NOT NULL
    AND "isActiveForPeriod" = true
    AND "status" = 'accepted';
CREATE INDEX "CardStatement_historyKey_isActiveForPeriod_idx"
  ON "CardStatement"("historyKey", "isActiveForPeriod");
CREATE INDEX "CardStatement_periodKey_idx"
  ON "CardStatement"("periodKey");
CREATE INDEX "CardStatement_status_archivedAt_idx"
  ON "CardStatement"("status", "archivedAt");
CREATE INDEX "UploadedDocument_sha256_idx"
  ON "UploadedDocument"("sha256");