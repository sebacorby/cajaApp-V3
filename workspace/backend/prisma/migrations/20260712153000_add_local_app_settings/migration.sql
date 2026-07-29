CREATE TABLE "LocalAppSettings" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'local',
  "displayName" TEXT NOT NULL DEFAULT 'Javi',
  "locale" TEXT NOT NULL DEFAULT 'es-AR',
  "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Tucuman',
  "defaultCurrency" TEXT NOT NULL DEFAULT 'ARS',
  "theme" TEXT NOT NULL DEFAULT 'system',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
