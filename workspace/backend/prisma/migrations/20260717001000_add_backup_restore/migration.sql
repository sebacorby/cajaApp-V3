CREATE TABLE "BackupArchive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'created',
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "manifestJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" DATETIME,
    "restoredAt" DATETIME
);

CREATE TABLE "BackupRestoreActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "backupId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detailJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackupRestoreActivity_backupId_fkey" FOREIGN KEY ("backupId") REFERENCES "BackupArchive" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BackupArchive_fileName_key" ON "BackupArchive"("fileName");
CREATE INDEX "BackupArchive_kind_createdAt_idx" ON "BackupArchive"("kind", "createdAt");
CREATE INDEX "BackupArchive_status_createdAt_idx" ON "BackupArchive"("status", "createdAt");
CREATE INDEX "BackupRestoreActivity_backupId_createdAt_idx" ON "BackupRestoreActivity"("backupId", "createdAt");
CREATE INDEX "BackupRestoreActivity_action_status_idx" ON "BackupRestoreActivity"("action", "status");
