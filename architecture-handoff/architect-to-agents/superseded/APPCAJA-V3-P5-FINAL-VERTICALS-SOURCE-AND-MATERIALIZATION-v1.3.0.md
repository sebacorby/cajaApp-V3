APPCAJA V3 — P5 FINAL VERTICALS  
SOURCE CODE \+ MATERIALIZATION \+ FOCAL VALIDATION v1.3.0

Estado: CANDIDATE READY FOR MATERIALIZATION — NO ES PASS FINAL  
Fecha: 17 de julio de 2026  
Root canónico y único: I:\\cajaApp-V3  
Entorno obligatorio de validación: Windows x64 \+ Node.js exacto v24.18.0  
Verticales: APP-MONTH-CLOSE-001 y APP-BACKUP-RESTORE-001  
Integración focal obligatoria: APP-RECONCILIATION-001  
Archivos gobernados: 23  
SOURCE\_SET\_SHA256: cba0dc8676c38395e4e8b03235c708c24876655b04c9e490e82db3169fde379a

0\. AUTORIDAD Y LÍMITES

Este documento es el entregable técnico autocontenido y la única fuente para materializar estos dos verticales. Contiene los 23 archivos exactos, sus hashes y la campaña de validación. No autoriza cambios fuera del inventario.

Prohibido:  
\- usar I:\\cajaApp-V3-real o cualquier copia alternativa;  
\- modificar el SSOT, dev.db de forma permanente, .env, package.json o lockfiles;  
\- reimplementar o alterar Conciliación;  
\- agregar dependencias, cambiar Node, usar retries/skips o reducir cobertura;  
\- corregir manualmente el código de este documento durante la materialización;  
\- declarar PASS sin ejecutar todos los gates reales y entregar evidencia completa.

Si el preflight, un baseline o un hash posterior no coincide, detener y declarar FAIL. No improvisar.

1\. RESULTADO FUNCIONAL IMPLEMENTADO

APP-MONTH-CLOSE-001  
\- Cierre mensual determinístico, versionado y reversible.  
\- Snapshot completo separado del resumen liviano de listado.  
\- Importes como strings de centavos enteros; ARS y USD siempre separados.  
\- Totales all, actual, pending y projected para ingresos, egresos y saldo.  
\- Ledger ya depurado por las decisiones resueltas de Conciliación.  
\- Bloqueo si existe cualquier conciliación actual abierta; revalidación dentro de la transacción.  
\- Una sola versión activa por mes mediante activeKey nullable y único.  
\- Orden cronológico: no se cierra un mes anterior mientras haya uno posterior activo.  
\- Sólo se reabre el cierre activo más reciente; el snapshot queda histórico.  
\- Huella SHA-256 canónica, estable y ajena a generatedAt.  
\- Snapshot de movimientos, configuración, objetivos y aportes, presupuestos, resúmenes activos y recibos activos.

APP-BACKUP-RESTORE-001  
\- Contenedor .cajaapp-backup con exactamente database.sqlite y manifest.json.  
\- Snapshot mediante sqlite3.Connection.backup de Python; incluye datos confirmados en WAL.  
\- SHA-256 de base, schema y conjunto de migraciones.  
\- Validación de integrity\_check, foreign\_key\_check, tablas requeridas, migraciones y checksums.  
\- Rechazo de path traversal y entradas inesperadas.  
\- Operaciones create, validate, download y restore serializadas.  
\- Restauración por reemplazo controlado, rollback del rename intermedio y limpieza de sidecars obsoletos.  
\- Backup automático previo a restaurar, persistido nuevamente en la base restaurada.  
\- Archivos físicos fuera de Drive: %LOCALAPPDATA%\\CajaAppV3\\backups.  
\- Sólo Python estándar administrado existente; sin dependencias ni lockfiles nuevos.

2\. VALIDACIONES REALIZADAS SOBRE ESTA FUENTE

\- Inventario: 23/23 archivos presentes.  
\- Parser/transpilación sintáctica TypeScript/TSX: 20/20 PASS con TypeScript 5.8.3.  
\- Migraciones SQL ejecutadas sobre SQLite temporal: PASS.  
\- PRAGMA integrity\_check sobre la base temporal: ok.  
\- PRAGMA foreign\_key\_check: 0 filas.  
\- Unicidad nullable de MonthClose.activeKey: PASS.  
\- Nueva versión del mismo mes después de reabrir: PASS.  
\- Modelos Prisma: 37 modelos, sin nombres duplicados, llaves balanceadas.  
\- Búsqueda de secretos, TODO, FIXME y placeholders: sin hallazgos.

No ejecutado aquí: prisma generate, build real, Vitest real, frontend typecheck/lint/build, Playwright, API real, restauración real de la instalación Windows ni cleanup. Esos gates son obligatorios antes del veredicto.

3\. PREFLIGHT OBLIGATORIO DEL AGENTE

1\. Confirmar literalmente:  
   \- pwd/root: I:\\cajaApp-V3  
   \- node \--version: v24.18.0  
   \- backend: I:\\cajaApp-V3\\workspace\\backend  
   \- frontend: I:\\cajaApp-V3\\workspace\\frontend  
2\. Detener CajaApp con el mecanismo autoritativo existente y demostrar puertos 11436 y 11437 libres.  
3\. Registrar SHA-256 inicial de dev.db y ambos package-lock.json.  
4\. Confirmar que Conciliación existe y no se modifica.  
5\. Validar los cinco archivos replace contra estos baselines exactos:  
   \- workspace/backend/prisma/schema.prisma | bytes=19992 | sha256=83a7f7fa9df878ef59d3400805c47670ed7c949ff4e9044f18bb454798145bfd  
   \- workspace/backend/src/app.ts | bytes=3682 | sha256=c6acdc0fe87aac7347acf6a675798a97414fc7b761c52e398ce27b4a731c2224  
   \- workspace/frontend/src/components/finance/sections/section-router.tsx | bytes=2180 | sha256=2eee17a44333f18ec292e14949fd8d6b817875e506b0eeef6e2ac0922452c27b  
   \- workspace/frontend/src/lib/finance/nav.ts | bytes=2274 | sha256=e155b6543899b5319c2650fceaed4a992281f966546f92dd22212dd20dd97b5f  
   \- workspace/frontend/src/lib/finance/ui-store.ts | bytes=4906 | sha256=fd3b65b59eae1ca110cbe667c88b6e7ac9b07274e195464349075c14e05bd330  
6\. Para cada destino new: si no existe, continuar. Si existe con el hash final exacto, tratarlo como idempotente. Si existe con otros bytes, detener y declarar FAIL.  
7\. Crear backup transaccional de los cinco replace en I:\\cajaApp-V3\\.agent\\p5-final-pre-materialization-\<timestamp\>.

4\. REGLAS DE MATERIALIZACIÓN

\- Escribir exactamente el texto entre BEGIN FILE y END FILE.  
\- Codificación UTF-8 sin BOM, saltos LF y newline final obligatorio.  
\- No incluir los marcadores ni las vallas de código dentro del archivo.  
\- No reformatear, no ordenar imports, no aplicar prettier y no corregir comentarios.  
\- Crear directorios faltantes sólo dentro de las rutas gobernadas.  
\- Materializar primero migraciones/schema, luego backend, después frontend y por último tests.  
\- Al terminar, calcular SHA-256 de cada destino y compararlo con el manifiesto de la sección 5\.  
\- Ante cualquier error, restaurar los cinco replace desde el backup y eliminar sólo los new creados por esta campaña.

5\. MANIFIESTO EXACTO

PATH | ACTION | BYTES | SHA256  
workspace/backend/prisma/migrations/20260716233000\_add\_month\_close/migration.sql | new | 1296 | d916d8c753231ffec8be2a754339dbaaa5680c60b1fbb23793906d8f87b57326  
workspace/backend/prisma/migrations/20260717001000\_add\_backup\_restore/migration.sql | new | 1302 | 3cde56057544ca3b47466cbdb9af6e87a88dea7c82bbaa791132db3dd12f639b  
workspace/backend/prisma/schema.prisma | replace | 21697 | 9524569f266328eb56061b7386b3f28c378d0102a3a73834b89d391cd35273e8  
workspace/backend/src/app.ts | replace | 3934 | 3e702e89bb9d8ba35150ad80f455a5cd4d33bdd34b417b34cef355e49afdf4ad  
workspace/backend/src/modules/backup-restore/backup-restore.controller.ts | new | 2140 | c3154e650cdae736ce58d1648a634db4096c3a98585d5c8c174ffb3ee49e1ceb  
workspace/backend/src/modules/backup-restore/backup-restore.routes.ts | new | 288 | 95cdc1496b3662c28317eced5abde5b7f82179fef75c028b5852470e34be2458  
workspace/backend/src/modules/backup-restore/backup-restore.schemas.ts | new | 266 | 33c65fa5d05d7db7564635cac6686cf51ba8f0357711864ef21efea50a6d4426  
workspace/backend/src/modules/backup-restore/backup-restore.service.ts | new | 23700 | 8a096a55ad46751718703a07ec818c8fdea02a9fabf8bce2f7d600fae2b7f4db  
workspace/backend/src/modules/month-close/month-close.controller.ts | new | 1394 | 18c1f7588e10057df17879bfced157766540ebc897d7414e4823bc082c3feaec  
workspace/backend/src/modules/month-close/month-close.routes.ts | new | 273 | 161be9e95c29d42597dcc6e6eac70a7fd0e6f0ee344eabc440fc1120c35d6de5  
workspace/backend/src/modules/month-close/month-close.schemas.ts | new | 747 | b37866a3ba36b3a4f2351a0620b501ae916c18fe709a9d50858da9a43674a3f0  
workspace/backend/src/modules/month-close/month-close.service.ts | new | 13784 | 43c73d4b967af1723bcace8d7a28de846d7b5e5d49183687e5d4fea8279419f9  
workspace/backend/tests/backup-restore/backup-restore.test.ts | new | 1547 | 77e384ce57b5d06bfa1972d034726a6b4e22226f310a7ccf5a0460da3159c0d6  
workspace/backend/tests/month-close/month-close.test.ts | new | 2201 | 60d83d4e86c947a8f266d904ad0b8e0c823e301dda4cba1c27fccd5aea482ac2  
workspace/frontend/src/components/finance/sections/cierres-section.tsx | new | 11577 | 5e600c2329605d2b9cb91ef6e2ed1bb78c8fb17a5953b26ff466e055df495ebf  
workspace/frontend/src/components/finance/sections/respaldo-section.tsx | new | 12245 | 2c1d5ff8a43d5dc03ad6a89acd8bb102a077072b2d5d143473b33b64097e0036  
workspace/frontend/src/components/finance/sections/section-router.tsx | replace | 2426 | 30da56539723e0fddf0d2782c8ca5065dc98ebd80c303c6d3eb07d65757ea497  
workspace/frontend/src/lib/finance/backup-restore-api.ts | new | 3241 | 670f63b620b5e09adb27dc566ebc0486901977aaf402df24a066791f3b593aa7  
workspace/frontend/src/lib/finance/month-close-api.ts | new | 3281 | 61210e375a16b2b913056c6b6a842d9dc48c8cc3b0d2c174c58a2a95060445ae  
workspace/frontend/src/lib/finance/nav.ts | replace | 2585 | 81d991fbac8250b29dceceda9c7db1e8c4dfc520b19560575e47675ce72a5376  
workspace/frontend/src/lib/finance/ui-store.ts | replace | 4935 | e1ddb199f24b4dfdff9acd980b95572771149b1b1fd57f680f3518d171ca568f  
workspace/frontend/tests/backup-restore.spec.ts | new | 4469 | e29d3e9652ec918aa1727557c4a25c59d1653527d629b126233b6a6cf831f608  
workspace/frontend/tests/month-close.spec.ts | new | 4345 | 628f1b4f11a7f118cc31320036a7dc62e513c40438bf632f015c709b1192a89b

6\. GATE BACKEND FOCAL

Ejecutar desde I:\\cajaApp-V3\\workspace\\backend con la distribución oficial Node v24.18.0:

npm ci  
npm run prisma:generate  
npm run prisma:migrate:status  
npm run prisma:migrate:deploy  
npm run build  
npx vitest run tests/reconciliation/reconciliation.test.ts tests/month-close/month-close.test.ts tests/backup-restore/backup-restore.test.ts

No ejecutar la suite global en esta campaña.

7\. SMOKE API REAL OBLIGATORIO

Conciliación:  
\- list, scan, detail, resolve y reopen; comprobar que el movimiento excluido no integra el ledger del cierre.

Cierre mensual:  
\- crear caso de conciliación abierto y demostrar HTTP 400 al cerrar;  
\- resolverlo y crear cierre para mes UAT;  
\- comprobar listado sin snapshot y detalle con snapshot;  
\- comprobar ARS/USD y estados actual/pending/projected;  
\- comprobar rechazo de segundo activo del mismo mes;  
\- comprobar rechazo de cierre hacia atrás con mes posterior activo;  
\- reabrir sólo el último activo;  
\- crear versión siguiente del mismo mes;  
\- demostrar fingerprint estable para mismo contenido salvo generatedAt.

Backup/Restore:  
\- crear paquete real y verificar que queda fuera de Drive;  
\- descargar y abrir ZIP: exactamente database.sqlite y manifest.json;  
\- validar checksum, schema, migraciones, integrity\_check y foreign\_key\_check;  
\- crear dato UAT A antes del backup y dato UAT B después;  
\- restaurar y demostrar A presente y B ausente;  
\- demostrar existencia y descarga del backup automático pre\_restore;  
\- corromper checksum y demostrar rechazo;  
\- agregar entrada extra/path traversal y demostrar rechazo;  
\- comprobar rollback dejando la base original operativa ante fallo inducido antes del segundo rename.

8\. GATE FRONTEND FOCAL

Ejecutar desde I:\\cajaApp-V3\\workspace\\frontend:

npm ci  
npm run typecheck  
npm run lint  
npm run build  
npx playwright test tests/reconciliation.spec.ts tests/month-close.spec.ts tests/backup-restore.spec.ts \--workers=1 \--retries=0

No usar filtros adicionales, skips, retries ni reportes generados dentro del alcance de lint.

9\. INTEGRIDAD, CLEANUP Y EVIDENCIA

\- Ejecutar PRAGMA integrity\_check y PRAGMA foreign\_key\_check al final.  
\- Eliminar sólo los datos UAT mediante API o procedimiento documentado.  
\- Restaurar dev.db al hash inicial de la campaña de validación, salvo que la campaña se haya definido expresamente sobre una copia.  
\- Confirmar ambos package-lock.json sin cambios.  
\- Confirmar los 23 archivos con los hashes de este documento.  
\- Eliminar node\_modules, dist, .next, test-results y playwright-report generados por npm ci/gates.  
\- Detener servicios y demostrar puertos libres.  
\- Crear evidencia única en:  
  I:\\cajaApp-V3\\architecture-handoff\\agents-to-architect\\pending-validation\\APPCAJA-V3-P5-FINAL-VERTICALS-evidence-v1.3.0  
\- Incluir ambiente, hashes inicial/final, logs completos, pruebas API, inventario, SQLite, cleanup y veredicto PASS/FAIL/BLOCKED.  
\- No actualizar el SSOT. El arquitecto lo hace sólo después de auditar la evidencia.

10\. CRITERIO DE VEREDICTO

PASS: sólo si materialización, migraciones, build, tests, smokes, Playwright, integridad, cleanup y evidencia están completos.  
FAIL: cualquier defecto reproducible, hash distinto, gate rojo, dato restaurado incorrecto o evidencia incompleta.  
BLOCKED: sólo por dependencia externa demostrable antes de reproducir un defecto del vertical.

11\. CÓDIGO FUENTE EXACTO

BEGIN FILE 01/23: workspace/backend/prisma/migrations/20260716233000\_add\_month\_close/migration.sql  
ACTION: new | BYTES: 1296 | SHA256: d916d8c753231ffec8be2a754339dbaaa5680c60b1fbb23793906d8f87b57326  
\`\`\`sql  
CREATE TABLE "MonthClose" (  
    "id" TEXT NOT NULL PRIMARY KEY,  
    "monthKey" TEXT NOT NULL,  
    "version" INTEGER NOT NULL DEFAULT 1,  
    "activeKey" TEXT,  
    "status" TEXT NOT NULL DEFAULT 'closed',  
    "summaryJson" TEXT NOT NULL,  
    "snapshotJson" TEXT NOT NULL,  
    "sourceFingerprint" TEXT NOT NULL,  
    "closedAt" DATETIME NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    "reopenedAt" DATETIME,  
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    "updatedAt" DATETIME NOT NULL  
);

CREATE TABLE "MonthCloseActivity" (  
    "id" TEXT NOT NULL PRIMARY KEY,  
    "closeId" TEXT NOT NULL,  
    "kind" TEXT NOT NULL,  
    "detailJson" TEXT,  
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    CONSTRAINT "MonthCloseActivity\_closeId\_fkey" FOREIGN KEY ("closeId") REFERENCES "MonthClose" ("id") ON DELETE CASCADE ON UPDATE CASCADE  
);

CREATE UNIQUE INDEX "MonthClose\_monthKey\_version\_key" ON "MonthClose"("monthKey", "version");  
CREATE UNIQUE INDEX "MonthClose\_activeKey\_key" ON "MonthClose"("activeKey");  
CREATE INDEX "MonthClose\_monthKey\_status\_idx" ON "MonthClose"("monthKey", "status");  
CREATE INDEX "MonthClose\_status\_closedAt\_idx" ON "MonthClose"("status", "closedAt");  
CREATE INDEX "MonthCloseActivity\_closeId\_createdAt\_idx" ON "MonthCloseActivity"("closeId", "createdAt");  
\`\`\`  
END FILE 01/23: workspace/backend/prisma/migrations/20260716233000\_add\_month\_close/migration.sql

BEGIN FILE 02/23: workspace/backend/prisma/migrations/20260717001000\_add\_backup\_restore/migration.sql  
ACTION: new | BYTES: 1302 | SHA256: 3cde56057544ca3b47466cbdb9af6e87a88dea7c82bbaa791132db3dd12f639b  
\`\`\`sql  
CREATE TABLE "BackupArchive" (  
    "id" TEXT NOT NULL PRIMARY KEY,  
    "fileName" TEXT NOT NULL,  
    "storagePath" TEXT NOT NULL,  
    "kind" TEXT NOT NULL DEFAULT 'manual',  
    "status" TEXT NOT NULL DEFAULT 'created',  
    "sizeBytes" INTEGER NOT NULL,  
    "sha256" TEXT NOT NULL,  
    "manifestJson" TEXT NOT NULL,  
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    "validatedAt" DATETIME,  
    "restoredAt" DATETIME  
);

CREATE TABLE "BackupRestoreActivity" (  
    "id" TEXT NOT NULL PRIMARY KEY,  
    "backupId" TEXT,  
    "action" TEXT NOT NULL,  
    "status" TEXT NOT NULL,  
    "detailJson" TEXT,  
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    CONSTRAINT "BackupRestoreActivity\_backupId\_fkey" FOREIGN KEY ("backupId") REFERENCES "BackupArchive" ("id") ON DELETE SET NULL ON UPDATE CASCADE  
);

CREATE UNIQUE INDEX "BackupArchive\_fileName\_key" ON "BackupArchive"("fileName");  
CREATE INDEX "BackupArchive\_kind\_createdAt\_idx" ON "BackupArchive"("kind", "createdAt");  
CREATE INDEX "BackupArchive\_status\_createdAt\_idx" ON "BackupArchive"("status", "createdAt");  
CREATE INDEX "BackupRestoreActivity\_backupId\_createdAt\_idx" ON "BackupRestoreActivity"("backupId", "createdAt");  
CREATE INDEX "BackupRestoreActivity\_action\_status\_idx" ON "BackupRestoreActivity"("action", "status");  
\`\`\`  
END FILE 02/23: workspace/backend/prisma/migrations/20260717001000\_add\_backup\_restore/migration.sql

BEGIN FILE 03/23: workspace/backend/prisma/schema.prisma  
ACTION: replace | BYTES: 21697 | SHA256: 9524569f266328eb56061b7386b3f28c378d0102a3a73834b89d391cd35273e8  
\`\`\`prisma  
generator client {  
provider \= "prisma-client-js"  
}

datasource db {  
provider \= "sqlite"  
url      \= env("DATABASE\_URL")  
}

model UploadedDocument {  
id            String   @id @default(uuid())  
fileName      String  
mimeType      String  
sizeBytes     Int  
sha256        String  
storagePath   String  
pageCount     Int?  
createdAt     DateTime @default(now())  
updatedAt     DateTime @updatedAt

aiExtractionRuns     AiExtractionRun\[\]  
drafts               CardStatementDraft\[\]  
statements           CardStatement\[\]  
salaryReceiptDrafts  SalaryReceiptDraft\[\]  
salaryReceipts       SalaryReceipt\[\]  
}

model AiExtractionRun {  
id              String   @id @default(uuid())  
documentId      String  
document        UploadedDocument @relation(fields: \[documentId\], references: \[id\], onDelete: Cascade)

promptFilePath  String  
promptHash      String  
promptVersion   String?

modelProvider   String  
modelBaseUrl    String  
modelName       String

rawResponsePath String?  
rawResponseHash String?  
jsonOutput      String?

validationErrors String?  
retries          Int      @default(0)

status          String   @default("started")  
createdAt       DateTime @default(now())  
completedAt     DateTime?

draft               CardStatementDraft? @relation("CardStatementAiRun")  
salaryReceiptDraft SalaryReceiptDraft?  @relation("SalaryReceiptAiRun")  
}

model CardStatementDraft {  
id            String   @id @default(uuid())  
documentId    String  
document      UploadedDocument @relation(fields: \[documentId\], references: \[id\], onDelete: Cascade)  
aiRunId       String?  @unique  
aiRun         AiExtractionRun? @relation("CardStatementAiRun", fields: \[aiRunId\], references: \[id\])

status        String   @default("imported")

previewJson   String?

createdAt     DateTime @default(now())  
updatedAt     DateTime @updatedAt

sections      CardStatementDraftSection\[\]  
groups        CardStatementDraftGroup\[\]  
rows          CardStatementDraftRow\[\]

acceptedStatement CardStatement?  
}

model CardStatementDraftSection {  
id            String   @id @default(uuid())  
draftId       String  
draft         CardStatementDraft @relation(fields: \[draftId\], references: \[id\], onDelete: Cascade)

sectionKey    String  
label         String  
displayOrder  Int

@@unique(\[draftId, sectionKey\])  
@@index(\[draftId\])  
}

model CardStatementDraftGroup {  
id            String   @id @default(uuid())  
draftId       String  
draft         CardStatementDraft @relation(fields: \[draftId\], references: \[id\], onDelete: Cascade)

groupKey      String  
sectionKey    String  
label         String  
displayOrder  Int  
cardLast4     String?  
holderName    String?

@@unique(\[draftId, groupKey\])  
@@index(\[draftId\])  
}

model CardStatementDraftRow {  
id            String   @id @default(uuid())  
draftId       String  
draft         CardStatementDraft @relation(fields: \[draftId\], references: \[id\], onDelete: Cascade)

sectionKey    String  
groupKey      String?

displayOrder  Int  
sourcePage    Int?

rowType       String  
editable      Boolean  @default(false)

dateRaw       String?  
dateIso       String?  
markerRaw     String?  
referenceRaw  String?  
installmentRaw String?  
receiptRaw    String?

amountPesosRaw    String?  
amountDollarsRaw  String?  
currencyOriginal  String?

originalText  String  
confidence    Float?

@@index(\[draftId\])  
@@index(\[draftId, sectionKey\])  
@@index(\[draftId, groupKey\])  
}

model CardStatement {  
id            String   @id @default(uuid())  
documentId    String  
document      UploadedDocument @relation(fields: \[documentId\], references: \[id\], onDelete: Cascade)  
draftId       String?  @unique  
draft         CardStatementDraft? @relation(fields: \[draftId\], references: \[id\])

status        String   @default("accepted")  
periodKey     String?  
historyKey    String?  
version       Int      @default(1)  
isActiveForPeriod Boolean @default(true)  
archivedAt    DateTime?  
archivedReason String?

bankName      String?  
brand         String?  
statementNumber String?  
accountNumber String?  
holderName    String?  
periodLabel   String?

totalPesosRaw String?  
totalDollarsRaw String?  
minimumPaymentPesosRaw String?

currentDueDate String?  
nextClosingDate String?  
nextDueDate    String?

createdAt     DateTime @default(now())  
updatedAt     DateTime @updatedAt

sections      CardStatementSection\[\]  
groups        CardStatementGroup\[\]  
rows          CardStatementRow\[\]  
projections   CardInstallmentProjection\[\]  
manualPurchases ManualCardPurchase\[\]

@@unique(\[historyKey, version\])  
@@index(\[historyKey, isActiveForPeriod\])  
@@index(\[periodKey\])  
@@index(\[status, archivedAt\])  
}

model CardStatementSection {  
id            String   @id @default(uuid())  
statementId   String  
statement     CardStatement @relation(fields: \[statementId\], references: \[id\], onDelete: Cascade)

sectionKey    String  
label         String  
displayOrder  Int

@@index(\[statementId\])  
}

model CardStatementGroup {  
id            String   @id @default(uuid())  
statementId   String  
statement     CardStatement @relation(fields: \[statementId\], references: \[id\], onDelete: Cascade)

groupKey      String  
sectionKey    String  
label         String  
displayOrder  Int  
cardLast4     String?  
holderName    String?

totalPesosRaw   String?  
totalDollarsRaw String?

@@index(\[statementId\])  
}

model CardStatementRow {  
id            String   @id @default(uuid())  
statementId   String  
statement     CardStatement @relation(fields: \[statementId\], references: \[id\], onDelete: Cascade)

sectionKey    String  
groupKey      String?

displayOrder  Int  
sourcePage    Int?

rowType       String  
editable      Boolean

dateRaw       String?  
dateIso       String?  
markerRaw     String?  
referenceRaw  String?  
installmentRaw String?  
receiptRaw    String?

amountPesosRaw    String?  
amountDollarsRaw  String?  
currencyOriginal  String?

originalText  String  
confidence    Float?

@@index(\[statementId\])  
@@index(\[statementId, sectionKey\])  
@@index(\[statementId, groupKey\])  
}

model CardInstallmentProjection {  
id            String   @id @default(uuid())  
statementId   String  
statement     CardStatement @relation(fields: \[statementId\], references: \[id\], onDelete: Cascade)

rowId         String  
monthKey      String  
label         String

installmentCurrent Int?  
installmentTotal  Int?

amountPesosRaw    String?  
amountDollarsRaw  String?  
currencyOriginal  String?

isManual      Boolean  @default(false)

createdAt     DateTime @default(now())

@@index(\[statementId\])  
@@index(\[statementId, monthKey\])  
}

model ManualCardPurchase {  
id            String   @id @default(uuid())  
statementId   String  
statement     CardStatement @relation(fields: \[statementId\], references: \[id\], onDelete: Cascade)

cardLast4     String  
holderName    String  
purchaseDate  String  
description   String  
currency      String  
amountRaw     String  
installments  Int  
notes         String?

createdAt     DateTime @default(now())

@@index(\[statementId\])  
}

model IncomeSource {  
id                    String   @id @default(uuid())  
name                  String  
employer              String?  
kind                  String  
currency              String   @default("ARS")  
baseAmountRaw         String  
startMonthKey         String  
paymentDay            Int?  
increaseEveryMonths   Int      @default(3)  
increasePercentRaw    String   @default("0")  
active                Boolean  @default(true)  
createdAt             DateTime @default(now())  
updatedAt             DateTime @updatedAt

events                IncomeEvent\[\]  
salaryReceipts        SalaryReceipt\[\]

@@index(\[startMonthKey\])  
@@index(\[active\])  
}

model IncomeEvent {  
id          String   @id @default(uuid())  
sourceId    String?  
dedupeKey   String?  @unique  
source      IncomeSource? @relation(fields: \[sourceId\], references: \[id\], onDelete: Cascade)  
monthKey    String  
kind        String  
currency    String   @default("ARS")  
amountRaw   String  
label       String  
status      String   @default("projected")  
notes       String?  
createdAt   DateTime @default(now())  
updatedAt   DateTime @updatedAt

salaryReceiptActual     SalaryReceipt? @relation("SalaryReceiptActualEvent")  
salaryReceiptProjection SalaryReceipt? @relation("SalaryReceiptProjectionEvent")

@@index(\[monthKey\])  
@@index(\[sourceId, monthKey\])  
}

model SalaryReceiptDraft {  
id          String   @id @default(uuid())  
documentId  String  
document    UploadedDocument @relation(fields: \[documentId\], references: \[id\], onDelete: Cascade)  
aiRunId     String?  @unique  
aiRun       AiExtractionRun? @relation("SalaryReceiptAiRun", fields: \[aiRunId\], references: \[id\])  
status      String   @default("processing")  
previewJson String?  
createdAt   DateTime @default(now())  
updatedAt   DateTime @updatedAt

items           SalaryReceiptDraftItem\[\]  
acceptedReceipt SalaryReceipt?

@@index(\[status, createdAt\])  
@@index(\[documentId\])  
}

model SalaryReceiptDraftItem {  
id           String   @id @default(uuid())  
draftId      String  
draft        SalaryReceiptDraft @relation(fields: \[draftId\], references: \[id\], onDelete: Cascade)  
displayOrder Int  
kind         String  
code         String?  
label        String  
amountRaw    String  
sourcePage   Int?  
originalText String  
confidence   Float?  
createdAt    DateTime @default(now())  
updatedAt    DateTime @updatedAt

@@index(\[draftId, displayOrder\])  
}

model SalaryReceipt {  
id                      String   @id @default(uuid())  
documentId              String  
document                UploadedDocument @relation(fields: \[documentId\], references: \[id\], onDelete: Cascade)  
draftId                 String?  @unique  
draft                   SalaryReceiptDraft? @relation(fields: \[draftId\], references: \[id\])  
historyKey               String  
version                  Int      @default(1)  
isActiveForPeriod        Boolean  @default(true)  
status                   String   @default("accepted")  
employerName             String  
employerTaxId            String?  
employeeName             String  
employeeTaxId            String?  
periodMonthKey           String  
payDate                  String?  
currency                 String   @default("ARS")  
grossAmountRaw           String  
deductionsAmountRaw      String  
netAmountRaw             String  
sourceId                 String?  
source                   IncomeSource? @relation(fields: \[sourceId\], references: \[id\], onDelete: SetNull)  
actualIncomeEventId      String?  @unique  
actualIncomeEvent        IncomeEvent? @relation("SalaryReceiptActualEvent", fields: \[actualIncomeEventId\], references: \[id\], onDelete: SetNull)  
projectionIncomeEventId  String?  @unique  
projectionIncomeEvent    IncomeEvent? @relation("SalaryReceiptProjectionEvent", fields: \[projectionIncomeEventId\], references: \[id\], onDelete: SetNull)  
acceptedAt               DateTime @default(now())  
reversedAt               DateTime?  
createdAt                DateTime @default(now())  
updatedAt                DateTime @updatedAt

items SalaryReceiptItem\[\]

@@unique(\[historyKey, version\])  
@@index(\[periodMonthKey, status\])  
@@index(\[historyKey, isActiveForPeriod\])  
@@index(\[sourceId\])  
}

model SalaryReceiptItem {  
id           String   @id @default(uuid())  
receiptId    String  
receipt      SalaryReceipt @relation(fields: \[receiptId\], references: \[id\], onDelete: Cascade)  
displayOrder Int  
kind         String  
code         String?  
label        String  
amountRaw    String  
sourcePage   Int?  
originalText String  
confidence   Float?  
createdAt    DateTime @default(now())  
updatedAt    DateTime @updatedAt

@@index(\[receiptId, displayOrder\])  
}

model MovementCategory {  
id              String   @id @default(uuid())  
name            String   @unique  
color           String   @default("\#64748b")  
icon            String   @default("circle")  
active          Boolean  @default(true)  
isSystem        Boolean  @default(false)  
createdAt       DateTime @default(now())  
updatedAt       DateTime @updatedAt

manualMovements ManualMovement\[\]  
debitCsvRows   DebitCsvRow\[\]  
rules           MovementCategoryRule\[\]  
budgets         CategoryBudget\[\]

@@index(\[active\])  
}

model MovementCategoryRule {  
id                String   @id @default(uuid())  
categoryId        String  
category          MovementCategory @relation(fields: \[categoryId\], references: \[id\], onDelete: Cascade)  
keyword           String  
normalizedKeyword String  
priority          Int      @default(100)  
active            Boolean  @default(true)  
createdAt         DateTime @default(now())  
updatedAt         DateTime @updatedAt

@@unique(\[categoryId, normalizedKeyword\])  
@@index(\[active, priority\])  
@@index(\[normalizedKeyword\])  
}

model ManualMovement {  
id                String   @id @default(uuid())  
occurredOn        String  
effectiveMonthKey String  
type              String  
sourceType        String  
description       String  
categoryId        String?  
category          MovementCategory? @relation(fields: \[categoryId\], references: \[id\], onDelete: SetNull)  
currency          String   @default("ARS")  
amountRaw         String  
status            String   @default("actual")  
notes             String?  
dedupeKey         String?  @unique  
voidedAt          DateTime?  
createdAt         DateTime @default(now())  
updatedAt         DateTime @updatedAt

@@index(\[occurredOn\])  
@@index(\[effectiveMonthKey\])  
@@index(\[type, currency\])  
@@index(\[sourceType\])  
@@index(\[categoryId\])  
@@index(\[voidedAt\])  
}

model DebitCsvImport {  
id            String   @id @default(uuid())  
fileName      String  
sha256        String   @unique  
bankName      String?  
status        String   @default("draft")  
delimiter     String  
encoding      String  
headerRow     Int  
headersJson   String  
mappingJson   String  
rowCount      Int      @default(0)  
acceptedCount Int      @default(0)  
omittedCount  Int      @default(0)  
rejectedCount Int      @default(0)  
createdAt     DateTime @default(now())  
updatedAt     DateTime @updatedAt  
acceptedAt    DateTime?  
reversedAt    DateTime?

rows          DebitCsvRow\[\]

@@index(\[status\])  
@@index(\[createdAt\])  
}

model DebitCsvRow {  
id               String   @id @default(uuid())  
importId         String  
import           DebitCsvImport @relation(fields: \[importId\], references: \[id\], onDelete: Cascade)  
rowNumber        Int  
occurredOn       String?  
description      String  
reference        String?  
movementType     String  
currency         String   @default("ARS")  
amountRaw        String  
categoryId       String?  
category         MovementCategory? @relation(fields: \[categoryId\], references: \[id\], onDelete: SetNull)  
fingerprint      String  
duplicateOrdinal Int      @default(1)  
dedupeKey        String?   @unique  
included         Boolean  @default(true)  
status           String   @default("draft")  
validationError  String?  
originalJson     String  
createdAt        DateTime @default(now())  
updatedAt        DateTime @updatedAt  
acceptedAt       DateTime?

@@unique(\[importId, rowNumber\])  
@@index(\[importId, status\])  
@@index(\[occurredOn\])  
@@index(\[categoryId\])  
@@index(\[fingerprint\])  
}

model CurrencyExchangeRate {  
id            String   @id @default(uuid())  
pair          String   @unique  
rateRaw       String  
effectiveDate String  
source        String   @default("manual")  
status        String   @default("active")  
createdAt     DateTime @default(now())  
updatedAt     DateTime @updatedAt

@@index(\[status\])  
@@index(\[effectiveDate\])  
}

model LocalAppSettings {  
id              String   @id @default("local")  
displayName     String   @default("Javi")  
locale          String   @default("es-AR")  
timezone        String   @default("America/Argentina/Tucuman")  
defaultCurrency String   @default("ARS")  
theme           String   @default("system")  
hideAmounts     Boolean  @default(false)  
createdAt       DateTime @default(now())  
updatedAt       DateTime @updatedAt  
}

model SavingsGoal {  
id              String   @id @default(uuid())  
name            String  
targetAmountRaw String  
currency        String   @default("ARS")  
targetDate      String?  
status          String   @default("active")  
notes           String?  
completedAt     DateTime?  
closedAt        DateTime?  
createdAt       DateTime @default(now())  
updatedAt       DateTime @updatedAt

contributions   GoalContribution\[\]  
activities      GoalActivity\[\]

@@index(\[status\])  
@@index(\[targetDate\])  
@@index(\[currency\])  
}

model GoalContribution {  
id              String   @id @default(uuid())  
goalId          String  
goal            SavingsGoal @relation(fields: \[goalId\], references: \[id\], onDelete: Cascade)  
contributedOn   String  
amountRaw       String  
notes           String?  
referenceType   String?  
referenceId     String?  
referenceLabel  String?  
createdAt       DateTime @default(now())  
updatedAt       DateTime @updatedAt

@@index(\[goalId, contributedOn\])  
@@index(\[referenceType, referenceId\])  
}

model GoalActivity {  
id          String   @id @default(uuid())  
goalId      String  
goal        SavingsGoal @relation(fields: \[goalId\], references: \[id\], onDelete: Cascade)  
kind        String  
detailJson  String?  
createdAt   DateTime @default(now())

@@index(\[goalId, createdAt\])  
}

model CategoryBudget {  
id              String   @id @default(uuid())  
categoryId      String  
category        MovementCategory @relation(fields: \[categoryId\], references: \[id\], onDelete: Restrict)  
currency        String   @default("ARS")  
periodStart     String  
periodEnd       String  
limitAmountRaw  String  
rolloverEnabled Boolean  @default(false)  
status          String   @default("active")  
notes           String?  
createdAt       DateTime @default(now())  
updatedAt       DateTime @updatedAt

@@index(\[status\])  
@@index(\[periodStart, periodEnd\])  
@@index(\[categoryId, currency\])  
}

model FinancialHealthSnapshot {  
id                String   @id @default(uuid())  
periodFrom        String  
periodTo          String  
formulaVersion    String  
sourceFingerprint String  
resultJson        String  
createdAt         DateTime @default(now())

@@unique(\[periodFrom, periodTo, formulaVersion, sourceFingerprint\])  
@@index(\[formulaVersion, createdAt\])  
@@index(\[periodFrom, periodTo\])  
}

model AiAdvisorInteraction {  
id                            String   @id @default(uuid())  
periodFrom                    String  
periodTo                      String  
mode                          String  
question                      String  
currency                      String?  
contextFingerprint            String  
financialHealthFormulaVersion String  
promptVersion                 String  
promptSha256                  String  
provider                      String  
model                         String  
providerRequestId             String  
requestJson                   String  
contextJson                   String  
responseJson                  String  
durationMs                    Int  
createdAt                     DateTime @default(now())

@@index(\[createdAt\])  
@@index(\[periodFrom, periodTo\])  
@@index(\[contextFingerprint\])  
@@index(\[promptVersion\])  
}

model ReconciliationCase {  
id                  String   @id @default(uuid())  
fingerprint         String   @unique  
relationType        String  
status              String   @default("open")  
resolution          String?  
confidence          Int  
title               String  
rationaleJson       String  
suggestedResolution String  
currency            String?  
amountRaw           String?  
occurredOn          String?  
excludedMovementId  String?  
isCurrent           Boolean  @default(true)  
lastDetectedAt      DateTime @default(now())  
resolvedAt          DateTime?  
createdAt           DateTime @default(now())  
updatedAt           DateTime @updatedAt

participants ReconciliationParticipant\[\]

@@index(\[status, relationType\])  
@@index(\[isCurrent, status\])  
@@index(\[excludedMovementId\])  
@@index(\[lastDetectedAt\])  
}

model ReconciliationParticipant {  
id           String   @id @default(uuid())  
caseId       String  
case         ReconciliationCase @relation(fields: \[caseId\], references: \[id\], onDelete: Cascade)  
role         String  
entityKey    String  
entityType   String  
sourceType   String  
sourceId     String  
movementId   String?  
description  String  
occurredOn   String?  
currency     String?  
amountRaw    String?  
metadataJson String  
createdAt    DateTime @default(now())

@@unique(\[caseId, entityKey\])  
@@index(\[caseId, role\])  
@@index(\[movementId\])  
@@index(\[entityType, sourceId\])  
}

model MonthClose {  
  id                String   @id @default(uuid())  
  monthKey          String  
  version           Int      @default(1)  
  activeKey         String?  @unique  
  status            String   @default("closed")  
  summaryJson       String  
  snapshotJson      String  
  sourceFingerprint String  
  closedAt          DateTime @default(now())  
  reopenedAt        DateTime?  
  createdAt         DateTime @default(now())  
  updatedAt         DateTime @updatedAt

  activities MonthCloseActivity\[\]

  @@unique(\[monthKey, version\])  
  @@index(\[monthKey, status\])  
  @@index(\[status, closedAt\])  
}

model MonthCloseActivity {  
  id         String   @id @default(uuid())  
  closeId    String  
  close      MonthClose @relation(fields: \[closeId\], references: \[id\], onDelete: Cascade)  
  kind       String  
  detailJson String?  
  createdAt  DateTime @default(now())

  @@index(\[closeId, createdAt\])  
}

model BackupArchive {  
  id           String   @id @default(uuid())  
  fileName     String   @unique  
  storagePath  String  
  kind         String   @default("manual")  
  status       String   @default("created")  
  sizeBytes    Int  
  sha256       String  
  manifestJson String  
  createdAt    DateTime @default(now())  
  validatedAt  DateTime?  
  restoredAt   DateTime?

  activities BackupRestoreActivity\[\]

  @@index(\[kind, createdAt\])  
  @@index(\[status, createdAt\])  
}

model BackupRestoreActivity {  
  id         String   @id @default(uuid())  
  backupId   String?  
  backup     BackupArchive? @relation(fields: \[backupId\], references: \[id\], onDelete: SetNull)  
  action     String  
  status     String  
  detailJson String?  
  createdAt  DateTime @default(now())

  @@index(\[backupId, createdAt\])  
  @@index(\[action, status\])  
}  
\`\`\`  
END FILE 03/23: workspace/backend/prisma/schema.prisma

BEGIN FILE 04/23: workspace/backend/src/app.ts  
ACTION: replace | BYTES: 3934 | SHA256: 3e702e89bb9d8ba35150ad80f455a5cd4d33bdd34b417b34cef355e49afdf4ad  
\`\`\`typescript  
import Fastify, { type FastifyInstance } from "fastify";  
import cors from "@fastify/cors";  
import multipart from "@fastify/multipart";  
import { env } from "./config/env.js";  
import { logger } from "./shared/logger.js";  
import { healthRoutes } from "./modules/health/health.routes.js";  
import { cardsRoutes } from "./modules/cards/cards.routes.js";  
import { importsRoutes } from "./modules/imports/imports.routes.js";  
import { importCenterRoutes } from "./modules/import-center/import-center.routes.js";  
import { reconciliationRoutes } from "./modules/reconciliation/reconciliation.routes.js";  
import { manualPurchasesRoutes } from "./modules/manual-purchases/manual-purchases.routes.js";  
import { incomesRoutes } from "./modules/incomes/incomes.routes.js";  
import { movementsRoutes } from "./modules/movements/movements.routes.js";  
import { debitImportsRoutes } from "./modules/debit-imports/debit-imports.routes.js";  
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";  
import { futureRoutes } from "./modules/future/future.routes.js";  
import { reportsRoutes } from "./modules/reports/reports.routes.js";  
import { settingsRoutes } from "./modules/settings/settings.routes.js";  
import { goalsRoutes } from "./modules/goals/goals.routes.js";  
import { budgetsRoutes } from "./modules/budgets/budgets.routes.js";  
import { globalSearchRoutes } from "./modules/global-search/global-search.routes.js";  
import { financialHealthRoutes } from "./modules/financial-health/financial-health.routes.js";  
import { aiAdvisorRoutes } from "./modules/ai-advisor/ai-advisor.routes.js";  
import { salaryReceiptsRoutes } from "./modules/salary-receipts/salary-receipts.routes.js";  
import { monthCloseRoutes } from "./modules/month-close/month-close.routes.js";  
import { backupRestoreRoutes } from "./modules/backup-restore/backup-restore.routes.js";  
import { AppError } from "./shared/errors.js";

export async function buildApp(): Promise\<FastifyInstance\> {  
  const app \= Fastify({  
    logger: false,  
  });

  await app.register(cors, {  
    origin: true,  
    credentials: true,  
  });

  await app.register(multipart, {  
    limits: {  
      fileSize: env.MAX\_UPLOAD\_BYTES,  
    },  
  });

  app.setErrorHandler((error, request, reply) \=\> {  
    logger.error(  
      {  
        error: String(error),  
        url: request.url,  
        method: request.method,  
      },  
      "Request error",  
    );

    if (error instanceof AppError) {  
      return reply.status(error.statusCode).send({  
        code: error.code,  
        message: error.message,  
      });  
    }

    const validationError \= error as {  
      validation?: unknown;  
      message?: string;  
    };  
    if (validationError.validation) {  
      return reply.status(400).send({  
        code: "VALIDATION\_ERROR",  
        message: validationError.message || "Validation error",  
      });  
    }

    return reply.status(500).send({  
      code: "INTERNAL\_ERROR",  
      message:  
        env.NODE\_ENV \=== "development"  
          ? String((error as { message?: string }).message || error)  
          : "Internal server error",  
    });  
  });

  await app.register(healthRoutes);  
  await app.register(cardsRoutes);  
  await app.register(importsRoutes);  
  await app.register(importCenterRoutes);  
  await app.register(reconciliationRoutes);  
  await app.register(manualPurchasesRoutes);  
  await app.register(incomesRoutes);  
  await app.register(movementsRoutes);  
  await app.register(debitImportsRoutes);  
  await app.register(dashboardRoutes);  
  await app.register(futureRoutes);  
  await app.register(reportsRoutes);  
  await app.register(settingsRoutes);  
  await app.register(goalsRoutes);  
  await app.register(budgetsRoutes);  
  await app.register(globalSearchRoutes);  
  await app.register(financialHealthRoutes);  
  await app.register(aiAdvisorRoutes);  
  await app.register(salaryReceiptsRoutes);  
  await app.register(monthCloseRoutes);  
  await app.register(backupRestoreRoutes);

  return app;  
}  
\`\`\`  
END FILE 04/23: workspace/backend/src/app.ts

BEGIN FILE 05/23: workspace/backend/src/modules/backup-restore/backup-restore.controller.ts  
ACTION: new | BYTES: 2140 | SHA256: c3154e650cdae736ce58d1648a634db4096c3a98585d5c8c174ffb3ee49e1ceb  
\`\`\`typescript  
import type { FastifyInstance, FastifyPluginAsync } from "fastify";  
import { FileRequiredError, FileTooLargeError, ValidationError } from "../../shared/errors.js";  
import { validateData } from "../../shared/validation.js";  
import { backupParamsSchema, createBackupSchema } from "./backup-restore.schemas.js";  
import { backupRestoreService } from "./backup-restore.service.js";

export const backupRestoreController: FastifyPluginAsync \= async (  
  app: FastifyInstance,  
) \=\> {  
  app.get("/", async (\_request, reply) \=\> {  
    return reply.send(await backupRestoreService.list());  
  });

  app.post("/", async (request, reply) \=\> {  
    const input \= validateData(createBackupSchema, request.body ?? {});  
    return reply.status(201).send(await backupRestoreService.create(input.label));  
  });

  app.get("/:id/download", async (request, reply) \=\> {  
    const params \= validateData(backupParamsSchema, request.params);  
    const download \= await backupRestoreService.download(params.id);  
    reply.header("Content-Type", "application/octet-stream");  
    reply.header("Content-Disposition", \`attachment; filename="${download.fileName}"\`);  
    return reply.send(download.buffer);  
  });

  app.post("/:id/validate", async (request, reply) \=\> {  
    const params \= validateData(backupParamsSchema, request.params);  
    return reply.send(await backupRestoreService.validateStored(params.id));  
  });

  app.post("/restore", async (request, reply) \=\> {  
    const part \= await request.file({ limits: { fileSize: 256 \* 1024 \* 1024 } });  
    if (\!part) throw new FileRequiredError();  
    if (\!part.filename.toLowerCase().endsWith(".cajaapp-backup")) {  
      throw new ValidationError("El archivo debe usar la extensión .cajaapp-backup.");  
    }  
    const maxRestoreBytes \= 256 \* 1024 \* 1024;  
    let buffer: Buffer;  
    try {  
      buffer \= await part.toBuffer();  
    } catch (error) {  
      if (part.file.truncated) throw new FileTooLargeError(maxRestoreBytes);  
      throw error;  
    }  
    if (part.file.truncated) throw new FileTooLargeError(maxRestoreBytes);  
    return reply.send(await backupRestoreService.restore(part.filename, buffer));  
  });  
};  
\`\`\`  
END FILE 05/23: workspace/backend/src/modules/backup-restore/backup-restore.controller.ts

BEGIN FILE 06/23: workspace/backend/src/modules/backup-restore/backup-restore.routes.ts  
ACTION: new | BYTES: 288 | SHA256: 95cdc1496b3662c28317eced5abde5b7f82179fef75c028b5852470e34be2458  
\`\`\`typescript  
import type { FastifyInstance } from "fastify";  
import { backupRestoreController } from "./backup-restore.controller.js";

export async function backupRestoreRoutes(app: FastifyInstance): Promise\<void\> {  
  await app.register(backupRestoreController, { prefix: "/api/backup-restore" });  
}  
\`\`\`  
END FILE 06/23: workspace/backend/src/modules/backup-restore/backup-restore.routes.ts

BEGIN FILE 07/23: workspace/backend/src/modules/backup-restore/backup-restore.schemas.ts  
ACTION: new | BYTES: 266 | SHA256: 33c65fa5d05d7db7564635cac6686cf51ba8f0357711864ef21efea50a6d4426  
\`\`\`typescript  
import { z } from "zod";

export const backupParamsSchema \= z.object({  
  id: z.string().uuid(),  
});

export const createBackupSchema \= z.object({  
  label: z.string().trim().max(80).optional(),  
});

export type CreateBackupInput \= z.infer\<typeof createBackupSchema\>;  
\`\`\`  
END FILE 07/23: workspace/backend/src/modules/backup-restore/backup-restore.schemas.ts

BEGIN FILE 08/23: workspace/backend/src/modules/backup-restore/backup-restore.service.ts  
ACTION: new | BYTES: 23700 | SHA256: 8a096a55ad46751718703a07ec818c8fdea02a9fabf8bce2f7d600fae2b7f4db  
\`\`\`typescript  
import { spawn } from "node:child\_process";  
import { createHash, randomUUID } from "node:crypto";  
import fs from "node:fs/promises";  
import os from "node:os";  
import path from "node:path";  
import { connectDatabase, disconnectDatabase, prisma } from "../../db/prisma.js";  
import { env } from "../../config/env.js";  
import { NotFoundError, ValidationError } from "../../shared/errors.js";

const PACKAGE\_VERSION \= "cajaapp-backup-v1";  
const EXACT\_ENTRIES \= \["database.sqlite", "manifest.json"\] as const;  
const REQUIRED\_TABLES \= \[  
  "\_prisma\_migrations",  
  "LocalAppSettings",  
  "ReconciliationCase",  
  "MonthClose",  
  "BackupArchive",  
  "BackupRestoreActivity",  
\] as const;

export interface BackupManifest {  
  format: typeof PACKAGE\_VERSION;  
  createdAt: string;  
  application: "CajaApp V3";  
  database: {  
    entry: "database.sqlite";  
    sha256: string;  
    sizeBytes: number;  
    integrityCheck: "ok";  
    foreignKeyViolations: number;  
    tables: string\[\];  
    migrations: string\[\];  
  };  
  source: {  
    schemaSha256: string;  
    migrationsSha256: string;  
    nodeVersion: string;  
  };  
}

interface ValidationResult {  
  manifest: BackupManifest;  
  extractedDatabasePath: string;  
  packageSha256: string;  
  packageSizeBytes: number;  
  temporaryDirectory: string;  
}

let operationQueue: Promise\<void\> \= Promise.resolve();

async function serialized\<T\>(work: () \=\> Promise\<T\>): Promise\<T\> {  
  const previous \= operationQueue.catch(() \=\> undefined);  
  let release\!: () \=\> void;  
  operationQueue \= new Promise\<void\>((resolve) \=\> {  
    release \= resolve;  
  });  
  await previous;  
  try {  
    return await work();  
  } finally {  
    release();  
  }  
}

function sha256(data: Buffer | string): string {  
  return createHash("sha256").update(data).digest("hex");  
}

export function canonicalBackupFileName(date \= new Date(), suffix \= "manual"): string {  
  const stamp \= date.toISOString().replace(/\[:.\]/g, "-");  
  const safeSuffix \= suffix  
    .normalize("NFD")  
    .replace(/\[\\u0300-\\u036f\]/g, "")  
    .toLowerCase()  
    .replace(/\[^a-z0-9\]+/g, "-")  
    .replace(/^-|-$/g, "")  
    .slice(0, 40\) || "manual";  
  return \`cajaapp-v3-${stamp}-${safeSuffix}.cajaapp-backup\`;  
}

function databasePath(): string {  
  const value \= env.DATABASE\_URL.replace(/^file:/, "");  
  if (path.isAbsolute(value)) return path.normalize(value);  
  return path.resolve(process.cwd(), "prisma", value.replace(/^\[.\]\[\\\\/\]/, ""));  
}

function schemaPath(): string {  
  return path.resolve(process.cwd(), "prisma", "schema.prisma");  
}

function migrationsPath(): string {  
  return path.resolve(process.cwd(), "prisma", "migrations");  
}

function backupDirectory(): string {  
  const localAppData \= process.env.LOCALAPPDATA?.trim() ||  
    path.join(process.env.USERPROFILE?.trim() || os.homedir(), "AppData", "Local");  
  return path.join(localAppData, "CajaAppV3", "backups");  
}

async function hashFile(filePath: string): Promise\<string\> {  
  return sha256(await fs.readFile(filePath));  
}

async function hashDirectory(directory: string): Promise\<string\> {  
  const hash \= createHash("sha256");  
  async function visit(current: string): Promise\<void\> {  
    const entries \= await fs.readdir(current, { withFileTypes: true });  
    entries.sort((left, right) \=\> left.name.localeCompare(right.name));  
    for (const entry of entries) {  
      const absolute \= path.join(current, entry.name);  
      const relative \= path.relative(directory, absolute).replace(/\\\\/g, "/");  
      if (entry.isDirectory()) {  
        hash.update(\`D\\0${relative}\\0\`);  
        await visit(absolute);  
      } else if (entry.isFile()) {  
        hash.update(\`F\\0${relative}\\0\`);  
        hash.update(await fs.readFile(absolute));  
        hash.update("\\0");  
      }  
    }  
  }  
  await visit(directory);  
  return hash.digest("hex");  
}

async function runPython(script: string, args: string\[\], timeoutMs \= 120\_000): Promise\<string\> {  
  return new Promise((resolve, reject) \=\> {  
    const child \= spawn(env.PYTHON\_EXECUTABLE, \["-c", script, ...args\], {  
      cwd: process.cwd(),  
      windowsHide: true,  
      stdio: \["ignore", "pipe", "pipe"\],  
    });  
    let stdout \= "";  
    let stderr \= "";  
    const timer \= setTimeout(() \=\> {  
      child.kill();  
      reject(new ValidationError("La operación SQLite excedió el tiempo máximo."));  
    }, timeoutMs);  
    child.stdout.setEncoding("utf8");  
    child.stderr.setEncoding("utf8");  
    child.stdout.on("data", (chunk) \=\> { stdout \+= chunk; });  
    child.stderr.on("data", (chunk) \=\> { stderr \+= chunk; });  
    child.on("error", (error) \=\> {  
      clearTimeout(timer);  
      reject(new ValidationError(\`No se pudo ejecutar Python: ${String(error)}\`));  
    });  
    child.on("close", (code) \=\> {  
      clearTimeout(timer);  
      if (code \!== 0\) {  
        reject(new ValidationError(stderr.trim() || \`Python terminó con código ${code}.\`));  
        return;  
      }  
      resolve(stdout.trim());  
    });  
  });  
}

const SNAPSHOT\_SCRIPT \= String.raw\`  
import json, sqlite3, sys  
source\_path, target\_path \= sys.argv\[1\], sys.argv\[2\]  
source \= sqlite3.connect(f"file:{source\_path}?mode=ro", uri=True)  
target \= sqlite3.connect(target\_path)  
try:  
    source.backup(target)  
    target.execute("PRAGMA wal\_checkpoint(TRUNCATE)")  
    integrity \= target.execute("PRAGMA integrity\_check").fetchall()  
    foreign\_keys \= target.execute("PRAGMA foreign\_key\_check").fetchall()  
    tables \= sorted(row\[0\] for row in target.execute("SELECT name FROM sqlite\_master WHERE type='table'"))  
    migrations \= \[\]  
    if '\_prisma\_migrations' in tables:  
        migrations \= \[row\[0\] for row in target.execute("SELECT migration\_name FROM \_prisma\_migrations WHERE finished\_at IS NOT NULL ORDER BY migration\_name")\]  
    target.commit()  
    print(json.dumps({"integrity": \[row\[0\] for row in integrity\], "foreignKeys": len(foreign\_keys), "tables": tables, "migrations": migrations}))  
finally:  
    target.close()  
    source.close()  
\`;

const INSPECT\_SCRIPT \= String.raw\`  
import json, sqlite3, sys  
path \= sys.argv\[1\]  
connection \= sqlite3.connect(f"file:{path}?mode=ro", uri=True)  
try:  
    integrity \= connection.execute("PRAGMA integrity\_check").fetchall()  
    foreign\_keys \= connection.execute("PRAGMA foreign\_key\_check").fetchall()  
    tables \= sorted(row\[0\] for row in connection.execute("SELECT name FROM sqlite\_master WHERE type='table'"))  
    migrations \= \[\]  
    if '\_prisma\_migrations' in tables:  
        migrations \= \[row\[0\] for row in connection.execute("SELECT migration\_name FROM \_prisma\_migrations WHERE finished\_at IS NOT NULL ORDER BY migration\_name")\]  
    print(json.dumps({"integrity": \[row\[0\] for row in integrity\], "foreignKeys": len(foreign\_keys), "tables": tables, "migrations": migrations}))  
finally:  
    connection.close()  
\`;

const CREATE\_PACKAGE\_SCRIPT \= String.raw\`  
import sys, zipfile  
package\_path, database\_path, manifest\_path \= sys.argv\[1:4\]  
with zipfile.ZipFile(package\_path, 'w', compression=zipfile.ZIP\_DEFLATED, compresslevel=9) as archive:  
    archive.write(database\_path, 'database.sqlite')  
    archive.write(manifest\_path, 'manifest.json')  
\`;

const EXTRACT\_PACKAGE\_SCRIPT \= String.raw\`  
import json, pathlib, sys, zipfile  
package\_path, output\_dir \= sys.argv\[1:3\]  
expected \= {'database.sqlite', 'manifest.json'}  
with zipfile.ZipFile(package\_path, 'r') as archive:  
    names \= archive.namelist()  
    normalized \= set()  
    for name in names:  
        pure \= pathlib.PurePosixPath(name)  
        if pure.is\_absolute() or '..' in pure.parts or '\\\\' in name:  
            raise RuntimeError('Entrada insegura en el paquete')  
        normalized.add(str(pure))  
    if normalized \!= expected or len(names) \!= 2:  
        raise RuntimeError('El paquete debe contener exactamente database.sqlite y manifest.json')  
    for member in names:  
        archive.extract(member, output\_dir)  
print(json.dumps(sorted(normalized)))  
\`;

function assertInspection(value: unknown): {  
  integrity: string\[\];  
  foreignKeys: number;  
  tables: string\[\];  
  migrations: string\[\];  
} {  
  const inspection \= value as {  
    integrity?: unknown;  
    foreignKeys?: unknown;  
    tables?: unknown;  
    migrations?: unknown;  
  };  
  const integrity \= Array.isArray(inspection.integrity)  
    ? inspection.integrity.map(String)  
    : \[\];  
  const foreignKeys \= Number(inspection.foreignKeys);  
  const tables \= Array.isArray(inspection.tables) ? inspection.tables.map(String) : \[\];  
  const migrations \= Array.isArray(inspection.migrations)  
    ? inspection.migrations.map(String)  
    : \[\];  
  if (integrity.length \!== 1 || integrity\[0\] \!== "ok") {  
    throw new ValidationError(\`PRAGMA integrity\_check falló: ${integrity.join(", ") || "sin resultado"}.\`);  
  }  
  if (\!Number.isInteger(foreignKeys) || foreignKeys \!== 0\) {  
    throw new ValidationError(\`PRAGMA foreign\_key\_check detectó ${foreignKeys} violaciones.\`);  
  }  
  for (const table of REQUIRED\_TABLES) {  
    if (\!tables.includes(table)) throw new ValidationError(\`El backup no contiene la tabla requerida ${table}.\`);  
  }  
  return { integrity, foreignKeys, tables, migrations };  
}

export function assertBackupManifest(value: unknown): BackupManifest {  
  if (\!value || typeof value \!== "object" || Array.isArray(value)) {  
    throw new ValidationError("manifest.json no contiene un objeto válido.");  
  }  
  const manifest \= value as Partial\<BackupManifest\>;  
  if (manifest.format \!== PACKAGE\_VERSION || manifest.application \!== "CajaApp V3") {  
    throw new ValidationError("Versión o aplicación del backup no soportada.");  
  }  
  if (\!manifest.database || manifest.database.entry \!== "database.sqlite") {  
    throw new ValidationError("El manifiesto no referencia database.sqlite.");  
  }  
  if (\!/^\[a-f0-9\]{64}$/.test(manifest.database.sha256 || "")) {  
    throw new ValidationError("Checksum SHA-256 de la base inválido.");  
  }  
  if (\!manifest.createdAt || Number.isNaN(Date.parse(manifest.createdAt))) {  
    throw new ValidationError("La fecha de creación del manifiesto es inválida.");  
  }  
  if (\!Number.isSafeInteger(manifest.database.sizeBytes) || manifest.database.sizeBytes \<= 0\) {  
    throw new ValidationError("El tamaño declarado de la base es inválido.");  
  }  
  if (manifest.database.integrityCheck \!== "ok" || manifest.database.foreignKeyViolations \!== 0\) {  
    throw new ValidationError("El manifiesto no acredita integridad SQLite y claves foráneas.");  
  }  
  if (\!Array.isArray(manifest.database.tables) || \!Array.isArray(manifest.database.migrations)) {  
    throw new ValidationError("El manifiesto no contiene inventarios de tablas y migraciones.");  
  }  
  if (\!manifest.source || \!/^\[a-f0-9\]{64}$/.test(manifest.source.schemaSha256 || "") ||  
      \!/^\[a-f0-9\]{64}$/.test(manifest.source.migrationsSha256 || "") ||  
      typeof manifest.source.nodeVersion \!== "string") {  
    throw new ValidationError("Checksums de schema o migraciones inválidos.");  
  }  
  return manifest as BackupManifest;  
}

function mapArchive(record: any) {  
  return {  
    id: record.id,  
    fileName: record.fileName,  
    kind: record.kind,  
    status: record.status,  
    sizeBytes: record.sizeBytes,  
    sha256: record.sha256,  
    manifest: JSON.parse(record.manifestJson) as BackupManifest,  
    createdAt: record.createdAt.toISOString(),  
    validatedAt: record.validatedAt?.toISOString() ?? null,  
    restoredAt: record.restoredAt?.toISOString() ?? null,  
  };  
}

export class BackupRestoreService {  
  async list() {  
    const \[archives, activities\] \= await Promise.all(\[  
      prisma.backupArchive.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),  
      prisma.backupRestoreActivity.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),  
    \]);  
    return {  
      items: archives.map(mapArchive),  
      activities: activities.map((activity: any) \=\> ({  
        id: activity.id,  
        backupId: activity.backupId,  
        action: activity.action,  
        status: activity.status,  
        detail: activity.detailJson ? JSON.parse(activity.detailJson) : null,  
        createdAt: activity.createdAt.toISOString(),  
      })),  
      backupDirectory: backupDirectory(),  
    };  
  }

  async create(label?: string) {  
    return serialized(() \=\> this.createUnlocked("manual", label));  
  }

  private async createUnlocked(kind: "manual" | "pre\_restore", label?: string) {  
    const directory \= backupDirectory();  
    await fs.mkdir(directory, { recursive: true });  
    const tempDirectory \= await fs.mkdtemp(path.join(os.tmpdir(), "cajaapp-backup-create-"));  
    const databaseSnapshot \= path.join(tempDirectory, "database.sqlite");  
    const manifestPath \= path.join(tempDirectory, "manifest.json");  
    const fileName \= canonicalBackupFileName(new Date(), label || kind);  
    const packagePath \= path.join(directory, fileName);

    try {  
      const inspection \= assertInspection(  
        JSON.parse(await runPython(SNAPSHOT\_SCRIPT, \[databasePath(), databaseSnapshot\])),  
      );  
      const databaseBytes \= await fs.readFile(databaseSnapshot);  
      const manifest: BackupManifest \= {  
        format: PACKAGE\_VERSION,  
        createdAt: new Date().toISOString(),  
        application: "CajaApp V3",  
        database: {  
          entry: "database.sqlite",  
          sha256: sha256(databaseBytes),  
          sizeBytes: databaseBytes.byteLength,  
          integrityCheck: "ok",  
          foreignKeyViolations: 0,  
          tables: inspection.tables,  
          migrations: inspection.migrations,  
        },  
        source: {  
          schemaSha256: await hashFile(schemaPath()),  
          migrationsSha256: await hashDirectory(migrationsPath()),  
          nodeVersion: process.version,  
        },  
      };  
      await fs.writeFile(manifestPath, \`${JSON.stringify(manifest, null, 2)}\\n\`, "utf8");  
      await runPython(CREATE\_PACKAGE\_SCRIPT, \[packagePath, databaseSnapshot, manifestPath\]);  
      const packageBytes \= await fs.readFile(packagePath);  
      const archive \= await prisma.backupArchive.create({  
        data: {  
          fileName,  
          storagePath: packagePath,  
          kind,  
          status: "created",  
          sizeBytes: packageBytes.byteLength,  
          sha256: sha256(packageBytes),  
          manifestJson: JSON.stringify(manifest),  
          activities: {  
            create: {  
              action: "create",  
              status: "success",  
              detailJson: JSON.stringify({ kind, label: label || null }),  
            },  
          },  
        },  
      });  
      return mapArchive(archive);  
    } finally {  
      await fs.rm(tempDirectory, { recursive: true, force: true });  
    }  
  }

  async download(backupId: string): Promise\<{ fileName: string; buffer: Buffer }\> {  
    return serialized(async () \=\> {  
      const record \= await prisma.backupArchive.findUnique({ where: { id: backupId } });  
      if (\!record) throw new NotFoundError("Backup archive");  
      const buffer \= await fs.readFile(record.storagePath).catch(() \=\> null);  
      if (\!buffer) throw new ValidationError("El archivo físico del backup ya no está disponible.");  
      if (sha256(buffer) \!== record.sha256) throw new ValidationError("El archivo almacenado cambió desde su creación.");  
      return { fileName: record.fileName, buffer };  
    });  
  }

  async validateStored(backupId: string) {  
    return serialized(async () \=\> {  
      const record \= await prisma.backupArchive.findUnique({ where: { id: backupId } });  
      if (\!record) throw new NotFoundError("Backup archive");  
      const validated \= await this.validatePackage(record.storagePath);  
      try {  
        await prisma.backupArchive.update({  
          where: { id: backupId },  
          data: {  
            status: "validated",  
            validatedAt: new Date(),  
            activities: {  
              create: { action: "validate", status: "success", detailJson: JSON.stringify({ packageSha256: validated.packageSha256 }) },  
            },  
          },  
        });  
        return { valid: true, manifest: validated.manifest, packageSha256: validated.packageSha256 };  
      } finally {  
        await fs.rm(validated.temporaryDirectory, { recursive: true, force: true });  
      }  
    });  
  }

  private async validatePackage(packagePath: string): Promise\<ValidationResult\> {  
    const packageBytes \= await fs.readFile(packagePath).catch(() \=\> null);  
    if (\!packageBytes) throw new ValidationError("No se pudo leer el paquete de backup.");  
    const temporaryDirectory \= await fs.mkdtemp(path.join(os.tmpdir(), "cajaapp-backup-validate-"));  
    try {  
      const entries \= JSON.parse(await runPython(EXTRACT\_PACKAGE\_SCRIPT, \[packagePath, temporaryDirectory\])) as string\[\];  
      if (entries.join("|") \!== EXACT\_ENTRIES.slice().sort().join("|")) {  
        throw new ValidationError("Entradas inesperadas en el backup.");  
      }  
      const extractedDatabasePath \= path.join(temporaryDirectory, "database.sqlite");  
      const manifest \= assertBackupManifest(  
        JSON.parse(await fs.readFile(path.join(temporaryDirectory, "manifest.json"), "utf8")),  
      );  
      const databaseBytes \= await fs.readFile(extractedDatabasePath);  
      if (databaseBytes.byteLength \!== manifest.database.sizeBytes || sha256(databaseBytes) \!== manifest.database.sha256) {  
        throw new ValidationError("El checksum o tamaño de database.sqlite no coincide con el manifiesto.");  
      }  
      const inspection \= assertInspection(  
        JSON.parse(await runPython(INSPECT\_SCRIPT, \[extractedDatabasePath\])),  
      );  
      if (manifest.source.schemaSha256 \!== await hashFile(schemaPath())) {  
        throw new ValidationError("El backup fue creado con un schema.prisma diferente al instalado.");  
      }  
      if (manifest.source.migrationsSha256 \!== await hashDirectory(migrationsPath())) {  
        throw new ValidationError("El backup fue creado con un conjunto de migraciones diferente al instalado.");  
      }  
      const inspectedTables \= \[...inspection.tables\].sort();  
      const declaredTables \= \[...manifest.database.tables\].map(String).sort();  
      if (JSON.stringify(inspectedTables) \!== JSON.stringify(declaredTables)) {  
        throw new ValidationError("El inventario de tablas no coincide con database.sqlite.");  
      }  
      const inspectedMigrations \= \[...inspection.migrations\].sort();  
      const declaredMigrations \= \[...manifest.database.migrations\].map(String).sort();  
      if (JSON.stringify(inspectedMigrations) \!== JSON.stringify(declaredMigrations)) {  
        throw new ValidationError("El inventario de migraciones no coincide con database.sqlite.");  
      }  
      return {  
        manifest,  
        extractedDatabasePath,  
        packageSha256: sha256(packageBytes),  
        packageSizeBytes: packageBytes.byteLength,  
        temporaryDirectory,  
      };  
    } catch (error) {  
      await fs.rm(temporaryDirectory, { recursive: true, force: true });  
      throw error;  
    }  
  }

  async restore(originalFileName: string, buffer: Buffer) {  
    return serialized(async () \=\> {  
      const uploadDirectory \= await fs.mkdtemp(path.join(os.tmpdir(), "cajaapp-restore-upload-"));  
      const uploadedPath \= path.join(uploadDirectory, path.basename(originalFileName));  
      await fs.writeFile(uploadedPath, buffer);  
      await fs.mkdir(backupDirectory(), { recursive: true });  
      const persistedFileName \= canonicalBackupFileName(new Date(), "restored");  
      const persistedPackagePath \= path.join(backupDirectory(), persistedFileName);  
      let validation: ValidationResult | null \= null;  
      let safety: ReturnType\<typeof mapArchive\> | null \= null;  
      const dbPath \= databasePath();  
      const originalPath \= \`${dbPath}.restore-original-${randomUUID()}\`;  
      const candidatePath \= \`${dbPath}.restore-candidate-${randomUUID()}\`;  
      let originalMoved \= false;  
      let candidateMoved \= false;  
      let restoreSucceeded \= false;

      try {  
        validation \= await this.validatePackage(uploadedPath);  
        await fs.copyFile(uploadedPath, persistedPackagePath);  
        safety \= await this.createUnlocked("pre\_restore", \`before-${path.basename(originalFileName, ".cajaapp-backup")}\`);  
        await fs.copyFile(validation.extractedDatabasePath, candidatePath);  
        await disconnectDatabase();  
        await fs.rm(\`${dbPath}-wal\`, { force: true });  
        await fs.rm(\`${dbPath}-shm\`, { force: true });  
        await fs.rename(dbPath, originalPath);  
        originalMoved \= true;  
        await fs.rename(candidatePath, dbPath);  
        candidateMoved \= true;  
        await connectDatabase();

        const postInspection \= assertInspection(  
          JSON.parse(await runPython(INSPECT\_SCRIPT, \[dbPath\])),  
        );  
        const now \= new Date();  
        const restoredArchive \= await prisma.backupArchive.upsert({  
          where: { fileName: persistedFileName },  
          create: {  
            fileName: persistedFileName,  
            storagePath: persistedPackagePath,  
            kind: "restored\_upload",  
            status: "restored",  
            sizeBytes: validation.packageSizeBytes,  
            sha256: validation.packageSha256,  
            manifestJson: JSON.stringify(validation.manifest),  
            validatedAt: now,  
            restoredAt: now,  
          },  
          update: { status: "restored", validatedAt: now, restoredAt: now },  
        });  
        const persistedSafety \= await prisma.backupArchive.upsert({  
          where: { fileName: safety.fileName },  
          create: {  
            fileName: safety.fileName,  
            storagePath: path.join(backupDirectory(), safety.fileName),  
            kind: "pre\_restore",  
            status: "created",  
            sizeBytes: safety.sizeBytes,  
            sha256: safety.sha256,  
            manifestJson: JSON.stringify(safety.manifest),  
          },  
          update: {},  
        });  
        await prisma.backupRestoreActivity.create({  
          data: {  
            backupId: restoredArchive.id,  
            action: "restore",  
            status: "success",  
            detailJson: JSON.stringify({  
              sourceFileName: originalFileName,  
              persistedFileName,  
              preRestoreBackupId: persistedSafety.id,  
              preRestoreFileName: safety.fileName,  
              tables: postInspection.tables.length,  
            }),  
          },  
        });  
        await fs.rm(originalPath, { force: true });  
        originalMoved \= false;  
        restoreSucceeded \= true;  
        return {  
          restored: true,  
          backup: mapArchive(restoredArchive),  
          preRestoreBackup: mapArchive(persistedSafety),  
        };  
      } catch (error) {  
        await disconnectDatabase().catch(() \=\> undefined);  
        if (candidateMoved) await fs.rm(dbPath, { force: true }).catch(() \=\> undefined);  
        if (originalMoved) await fs.rename(originalPath, dbPath).catch(() \=\> undefined);  
        await fs.rm(candidatePath, { force: true }).catch(() \=\> undefined);  
        await fs.rm(\`${dbPath}-wal\`, { force: true }).catch(() \=\> undefined);  
        await fs.rm(\`${dbPath}-shm\`, { force: true }).catch(() \=\> undefined);  
        await connectDatabase().catch(() \=\> undefined);  
        await prisma.backupRestoreActivity.create({  
          data: {  
            action: "restore",  
            status: "failed",  
            detailJson: JSON.stringify({ fileName: originalFileName, error: String(error) }),  
          },  
        }).catch(() \=\> undefined);  
        throw error;  
      } finally {  
        if (validation) await fs.rm(validation.temporaryDirectory, { recursive: true, force: true });  
        await fs.rm(uploadDirectory, { recursive: true, force: true });  
        if (\!restoreSucceeded) await fs.rm(persistedPackagePath, { force: true }).catch(() \=\> undefined);  
        await fs.rm(candidatePath, { force: true }).catch(() \=\> undefined);  
        await fs.rm(originalPath, { force: true }).catch(() \=\> undefined);  
      }  
    });  
  }  
}

export const backupRestoreService \= new BackupRestoreService();  
\`\`\`  
END FILE 08/23: workspace/backend/src/modules/backup-restore/backup-restore.service.ts

BEGIN FILE 09/23: workspace/backend/src/modules/month-close/month-close.controller.ts  
ACTION: new | BYTES: 1394 | SHA256: 18c1f7588e10057df17879bfced157766540ebc897d7414e4823bc082c3feaec  
\`\`\`typescript  
import type { FastifyInstance, FastifyPluginAsync } from "fastify";  
import { validateData } from "../../shared/validation.js";  
import {  
  createMonthCloseSchema,  
  listMonthCloseQuerySchema,  
  monthCloseParamsSchema,  
} from "./month-close.schemas.js";  
import { monthCloseService } from "./month-close.service.js";

export const monthCloseController: FastifyPluginAsync \= async (  
  app: FastifyInstance,  
) \=\> {  
  app.get("/", async (request, reply) \=\> {  
    const query \= validateData(listMonthCloseQuerySchema, request.query);  
    return reply.send(  
      await monthCloseService.list({  
        monthKey: query.monthKey,  
        status: query.status ?? "all",  
        limit: query.limit ? Number(query.limit) : 25,  
        offset: query.offset ? Number(query.offset) : 0,  
      }),  
    );  
  });

  app.post("/", async (request, reply) \=\> {  
    const input \= validateData(createMonthCloseSchema, request.body);  
    return reply.status(201).send(await monthCloseService.create(input.monthKey));  
  });

  app.get("/:id", async (request, reply) \=\> {  
    const params \= validateData(monthCloseParamsSchema, request.params);  
    return reply.send(await monthCloseService.detail(params.id));  
  });

  app.post("/:id/reopen", async (request, reply) \=\> {  
    const params \= validateData(monthCloseParamsSchema, request.params);  
    return reply.send(await monthCloseService.reopen(params.id));  
  });  
};  
\`\`\`  
END FILE 09/23: workspace/backend/src/modules/month-close/month-close.controller.ts

BEGIN FILE 10/23: workspace/backend/src/modules/month-close/month-close.routes.ts  
ACTION: new | BYTES: 273 | SHA256: 161be9e95c29d42597dcc6e6eac70a7fd0e6f0ee344eabc440fc1120c35d6de5  
\`\`\`typescript  
import type { FastifyInstance } from "fastify";  
import { monthCloseController } from "./month-close.controller.js";

export async function monthCloseRoutes(app: FastifyInstance): Promise\<void\> {  
  await app.register(monthCloseController, { prefix: "/api/month-close" });  
}  
\`\`\`  
END FILE 10/23: workspace/backend/src/modules/month-close/month-close.routes.ts

BEGIN FILE 11/23: workspace/backend/src/modules/month-close/month-close.schemas.ts  
ACTION: new | BYTES: 747 | SHA256: b37866a3ba36b3a4f2351a0620b501ae916c18fe709a9d50858da9a43674a3f0  
\`\`\`typescript  
import { z } from "zod";

export const monthKeySchema \= z  
  .string()  
  .regex(/^\\d{4}-(0\[1-9\]|1\[0-2\])$/, "Expected month in YYYY-MM format");

export const createMonthCloseSchema \= z.object({  
  monthKey: monthKeySchema,  
});

export const listMonthCloseQuerySchema \= z.object({  
  monthKey: monthKeySchema.optional(),  
  status: z.enum(\["all", "closed", "reopened"\]).optional(),  
  limit: z.string().regex(/^(?:\[1-9\]|\[1-9\]\\d|100)$/).optional(),  
  offset: z.string().regex(/^(?:0|\[1-9\]\\d{0,5})$/).optional(),  
});

export const monthCloseParamsSchema \= z.object({  
  id: z.string().uuid(),  
});

export type CreateMonthCloseInput \= z.infer\<typeof createMonthCloseSchema\>;  
export type ListMonthCloseQueryInput \= z.infer\<typeof listMonthCloseQuerySchema\>;  
\`\`\`  
END FILE 11/23: workspace/backend/src/modules/month-close/month-close.schemas.ts

BEGIN FILE 12/23: workspace/backend/src/modules/month-close/month-close.service.ts  
ACTION: new | BYTES: 13784 | SHA256: 43c73d4b967af1723bcace8d7a28de846d7b5e5d49183687e5d4fea8279419f9  
\`\`\`typescript  
import { createHash } from "node:crypto";  
import { prisma } from "../../db/prisma.js";  
import { NotFoundError, ValidationError } from "../../shared/errors.js";  
import {  
  movementsService,  
  parseMovementAmount,  
  type NormalizedMovement,  
} from "../movements/movements.service.js";

type Currency \= "ARS" | "USD";  
type LedgerStatus \= "actual" | "pending" | "projected";

type CurrencyTotals \= Record\<Currency, string\>;  
type StatusTotals \= Record\<LedgerStatus | "all", CurrencyTotals\>;

export interface MonthCloseSummary {  
  monthKey: string;  
  movements: number;  
  income: StatusTotals;  
  expense: StatusTotals;  
  balance: StatusTotals;  
  sources: Record\<string, number\>;  
  openReconciliations: number;  
}

export interface MonthCloseSnapshot {  
  version: "month-close-v1";  
  monthKey: string;  
  range: { from: string; to: string };  
  generatedAt: string;  
  summary: MonthCloseSummary;  
  movements: NormalizedMovement\[\];  
  settings: unknown;  
  goals: unknown\[\];  
  budgets: unknown\[\];  
  cardStatements: unknown\[\];  
  salaryReceipts: unknown\[\];  
}

export interface MonthCloseListQuery {  
  monthKey?: string;  
  status: "all" | "closed" | "reopened";  
  limit: number;  
  offset: number;  
}

let monthCloseQueue: Promise\<void\> \= Promise.resolve();

async function serialized\<T\>(work: () \=\> Promise\<T\>): Promise\<T\> {  
  const previous \= monthCloseQueue.catch(() \=\> undefined);  
  let release\!: () \=\> void;  
  monthCloseQueue \= new Promise\<void\>((resolve) \=\> {  
    release \= resolve;  
  });  
  await previous;  
  try {  
    return await work();  
  } finally {  
    release();  
  }  
}

export function monthRange(monthKey: string): { from: string; to: string } {  
  const \[year, month\] \= monthKey.split("-").map(Number);  
  const lastDay \= new Date(Date.UTC(year, month, 0)).getUTCDate();  
  return {  
    from: \`${monthKey}-01\`,  
    to: \`${monthKey}-${String(lastDay).padStart(2, "0")}\`,  
  };  
}

export function emptyStatusTotals(): StatusTotals {  
  const zero \= (): CurrencyTotals \=\> ({ ARS: "0", USD: "0" });  
  return {  
    all: zero(),  
    actual: zero(),  
    pending: zero(),  
    projected: zero(),  
  };  
}

function addCents(target: StatusTotals, status: LedgerStatus, currency: Currency, value: bigint): void {  
  target\[status\]\[currency\] \= (BigInt(target\[status\]\[currency\]) \+ value).toString();  
  target.all\[currency\] \= (BigInt(target.all\[currency\]) \+ value).toString();  
}

function subtractTotals(left: StatusTotals, right: StatusTotals): StatusTotals {  
  const result \= emptyStatusTotals();  
  for (const status of \["all", "actual", "pending", "projected"\] as const) {  
    for (const currency of \["ARS", "USD"\] as const) {  
      result\[status\]\[currency\] \= (  
        BigInt(left\[status\]\[currency\]) \- BigInt(right\[status\]\[currency\])  
      ).toString();  
    }  
  }  
  return result;  
}

export function buildMonthCloseSummary(  
  monthKey: string,  
  movements: NormalizedMovement\[\],  
  openReconciliations \= 0,  
): MonthCloseSummary {  
  const income \= emptyStatusTotals();  
  const expense \= emptyStatusTotals();  
  const sources: Record\<string, number\> \= {};

  for (const movement of movements) {  
    if (movement.status \=== "voided") continue;  
    const status: LedgerStatus \=  
      movement.status \=== "pending"  
        ? "pending"  
        : movement.status \=== "projected"  
          ? "projected"  
          : "actual";  
    const cents \= parseMovementAmount(movement.amount, movement.currency, false);  
    addCents(movement.type \=== "income" ? income : expense, status, movement.currency, cents);  
    sources\[movement.sourceType\] \= (sources\[movement.sourceType\] ?? 0\) \+ 1;  
  }

  return {  
    monthKey,  
    movements: movements.filter((movement) \=\> movement.status \!== "voided").length,  
    income,  
    expense,  
    balance: subtractTotals(income, expense),  
    sources: Object.fromEntries(Object.entries(sources).sort((\[a\], \[b\]) \=\> a.localeCompare(b))),  
    openReconciliations,  
  };  
}

function canonicalValue(value: unknown): unknown {  
  if (value instanceof Date) return value.toISOString();  
  if (Array.isArray(value)) return value.map(canonicalValue);  
  if (value && typeof value \=== "object") {  
    return Object.fromEntries(  
      Object.entries(value as Record\<string, unknown\>)  
        .filter((\[key\]) \=\> key \!== "generatedAt")  
        .sort((\[left\], \[right\]) \=\> left.localeCompare(right))  
        .map((\[key, entry\]) \=\> \[key, canonicalValue(entry)\]),  
    );  
  }  
  return value;  
}

export function buildMonthCloseFingerprint(snapshot: MonthCloseSnapshot): string {  
  return createHash("sha256")  
    .update(JSON.stringify(canonicalValue(snapshot)), "utf8")  
    .digest("hex");  
}

function parseJson\<T\>(value: string): T {  
  return JSON.parse(value) as T;  
}

function mapClose(record: any, latestActiveId: string | null, includeSnapshot: boolean) {  
  return {  
    id: record.id,  
    monthKey: record.monthKey,  
    version: record.version,  
    status: record.status,  
    active: record.activeKey \=== record.monthKey,  
    summary: parseJson\<MonthCloseSummary\>(record.summaryJson),  
    ...(includeSnapshot  
      ? { snapshot: parseJson\<MonthCloseSnapshot\>(record.snapshotJson) }  
      : {}),  
    sourceFingerprint: record.sourceFingerprint,  
    canReopen: record.status \=== "closed" && record.id \=== latestActiveId,  
    closedAt: record.closedAt.toISOString(),  
    reopenedAt: record.reopenedAt?.toISOString() ?? null,  
    createdAt: record.createdAt.toISOString(),  
    updatedAt: record.updatedAt.toISOString(),  
    activities: Array.isArray(record.activities)  
      ? record.activities.map((activity: any) \=\> ({  
          id: activity.id,  
          kind: activity.kind,  
          detail: activity.detailJson ? parseJson(activity.detailJson) : null,  
          createdAt: activity.createdAt.toISOString(),  
        }))  
      : undefined,  
  };  
}

async function latestActiveCloseId(client: any \= prisma): Promise\<string | null\> {  
  const latest \= await client.monthClose.findFirst({  
    where: { status: "closed", activeKey: { not: null } },  
    orderBy: \[{ monthKey: "desc" }, { version: "desc" }\],  
    select: { id: true },  
  });  
  return latest?.id ?? null;  
}

async function buildSnapshot(monthKey: string): Promise\<MonthCloseSnapshot\> {  
  const range \= monthRange(monthKey);  
  const \[movements, settings, goals, budgets, cardStatements, salaryReceipts, openReconciliations\] \=  
    await Promise.all(\[  
      movementsService.getAllMovements({  
        from: range.from,  
        to: range.to,  
        includeProjected: true,  
      }),  
      prisma.localAppSettings.findUnique({ where: { id: "local" } }),  
      prisma.savingsGoal.findMany({  
        orderBy: \[{ createdAt: "asc" }, { id: "asc" }\],  
        include: {  
          contributions: { orderBy: \[{ contributedOn: "asc" }, { createdAt: "asc" }, { id: "asc" }\] },  
          activities: { orderBy: \[{ createdAt: "asc" }, { id: "asc" }\] },  
        },  
      }),  
      prisma.categoryBudget.findMany({  
        where: { periodStart: { lte: range.to }, periodEnd: { gte: range.from } },  
        orderBy: \[{ periodStart: "asc" }, { createdAt: "asc" }, { id: "asc" }\],  
        include: { category: true },  
      }),  
      prisma.cardStatement.findMany({  
        where: {  
          status: "accepted",  
          isActiveForPeriod: true,  
          archivedAt: null,  
          OR: \[  
            { periodKey: monthKey },  
            { currentDueDate: { gte: range.from, lte: range.to } },  
          \],  
        },  
        orderBy: \[{ updatedAt: "asc" }, { id: "asc" }\],  
        include: {  
          groups: { orderBy: \[{ displayOrder: "asc" }, { id: "asc" }\] },  
          rows: { orderBy: \[{ displayOrder: "asc" }, { id: "asc" }\] },  
          projections: { orderBy: \[{ monthKey: "asc" }, { createdAt: "asc" }, { id: "asc" }\] },  
          manualPurchases: { orderBy: \[{ createdAt: "asc" }, { id: "asc" }\] },  
        },  
      }),  
      prisma.salaryReceipt.findMany({  
        where: {  
          status: "accepted",  
          isActiveForPeriod: true,  
          reversedAt: null,  
          periodMonthKey: monthKey,  
        },  
        orderBy: \[{ acceptedAt: "asc" }, { id: "asc" }\],  
        include: { items: { orderBy: \[{ displayOrder: "asc" }, { id: "asc" }\] }, source: true },  
      }),  
      prisma.reconciliationCase.count({ where: { isCurrent: true, status: "open" } }),  
    \]);

  const orderedMovements \= \[...movements\].sort((left, right) \=\>  
    \[left.occurredOn, left.sourceType, left.sourceId, left.id\]  
      .join("|")  
      .localeCompare(\[right.occurredOn, right.sourceType, right.sourceId, right.id\].join("|")),  
  );

  return {  
    version: "month-close-v1",  
    monthKey,  
    range,  
    generatedAt: new Date().toISOString(),  
    summary: buildMonthCloseSummary(monthKey, orderedMovements, openReconciliations),  
    movements: orderedMovements,  
    settings,  
    goals,  
    budgets,  
    cardStatements,  
    salaryReceipts,  
  };  
}

export class MonthCloseService {  
  async list(query: MonthCloseListQuery) {  
    const where: Record\<string, unknown\> \= {};  
    if (query.monthKey) where.monthKey \= query.monthKey;  
    if (query.status \!== "all") where.status \= query.status;

    const \[records, total, latestId\] \= await Promise.all(\[  
      prisma.monthClose.findMany({  
        where,  
        orderBy: \[{ monthKey: "desc" }, { version: "desc" }\],  
        skip: query.offset,  
        take: query.limit,  
        select: {  
          id: true,  
          monthKey: true,  
          version: true,  
          activeKey: true,  
          status: true,  
          summaryJson: true,  
          sourceFingerprint: true,  
          closedAt: true,  
          reopenedAt: true,  
          createdAt: true,  
          updatedAt: true,  
        },  
      }),  
      prisma.monthClose.count({ where }),  
      latestActiveCloseId(),  
    \]);

    return {  
      items: records.map((record: any) \=\> mapClose(record, latestId, false)),  
      pagination: {  
        limit: query.limit,  
        offset: query.offset,  
        total,  
        hasMore: query.offset \+ records.length \< total,  
      },  
    };  
  }

  async detail(closeId: string) {  
    const \[record, latestId\] \= await Promise.all(\[  
      prisma.monthClose.findUnique({  
        where: { id: closeId },  
        include: { activities: { orderBy: { createdAt: "asc" } } },  
      }),  
      latestActiveCloseId(),  
    \]);  
    if (\!record) throw new NotFoundError("Month close");  
    return mapClose(record, latestId, true);  
  }

  async create(monthKey: string) {  
    return serialized(async () \=\> {  
      const snapshot \= await buildSnapshot(monthKey);  
      if (snapshot.summary.openReconciliations \> 0\) {  
        throw new ValidationError(  
          \`No se puede cerrar ${monthKey}: existen ${snapshot.summary.openReconciliations} conciliaciones actuales abiertas.\`,  
        );  
      }  
      const fingerprint \= buildMonthCloseFingerprint(snapshot);

      const created \= await prisma.$transaction(async (tx) \=\> {  
        const \[openReconciliations, active, later, latestVersion\] \= await Promise.all(\[  
          tx.reconciliationCase.count({ where: { isCurrent: true, status: "open" } }),  
          tx.monthClose.findUnique({ where: { activeKey: monthKey }, select: { id: true } }),      tx.monthClose.findFirst({  
            where: { status: "closed", activeKey: { not: null }, monthKey: { gt: monthKey } },  
            orderBy: { monthKey: "asc" },  
            select: { monthKey: true },  
          }),  
          tx.monthClose.findFirst({  
            where: { monthKey },  
            orderBy: { version: "desc" },  
            select: { version: true },  
          }),  
        \]);  
        if (openReconciliations \> 0\) {  
          throw new ValidationError("El cierre fue cancelado porque Conciliación volvió a detectar casos abiertos.");  
        }  
        if (active) throw new ValidationError(\`El mes ${monthKey} ya tiene un cierre activo.\`);  
        if (later) {  
          throw new ValidationError(  
            \`No se puede cerrar ${monthKey} mientras ${later.monthKey} continúe cerrado. Reabra primero los meses posteriores.\`,  
          );  
        }

        const version \= (latestVersion?.version ?? 0\) \+ 1;  
        return tx.monthClose.create({  
          data: {  
            monthKey,  
            version,  
            activeKey: monthKey,  
            status: "closed",  
            summaryJson: JSON.stringify(snapshot.summary),  
            snapshotJson: JSON.stringify(snapshot),  
            sourceFingerprint: fingerprint,  
            activities: {  
              create: {  
                kind: "closed",  
                detailJson: JSON.stringify({ version, fingerprint }),  
              },  
            },  
          },  
        });  
      });

      return this.detail(created.id);  
    });  
  }

  async reopen(closeId: string) {  
    return serialized(async () \=\> {  
      const reopened \= await prisma.$transaction(async (tx) \=\> {  
        const record \= await tx.monthClose.findUnique({ where: { id: closeId } });  
        if (\!record) throw new NotFoundError("Month close");  
        const latestId \= await latestActiveCloseId(tx);  
        if (record.status \!== "closed" || record.activeKey \!== record.monthKey) {  
          throw new ValidationError("El cierre indicado ya no está activo.");  
        }  
        if (latestId \!== record.id) {  
          throw new ValidationError("Sólo se puede reabrir el cierre activo más reciente.");  
        }  
        const reopenedAt \= new Date();  
        return tx.monthClose.update({  
          where: { id: record.id },  
          data: {  
            activeKey: null,  
            status: "reopened",  
            reopenedAt,  
            activities: {  
              create: {  
                kind: "reopened",  
                detailJson: JSON.stringify({ reopenedAt: reopenedAt.toISOString() }),  
              },  
            },  
          },  
        });  
      });  
      return this.detail(reopened.id);  
    });  
  }  
}

export const monthCloseService \= new MonthCloseService();  
\`\`\`  
END FILE 12/23: workspace/backend/src/modules/month-close/month-close.service.ts

BEGIN FILE 13/23: workspace/backend/tests/backup-restore/backup-restore.test.ts  
ACTION: new | BYTES: 1547 | SHA256: 77e384ce57b5d06bfa1972d034726a6b4e22226f310a7ccf5a0460da3159c0d6  
\`\`\`typescript  
import { describe, expect, it } from "vitest";  
import {  
  assertBackupManifest,  
  canonicalBackupFileName,  
} from "../../src/modules/backup-restore/backup-restore.service.js";

const hash \= "a".repeat(64);

describe("backup/restore contract", () \=\> {  
  it("creates canonical names with milliseconds and extension", () \=\> {  
    expect(canonicalBackupFileName(new Date("2026-07-17T12:34:56.789Z"), "Prueba manual"))  
      .toBe("cajaapp-v3-2026-07-17T12-34-56-789Z-prueba-manual.cajaapp-backup");  
  });

  it("accepts a strict valid manifest", () \=\> {  
    const manifest \= assertBackupManifest({  
      format: "cajaapp-backup-v1",  
      createdAt: "2026-07-17T12:34:56.789Z",  
      application: "CajaApp V3",  
      database: {  
        entry: "database.sqlite",  
        sha256: hash,  
        sizeBytes: 100,  
        integrityCheck: "ok",  
        foreignKeyViolations: 0,  
        tables: \["MonthClose"\],  
        migrations: \["20260716233000\_add\_month\_close"\],  
      },  
      source: { schemaSha256: hash, migrationsSha256: hash, nodeVersion: "v24.18.0" },  
    });  
    expect(manifest.database.entry).toBe("database.sqlite");  
  });

  it("rejects invalid checksums and unsupported manifests", () \=\> {  
    expect(() \=\> assertBackupManifest({  
      format: "cajaapp-backup-v1",  
      application: "CajaApp V3",  
      database: { entry: "database.sqlite", sha256: "bad" },  
      source: { schemaSha256: hash, migrationsSha256: hash },  
    })).toThrow(/Checksum/);  
    expect(() \=\> assertBackupManifest({ format: "other" })).toThrow(/Versión/);  
  });  
});  
\`\`\`  
END FILE 13/23: workspace/backend/tests/backup-restore/backup-restore.test.ts

BEGIN FILE 14/23: workspace/backend/tests/month-close/month-close.test.ts  
ACTION: new | BYTES: 2201 | SHA256: 60d83d4e86c947a8f266d904ad0b8e0c823e301dda4cba1c27fccd5aea482ac2  
\`\`\`typescript  
import { describe, expect, it } from "vitest";  
import {  
  buildMonthCloseFingerprint,  
  buildMonthCloseSummary,  
  monthRange,  
  type MonthCloseSnapshot,  
} from "../../src/modules/month-close/month-close.service.js";

const movement \= (overrides: Record\<string, unknown\> \= {}) \=\> ({  
  id: "manual:1",  
  occurredOn: "2026-06-10",  
  effectiveMonthKey: "2026-06",  
  type: "expense",  
  sourceType: "manual\_cash",  
  sourceId: "1",  
  description: "Compra",  
  category: { id: null, name: "Sin clasificar" },  
  currency: "ARS",  
  amount: "1.234,56",  
  status: "actual",  
  notes: null,  
  editable: true,  
  categoryEditable: true,  
  createdAt: null,  
  updatedAt: null,  
  trace: { sourceLabel: "Carga manual" },  
  ...overrides,  
}) as any;

describe("month close helpers", () \=\> {  
  it("calculates calendar month boundaries", () \=\> {  
    expect(monthRange("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });  
  });

  it("keeps ARS/USD and actual/pending/projected totals separated as integer cents", () \=\> {  
    const summary \= buildMonthCloseSummary("2026-06", \[  
      movement(),  
      movement({ id: "2", type: "income", currency: "USD", amount: "20.50", status: "pending" }),  
      movement({ id: "3", type: "income", amount: "200,00", status: "projected" }),  
    \]);  
    expect(summary.expense.actual.ARS).toBe("123456");  
    expect(summary.income.pending.USD).toBe("2050");  
    expect(summary.income.projected.ARS).toBe("20000");  
    expect(summary.balance.all.ARS).toBe("-103456");  
  });

  it("produces a stable fingerprint that ignores generatedAt", () \=\> {  
    const base: MonthCloseSnapshot \= {  
      version: "month-close-v1",  
      monthKey: "2026-06",  
      range: monthRange("2026-06"),  
      generatedAt: "2026-07-17T00:00:00.000Z",  
      summary: buildMonthCloseSummary("2026-06", \[\]),  
      movements: \[\],  
      settings: { theme: "dark", displayName: "Javi" },  
      goals: \[\],  
      budgets: \[\],  
      cardStatements: \[\],  
      salaryReceipts: \[\],  
    };  
    expect(buildMonthCloseFingerprint(base)).toBe(  
      buildMonthCloseFingerprint({ ...base, generatedAt: "2030-01-01T00:00:00.000Z" }),  
    );  
    expect(buildMonthCloseFingerprint(base)).toMatch(/^\[a-f0-9\]{64}$/);  
  });  
});  
\`\`\`  
END FILE 14/23: workspace/backend/tests/month-close/month-close.test.ts

BEGIN FILE 15/23: workspace/frontend/src/components/finance/sections/cierres-section.tsx  
ACTION: new | BYTES: 11577 | SHA256: 5e600c2329605d2b9cb91ef6e2ed1bb78c8fb17a5953b26ff466e055df495ebf  
\`\`\`tsx  
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";  
import { Archive, CheckCircle2, Eye, Loader2, LockKeyhole, RefreshCw, RotateCcw } from "lucide-react";  
import {  
  createMonthClose,  
  getMonthCloseDetail,  
  listMonthCloses,  
  reopenMonthClose,  
  type MonthCloseItem,  
} from "@/lib/finance/month-close-api";  
import { USER\_TIMEZONE } from "@/lib/finance/ui-store";

function previousMonthInTucuman(): string {  
  const parts \= new Intl.DateTimeFormat("en-CA", {  
    timeZone: USER\_TIMEZONE,  
    year: "numeric",  
    month: "2-digit",  
  }).formatToParts(new Date());  
  const values \= Object.fromEntries(parts.map((part) \=\> \[part.type, part.value\]));  
  const date \= new Date(Date.UTC(Number(values.year), Number(values.month) \- 2, 1));  
  return \`${date.getUTCFullYear()}-${String(date.getUTCMonth() \+ 1).padStart(2, "0")}\`;  
}

function money(cents: string, currency: "ARS" | "USD"): string {  
  const raw \= BigInt(cents);  
  const negative \= raw \< 0n;  
  const absolute \= negative ? \-raw : raw;  
  const units \= absolute / 100n;  
  const fraction \= (absolute % 100n).toString().padStart(2, "0");  
  const grouped \= new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(units);  
  const symbol \= currency \=== "ARS" ? "$" : "US$";  
  return \`${negative ? "-" : ""}${symbol} ${grouped},${fraction}\`;  
}

function dateTime(value: string | null): string {  
  if (\!value) return "—";  
  return new Intl.DateTimeFormat("es-AR", {  
    dateStyle: "medium",  
    timeStyle: "short",  
    timeZone: USER\_TIMEZONE,  
  }).format(new Date(value));  
}

export function CierresSection() {  
  const \[monthKey, setMonthKey\] \= useState(previousMonthInTucuman);  
  const \[items, setItems\] \= useState\<MonthCloseItem\[\]\>(\[\]);  
  const \[detail, setDetail\] \= useState\<MonthCloseItem | null\>(null);  
  const \[loading, setLoading\] \= useState(true);  
  const \[working, setWorking\] \= useState\<string | null\>(null);  
  const \[message, setMessage\] \= useState\<{ kind: "success" | "error"; text: string } | null\>(null);

  const load \= useCallback(async () \=\> {  
    setLoading(true);  
    try {  
      const response \= await listMonthCloses({ limit: 100 });  
      setItems(response.items);  
    } catch (error) {  
      setMessage({ kind: "error", text: error instanceof Error ? error.message : String(error) });  
    } finally {  
      setLoading(false);  
    }  
  }, \[\]);

  useEffect(() \=\> { void load(); }, \[load\]);

  const activeMonths \= useMemo(  
    () \=\> new Set(items.filter((item) \=\> item.active).map((item) \=\> item.monthKey)),  
    \[items\],  
  );

  async function closeMonth() {  
    setWorking("create");  
    setMessage(null);  
    try {  
      const created \= await createMonthClose(monthKey);  
      setMessage({ kind: "success", text: \`Cierre ${created.monthKey} v${created.version} creado correctamente.\` });  
      setDetail(created);  
      await load();  
    } catch (error) {  
      setMessage({ kind: "error", text: error instanceof Error ? error.message : String(error) });  
    } finally {  
      setWorking(null);  
    }  
  }

  async function openDetail(id: string) {  
    setWorking(\`detail:${id}\`);  
    setMessage(null);  
    try {  
      setDetail(await getMonthCloseDetail(id));  
    } catch (error) {  
      setMessage({ kind: "error", text: error instanceof Error ? error.message : String(error) });  
    } finally {  
      setWorking(null);  
    }  
  }

  async function reopen(item: MonthCloseItem) {  
    if (\!window.confirm(\`¿Reabrir ${item.monthKey} v${item.version}? El snapshot queda en el historial y el mes vuelve a admitir cambios.\`)) return;  
    setWorking(\`reopen:${item.id}\`);  
    setMessage(null);  
    try {  
      const reopened \= await reopenMonthClose(item.id);  
      setDetail(reopened);  
      setMessage({ kind: "success", text: \`El cierre ${item.monthKey} v${item.version} fue reabierto.\` });  
      await load();  
    } catch (error) {  
      setMessage({ kind: "error", text: error instanceof Error ? error.message : String(error) });  
    } finally {  
      setWorking(null);  
    }  
  }

  return (  
    \<section className="space-y-6" data-testid="month-close-section"\>  
      \<header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between dark:border-slate-800 dark:bg-slate-950"\>  
        \<div\>  
          \<div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"\>  
            \<Archive className="h-4 w-4" /\> Historial contable local  
          \</div\>  
          \<h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white"\>Cierres mensuales\</h1\>  
          \<p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300"\>  
            Congelá un snapshot determinístico del mes. Los importes se guardan por moneda y estado, y el cierre se bloquea mientras Conciliación tenga casos actuales abiertos.  
          \</p\>  
        \</div\>  
        \<button type="button" onClick={() \=\> void load()} className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"\>  
          \<RefreshCw className={\`h-4 w-4 ${loading ? "animate-spin" : ""}\`} /\> Actualizar  
        \</button\>  
      \</header\>

      {message && (  
        \<div role="alert" className={\`rounded-xl border px-4 py-3 text-sm ${message.kind \=== "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}\`}\>  
          {message.text}  
        \</div\>  
      )}

      \<div className="grid gap-6 xl:grid-cols-\[minmax(0,1fr)\_360px\]"\>  
        \<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"\>  
          \<div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-end dark:border-slate-800"\>  
            \<label className="grid gap-1 text-sm font-medium"\>  
              Mes a cerrar  
              \<input data-testid="month-close-input" type="month" value={monthKey} onChange={(event) \=\> setMonthKey(event.target.value)} className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /\>  
            \</label\>  
            \<button data-testid="create-month-close" type="button" disabled={\!monthKey || Boolean(working) || activeMonths.has(monthKey)} onClick={() \=\> void closeMonth()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"\>  
              {working \=== "create" ? \<Loader2 className="h-4 w-4 animate-spin" /\> : \<LockKeyhole className="h-4 w-4" /\>}  
              {activeMonths.has(monthKey) ? "Mes ya cerrado" : "Cerrar mes"}  
            \</button\>  
          \</div\>

          \<div className="overflow-x-auto"\>  
            \<table className="min-w-full text-sm"\>  
              \<thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900"\>  
                \<tr\>\<th className="px-5 py-3"\>Mes / versión\</th\>\<th className="px-5 py-3"\>Estado\</th\>\<th className="px-5 py-3"\>Saldo ARS\</th\>\<th className="px-5 py-3"\>Saldo USD\</th\>\<th className="px-5 py-3"\>Mov.\</th\>\<th className="px-5 py-3"\>Acciones\</th\>\</tr\>  
              \</thead\>  
              \<tbody className="divide-y dark:divide-slate-800"\>  
                {loading ? (  
                  \<tr\>\<td colSpan={6} className="px-5 py-10 text-center text-slate-500"\>Cargando cierres…\</td\>\</tr\>  
                ) : items.length \=== 0 ? (  
                  \<tr\>\<td colSpan={6} className="px-5 py-10 text-center text-slate-500"\>Todavía no hay cierres mensuales.\</td\>\</tr\>  
                ) : items.map((item) \=\> (  
                  \<tr key={item.id} data-testid={\`month-close-row-${item.monthKey}\`}\>  
                    \<td className="px-5 py-4 font-medium"\>{item.monthKey} · v{item.version}\</td\>  
                    \<td className="px-5 py-4"\>\<span className={\`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status \=== "closed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}\`}\>{item.status \=== "closed" ? "Cerrado" : "Reabierto"}\</span\>\</td\>  
                    \<td className="px-5 py-4 tabular-nums"\>{money(item.summary.balance.all.ARS, "ARS")}\</td\>  
                    \<td className="px-5 py-4 tabular-nums"\>{money(item.summary.balance.all.USD, "USD")}\</td\>  
                    \<td className="px-5 py-4"\>{item.summary.movements}\</td\>  
                    \<td className="px-5 py-4"\>\<div className="flex gap-2"\>\<button type="button" onClick={() \=\> void openDetail(item.id)} className="rounded-lg border p-2 hover:bg-slate-50 dark:border-slate-700"\>\<Eye className="h-4 w-4" /\>\</button\>{item.canReopen && \<button data-testid={\`reopen-${item.monthKey}\`} type="button" onClick={() \=\> void reopen(item)} className="rounded-lg border p-2 hover:bg-slate-50 dark:border-slate-700"\>\<RotateCcw className="h-4 w-4" /\>\</button\>}\</div\>\</td\>  
                  \</tr\>  
                ))}  
              \</tbody\>  
            \</table\>  
          \</div\>  
        \</div\>

        \<aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950" data-testid="month-close-detail"\>  
          {\!detail ? (  
            \<div className="grid min-h-64 place-items-center text-center text-sm text-slate-500"\>\<div\>\<Eye className="mx-auto mb-3 h-8 w-8" /\>Seleccioná un cierre para inspeccionar el snapshot.\</div\>\</div\>  
          ) : (  
            \<div className="space-y-5"\>  
              \<div\>\<p className="text-xs uppercase tracking-wide text-slate-500"\>Detalle histórico\</p\>\<h2 className="text-xl font-semibold"\>{detail.monthKey} · versión {detail.version}\</h2\>\<p className="mt-1 text-xs text-slate-500"\>Huella {detail.sourceFingerprint.slice(0, 16)}…\</p\>\</div\>  
              \<div className="grid grid-cols-2 gap-3"\>  
                {(\["ARS", "USD"\] as const).map((currency) \=\> \<div key={currency} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"\>\<p className="text-xs text-slate-500"\>Saldo {currency}\</p\>\<p className="mt-1 font-semibold tabular-nums"\>{money(detail.summary.balance.all\[currency\], currency)}\</p\>\<p className="mt-2 text-xs"\>Ingresos {money(detail.summary.income.all\[currency\], currency)}\</p\>\<p className="text-xs"\>Egresos {money(detail.summary.expense.all\[currency\], currency)}\</p\>\</div\>)}  
              \</div\>  
              \<dl className="grid gap-2 text-sm"\>\<div className="flex justify-between"\>\<dt\>Movimientos\</dt\>\<dd\>{detail.summary.movements}\</dd\>\</div\>\<div className="flex justify-between"\>\<dt\>Objetivos\</dt\>\<dd\>{detail.snapshot?.goals.length ?? "—"}\</dd\>\</div\>\<div className="flex justify-between"\>\<dt\>Presupuestos\</dt\>\<dd\>{detail.snapshot?.budgets.length ?? "—"}\</dd\>\</div\>\<div className="flex justify-between"\>\<dt\>Resúmenes\</dt\>\<dd\>{detail.snapshot?.cardStatements.length ?? "—"}\</dd\>\</div\>\<div className="flex justify-between"\>\<dt\>Recibos\</dt\>\<dd\>{detail.snapshot?.salaryReceipts.length ?? "—"}\</dd\>\</div\>\</dl\>  
              \<div className="rounded-xl border p-3 text-xs dark:border-slate-800"\>\<p\>Cerrado: {dateTime(detail.closedAt)}\</p\>\<p\>Reabierto: {dateTime(detail.reopenedAt)}\</p\>\</div\>  
              {detail.status \=== "closed" ? \<p className="flex items-center gap-2 text-sm text-emerald-700"\>\<CheckCircle2 className="h-4 w-4" /\> Snapshot activo\</p\> : \<p className="flex items-center gap-2 text-sm text-amber-700"\>\<RotateCcw className="h-4 w-4" /\> Snapshot histórico reabierto\</p\>}  
            \</div\>  
          )}  
        \</aside\>  
      \</div\>  
    \</section\>  
  );  
}  
\`\`\`  
END FILE 15/23: workspace/frontend/src/components/finance/sections/cierres-section.tsx

BEGIN FILE 16/23: workspace/frontend/src/components/finance/sections/respaldo-section.tsx  
ACTION: new | BYTES: 12245 | SHA256: 2c1d5ff8a43d5dc03ad6a89acd8bb102a077072b2d5d143473b33b64097e0036  
\`\`\`tsx  
"use client";

import { useCallback, useEffect, useRef, useState } from "react";  
import {  
  CheckCircle2,  
  DatabaseBackup,  
  Download,  
  FileCheck2,  
  HardDriveDownload,  
  Loader2,  
  RefreshCw,  
  RotateCcw,  
  ShieldCheck,  
  Upload,  
} from "lucide-react";  
import {  
  createBackup,  
  downloadBackup,  
  listBackups,  
  restoreBackup,  
  validateBackup,  
  type BackupItem,  
} from "@/lib/finance/backup-restore-api";  
import { USER\_TIMEZONE } from "@/lib/finance/ui-store";

function dateTime(value: string | null): string {  
  if (\!value) return "—";  
  return new Intl.DateTimeFormat("es-AR", {  
    dateStyle: "medium",  
    timeStyle: "short",  
    timeZone: USER\_TIMEZONE,  
  }).format(new Date(value));  
}

function bytes(value: number): string {  
  if (value \< 1024\) return \`${value} B\`;  
  if (value \< 1024 \* 1024\) return \`${(value / 1024).toFixed(1)} KB\`;  
  return \`${(value / (1024 \* 1024)).toFixed(1)} MB\`;  
}

function statusLabel(item: BackupItem): string {  
  if (item.status \=== "restored") return "Restaurado";  
  if (item.status \=== "validated") return "Validado";  
  return "Creado";  
}

export function RespaldoSection() {  
  const \[items, setItems\] \= useState\<BackupItem\[\]\>(\[\]);  
  const \[backupDirectory, setBackupDirectory\] \= useState("");  
  const \[label, setLabel\] \= useState("");  
  const \[restoreFile, setRestoreFile\] \= useState\<File | null\>(null);  
  const \[loading, setLoading\] \= useState(true);  
  const \[working, setWorking\] \= useState\<string | null\>(null);  
  const \[message, setMessage\] \= useState\<{ kind: "success" | "error"; text: string } | null\>(null);  
  const fileInputRef \= useRef\<HTMLInputElement\>(null);

  const load \= useCallback(async () \=\> {  
    setLoading(true);  
    try {  
      const response \= await listBackups();  
      setItems(response.items);  
      setBackupDirectory(response.backupDirectory);  
    } catch (error) {  
      setMessage({ kind: "error", text: error instanceof Error ? error.message : String(error) });  
    } finally {  
      setLoading(false);  
    }  
  }, \[\]);

  useEffect(() \=\> { void load(); }, \[load\]);

  async function handleCreate() {  
    setWorking("create");  
    setMessage(null);  
    try {  
      const created \= await createBackup(label.trim() || undefined);  
      setLabel("");  
      setMessage({ kind: "success", text: \`Respaldo ${created.fileName} creado correctamente.\` });  
      await load();  
    } catch (error) {  
      setMessage({ kind: "error", text: error instanceof Error ? error.message : String(error) });  
    } finally {  
      setWorking(null);  
    }  
  }

  async function handleValidate(item: BackupItem) {  
    setWorking(\`validate:${item.id}\`);  
    setMessage(null);  
    try {  
      await validateBackup(item.id);  
      setMessage({ kind: "success", text: \`Integridad verificada para ${item.fileName}.\` });  
      await load();  
    } catch (error) {  
      setMessage({ kind: "error", text: error instanceof Error ? error.message : String(error) });  
    } finally {  
      setWorking(null);  
    }  
  }

  async function handleDownload(item: BackupItem) {  
    setWorking(\`download:${item.id}\`);  
    setMessage(null);  
    try {  
      const result \= await downloadBackup(item.id);  
      const url \= URL.createObjectURL(result.blob);  
      const anchor \= document.createElement("a");  
      anchor.href \= url;  
      anchor.download \= result.fileName;  
      document.body.appendChild(anchor);  
      anchor.click();  
      anchor.remove();  
      URL.revokeObjectURL(url);  
      setMessage({ kind: "success", text: \`Descarga preparada: ${result.fileName}.\` });  
    } catch (error) {  
      setMessage({ kind: "error", text: error instanceof Error ? error.message : String(error) });  
    } finally {  
      setWorking(null);  
    }  
  }

  async function handleRestore() {  
    if (\!restoreFile) return;  
    const confirmed \= window.confirm(  
      "La restauración reemplazará la base local. CajaApp generará primero un respaldo automático del estado actual. ¿Continuar?",  
    );  
    if (\!confirmed) return;  
    setWorking("restore");  
    setMessage(null);  
    try {  
      const result \= await restoreBackup(restoreFile);  
      setMessage({  
        kind: "success",  
        text: \`Restauración completada. Respaldo previo: ${result.preRestoreBackup.fileName}.\`,  
      });  
      setRestoreFile(null);  
      if (fileInputRef.current) fileInputRef.current.value \= "";  
      await load();  
    } catch (error) {  
      setMessage({ kind: "error", text: error instanceof Error ? error.message : String(error) });  
    } finally {  
      setWorking(null);  
    }  
  }

  return (  
    \<section className="space-y-6" data-testid="backup-restore-section"\>  
      \<header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between dark:border-slate-800 dark:bg-slate-950"\>  
        \<div\>  
          \<div className="flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-400"\>  
            \<DatabaseBackup className="h-4 w-4" /\> Protección local de datos  
          \</div\>  
          \<h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white"\>Respaldo y restauración\</h1\>  
          \<p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300"\>  
            Generá paquetes portables con snapshot SQLite consistente, manifiesto y checksums. Antes de restaurar se crea automáticamente un respaldo de seguridad.  
          \</p\>  
          {backupDirectory && \<p className="mt-2 break-all text-xs text-slate-500"\>Destino local: {backupDirectory}\</p\>}  
        \</div\>  
        \<button type="button" onClick={() \=\> void load()} className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"\>  
          \<RefreshCw className={\`h-4 w-4 ${loading ? "animate-spin" : ""}\`} /\> Actualizar  
        \</button\>  
      \</header\>

      {message && (  
        \<div role="alert" className={\`rounded-xl border px-4 py-3 text-sm ${message.kind \=== "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}\`}\>  
          {message.text}  
        \</div\>  
      )}

      \<div className="grid gap-6 xl:grid-cols-2"\>  
        \<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"\>  
          \<div className="flex items-start gap-3"\>  
            \<div className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300"\>\<HardDriveDownload className="h-5 w-5" /\>\</div\>  
            \<div\>\<h2 className="font-semibold"\>Crear respaldo\</h2\>\<p className="mt-1 text-sm text-slate-500"\>Incluye datos confirmados que todavía estén en WAL.\</p\>\</div\>  
          \</div\>  
          \<div className="mt-5 flex flex-col gap-3 sm:flex-row"\>  
            \<input data-testid="backup-label" value={label} maxLength={80} onChange={(event) \=\> setLabel(event.target.value)} placeholder="Etiqueta opcional" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" /\>  
            \<button data-testid="create-backup" type="button" disabled={Boolean(working)} onClick={() \=\> void handleCreate()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"\>  
              {working \=== "create" ? \<Loader2 className="h-4 w-4 animate-spin" /\> : \<DatabaseBackup className="h-4 w-4" /\>} Crear  
            \</button\>  
          \</div\>  
        \</div\>

        \<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/30"\>  
          \<div className="flex items-start gap-3"\>  
            \<div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-900 dark:text-amber-200"\>\<RotateCcw className="h-5 w-5" /\>\</div\>  
            \<div\>\<h2 className="font-semibold"\>Restaurar paquete\</h2\>\<p className="mt-1 text-sm text-slate-600 dark:text-slate-300"\>Sólo se aceptan paquetes compatibles e íntegros con extensión .cajaapp-backup.\</p\>\</div\>  
          \</div\>  
          \<input ref={fileInputRef} data-testid="restore-backup-input" type="file" accept=".cajaapp-backup" onChange={(event) \=\> setRestoreFile(event.target.files?.\[0\] ?? null)} className="mt-5 block w-full text-sm" /\>  
          \<button data-testid="restore-backup" type="button" disabled={\!restoreFile || Boolean(working)} onClick={() \=\> void handleRestore()} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"\>  
            {working \=== "restore" ? \<Loader2 className="h-4 w-4 animate-spin" /\> : \<Upload className="h-4 w-4" /\>} Restaurar con respaldo previo  
          \</button\>  
        \</div\>  
      \</div\>

      \<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"\>  
        \<div className="border-b p-5 dark:border-slate-800"\>\<h2 className="font-semibold"\>Historial de respaldos\</h2\>\</div\>  
        \<div className="overflow-x-auto"\>  
          \<table className="min-w-full text-sm"\>  
            \<thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900"\>  
              \<tr\>\<th className="px-5 py-3"\>Archivo\</th\>\<th className="px-5 py-3"\>Tipo\</th\>\<th className="px-5 py-3"\>Estado\</th\>\<th className="px-5 py-3"\>Tamaño\</th\>\<th className="px-5 py-3"\>Creado\</th\>\<th className="px-5 py-3"\>Acciones\</th\>\</tr\>  
            \</thead\>  
            \<tbody className="divide-y dark:divide-slate-800"\>  
              {loading ? (  
                \<tr\>\<td colSpan={6} className="px-5 py-10 text-center text-slate-500"\>Cargando respaldos…\</td\>\</tr\>  
              ) : items.length \=== 0 ? (  
                \<tr\>\<td colSpan={6} className="px-5 py-10 text-center text-slate-500"\>Todavía no hay respaldos.\</td\>\</tr\>  
              ) : items.map((item) \=\> (  
                \<tr key={item.id} data-testid={\`backup-row-${item.id}\`}\>  
                  \<td className="max-w-sm px-5 py-4"\>\<p className="truncate font-medium" title={item.fileName}\>{item.fileName}\</p\>\<p className="mt-1 font-mono text-xs text-slate-500"\>{item.sha256.slice(0, 16)}…\</p\>\</td\>  
                  \<td className="px-5 py-4"\>{item.kind \=== "pre\_restore" ? "Previo a restauración" : item.kind \=== "restored\_upload" ? "Paquete restaurado" : "Manual"}\</td\>  
                  \<td className="px-5 py-4"\>\<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"\>\<CheckCircle2 className="h-3.5 w-3.5" /\>{statusLabel(item)}\</span\>\</td\>  
                  \<td className="px-5 py-4"\>{bytes(item.sizeBytes)}\</td\>  
                  \<td className="px-5 py-4"\>{dateTime(item.createdAt)}\</td\>  
                  \<td className="px-5 py-4"\>\<div className="flex gap-2"\>  
                    \<button data-testid={\`validate-backup-${item.id}\`} title="Validar" type="button" disabled={Boolean(working)} onClick={() \=\> void handleValidate(item)} className="rounded-lg border p-2 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700"\>\<FileCheck2 className="h-4 w-4" /\>\</button\>  
                    \<button data-testid={\`download-backup-${item.id}\`} title="Descargar" type="button" disabled={Boolean(working)} onClick={() \=\> void handleDownload(item)} className="rounded-lg border p-2 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700"\>\<Download className="h-4 w-4" /\>\</button\>  
                  \</div\>\</td\>  
                \</tr\>  
              ))}  
            \</tbody\>  
          \</table\>  
        \</div\>  
      \</div\>

      \<div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-950"\>  
        \<p className="flex items-center gap-2"\>\<ShieldCheck className="h-4 w-4 text-emerald-600" /\> Integridad y foreign keys\</p\>  
        \<p className="flex items-center gap-2"\>\<FileCheck2 className="h-4 w-4 text-emerald-600" /\> SHA-256 de base y código\</p\>  
        \<p className="flex items-center gap-2"\>\<DatabaseBackup className="h-4 w-4 text-emerald-600" /\> Operaciones serializadas\</p\>  
      \</div\>  
    \</section\>  
  );  
}  
\`\`\`  
END FILE 16/23: workspace/frontend/src/components/finance/sections/respaldo-section.tsx

BEGIN FILE 17/23: workspace/frontend/src/components/finance/sections/section-router.tsx  
ACTION: replace | BYTES: 2426 | SHA256: 30da56539723e0fddf0d2782c8ca5065dc98ebd80c303c6d3eb07d65757ea497  
\`\`\`tsx  
"use client";

import { SearchTargetBanner } from "@/components/finance/search/search-target-banner";  
import { useFinanceUI } from "@/lib/finance/ui-store";  
import { AsesorIaSection } from "./asesor-ia-section";  
import { ConciliacionSection } from "./conciliacion-section";  
import { CierresSection } from "./cierres-section";  
import { ConfiguracionSection } from "./configuracion-section";  
import { DashboardSection } from "./dashboard-section";  
import { DeudaFuturaSection } from "./deuda-futura-section";  
import { ImportacionesSection } from "./importaciones-section";  
import { IngresosSection } from "./ingresos-section";  
import { MovimientosSection } from "./movimientos-section";  
import { ObjetivosSection } from "./objetivos-section";  
import { PresupuestosSection } from "./presupuestos-section";  
import { ReportesSection } from "./reportes-section";  
import { RespaldoSection } from "./respaldo-section";  
import { SaludFinancieraSection } from "./salud-financiera-section";  
import { TarjetasSection } from "./tarjetas-section";

export function SectionRouter() {  
  const section \= useFinanceUI((state) \=\> state.section);

  let content: React.ReactNode;  
  switch (section) {  
    case "dashboard":  
      content \= \<DashboardSection /\>;  
      break;  
    case "movimientos":  
      content \= \<MovimientosSection /\>;  
      break;  
    case "ingresos":  
      content \= \<IngresosSection /\>;  
      break;  
    case "tarjetas":  
      content \= \<TarjetasSection /\>;  
      break;  
    case "importaciones":  
      content \= \<ImportacionesSection /\>;  
      break;  
    case "conciliacion":  
      content \= \<ConciliacionSection /\>;  
      break;  
    case "cierres":  
      content \= \<CierresSection /\>;  
      break;  
    case "respaldo":  
      content \= \<RespaldoSection /\>;  
      break;  
    case "deuda":  
      content \= \<DeudaFuturaSection /\>;  
      break;  
    case "presupuestos":  
      content \= \<PresupuestosSection /\>;  
      break;  
    case "objetivos":  
      content \= \<ObjetivosSection /\>;  
      break;  
    case "reportes":  
      content \= \<ReportesSection /\>;  
      break;  
    case "salud":  
      content \= \<SaludFinancieraSection /\>;  
      break;  
    case "asesor":  
      content \= \<AsesorIaSection /\>;  
      break;  
    case "configuracion":  
      content \= \<ConfiguracionSection /\>;  
      break;  
    default:  
      content \= \<DashboardSection /\>;  
  }

  return (  
    \<\>  
      \<SearchTargetBanner /\>  
      {content}  
    \</\>  
  );  
}  
\`\`\`  
END FILE 17/23: workspace/frontend/src/components/finance/sections/section-router.tsx

BEGIN FILE 18/23: workspace/frontend/src/lib/finance/backup-restore-api.ts  
ACTION: new | BYTES: 3241 | SHA256: 670f63b620b5e09adb27dc566ebc0486901977aaf402df24a066791f3b593aa7  
\`\`\`typescript  
const API\_BASE\_URL \= process.env.NEXT\_PUBLIC\_API\_BASE\_URL || "http://127.0.0.1:11436";

export interface BackupManifest {  
  format: "cajaapp-backup-v1";  
  createdAt: string;  
  application: "CajaApp V3";  
  database: {  
    entry: "database.sqlite";  
    sha256: string;  
    sizeBytes: number;  
    integrityCheck: "ok";  
    foreignKeyViolations: number;  
    tables: string\[\];  
    migrations: string\[\];  
  };  
  source: { schemaSha256: string; migrationsSha256: string; nodeVersion: string };  
}

export interface BackupItem {  
  id: string;  
  fileName: string;  
  kind: "manual" | "pre\_restore" | "restored\_upload";  
  status: "created" | "validated" | "restored";  
  sizeBytes: number;  
  sha256: string;  
  manifest: BackupManifest;  
  createdAt: string;  
  validatedAt: string | null;  
  restoredAt: string | null;  
}

export class BackupRestoreApiError extends Error {  
  constructor(message: string, public statusCode: number, public code?: string) {  
    super(message);  
    this.name \= "BackupRestoreApiError";  
  }  
}

async function parseError(response: Response): Promise\<BackupRestoreApiError\> {  
  let message \= \`HTTP ${response.status}\`;  
  let code: string | undefined;  
  try {  
    const body \= await response.json() as { message?: string; error?: string; code?: string };  
    message \= body.message || body.error || message;  
    code \= body.code;  
  } catch {  
    message \= (await response.text()) || message;  
  }  
  return new BackupRestoreApiError(message, response.status, code);  
}

async function json\<T\>(response: Response): Promise\<T\> {  
  if (\!response.ok) throw await parseError(response);  
  return response.json() as Promise\<T\>;  
}

export async function listBackups() {  
  return json\<{  
    items: BackupItem\[\];  
    activities: Array\<{ id: string; backupId: string | null; action: string; status: string; detail: unknown; createdAt: string }\>;  
    backupDirectory: string;  
  }\>(await fetch(\`${API\_BASE\_URL}/api/backup-restore\`, { cache: "no-store" }));  
}

export async function createBackup(label?: string): Promise\<BackupItem\> {  
  return json(await fetch(\`${API\_BASE\_URL}/api/backup-restore\`, {  
    method: "POST",  
    headers: { "Content-Type": "application/json" },  
    body: JSON.stringify({ label }),  
  }));  
}

export async function validateBackup(id: string) {  
  return json\<{ valid: true; manifest: BackupManifest; packageSha256: string }\>(  
    await fetch(\`${API\_BASE\_URL}/api/backup-restore/${encodeURIComponent(id)}/validate\`, { method: "POST" }),  
  );  
}

export async function downloadBackup(id: string): Promise\<{ blob: Blob; fileName: string }\> {  
  const response \= await fetch(\`${API\_BASE\_URL}/api/backup-restore/${encodeURIComponent(id)}/download\`);  
  if (\!response.ok) throw await parseError(response);  
  const disposition \= response.headers.get("content-disposition") || "";  
  const fileName \= disposition.match(/filename="?(\[^";\]+)"?/i)?.\[1\] || "cajaapp-v3.cajaapp-backup";  
  return { blob: await response.blob(), fileName };  
}

export async function restoreBackup(file: File) {  
  const form \= new FormData();  
  form.append("file", file);  
  return json\<{ restored: true; backup: BackupItem; preRestoreBackup: BackupItem }\>(  
    await fetch(\`${API\_BASE\_URL}/api/backup-restore/restore\`, { method: "POST", body: form }),  
  );  
}  
\`\`\`  
END FILE 18/23: workspace/frontend/src/lib/finance/backup-restore-api.ts

BEGIN FILE 19/23: workspace/frontend/src/lib/finance/month-close-api.ts  
ACTION: new | BYTES: 3281 | SHA256: 61210e375a16b2b913056c6b6a842d9dc48c8cc3b0d2c174c58a2a95060445ae  
\`\`\`typescript  
const API\_BASE\_URL \= process.env.NEXT\_PUBLIC\_API\_BASE\_URL || "http://127.0.0.1:11436";

export type CurrencyTotals \= { ARS: string; USD: string };  
export type StatusTotals \= {  
  all: CurrencyTotals;  
  actual: CurrencyTotals;  
  pending: CurrencyTotals;  
  projected: CurrencyTotals;  
};

export interface MonthCloseSummary {  
  monthKey: string;  
  movements: number;  
  income: StatusTotals;  
  expense: StatusTotals;  
  balance: StatusTotals;  
  sources: Record\<string, number\>;  
  openReconciliations: number;  
}

export interface MonthCloseItem {  
  id: string;  
  monthKey: string;  
  version: number;  
  status: "closed" | "reopened";  
  active: boolean;  
  summary: MonthCloseSummary;  
  sourceFingerprint: string;  
  canReopen: boolean;  
  closedAt: string;  
  reopenedAt: string | null;  
  createdAt: string;  
  updatedAt: string;  
  snapshot?: {  
    version: "month-close-v1";  
    monthKey: string;  
    range: { from: string; to: string };  
    generatedAt: string;  
    summary: MonthCloseSummary;  
    movements: unknown\[\];  
    settings: unknown;  
    goals: unknown\[\];  
    budgets: unknown\[\];  
    cardStatements: unknown\[\];  
    salaryReceipts: unknown\[\];  
  };  
  activities?: Array\<{ id: string; kind: string; detail: unknown; createdAt: string }\>;  
}

export class MonthCloseApiError extends Error {  
  constructor(message: string, public statusCode: number, public code?: string) {  
    super(message);  
    this.name \= "MonthCloseApiError";  
  }  
}

async function handleResponse\<T\>(response: Response): Promise\<T\> {  
  if (\!response.ok) {  
    let message \= \`HTTP ${response.status}\`;  
    let code: string | undefined;  
    try {  
      const body \= await response.json() as { message?: string; error?: string; code?: string };  
      message \= body.message || body.error || message;  
      code \= body.code;  
    } catch {  
      message \= (await response.text()) || message;  
    }  
    throw new MonthCloseApiError(message, response.status, code);  
  }  
  return response.json() as Promise\<T\>;  
}

export async function listMonthCloses(input: {  
  monthKey?: string;  
  status?: "all" | "closed" | "reopened";  
  limit?: number;  
  offset?: number;  
} \= {}) {  
  const params \= new URLSearchParams({  
    status: input.status ?? "all",  
    limit: String(input.limit ?? 50),  
    offset: String(input.offset ?? 0),  
  });  
  if (input.monthKey) params.set("monthKey", input.monthKey);  
  return handleResponse\<{  
    items: MonthCloseItem\[\];  
    pagination: { limit: number; offset: number; total: number; hasMore: boolean };  
  }\>(await fetch(\`${API\_BASE\_URL}/api/month-close?${params}\`, { cache: "no-store" }));  
}

export async function createMonthClose(monthKey: string): Promise\<MonthCloseItem\> {  
  return handleResponse(await fetch(\`${API\_BASE\_URL}/api/month-close\`, {  
    method: "POST",  
    headers: { "Content-Type": "application/json" },  
    body: JSON.stringify({ monthKey }),  
  }));  
}

export async function getMonthCloseDetail(id: string): Promise\<MonthCloseItem\> {  
  return handleResponse(await fetch(\`${API\_BASE\_URL}/api/month-close/${encodeURIComponent(id)}\`, {  
    cache: "no-store",  
  }));  
}

export async function reopenMonthClose(id: string): Promise\<MonthCloseItem\> {  
  return handleResponse(await fetch(\`${API\_BASE\_URL}/api/month-close/${encodeURIComponent(id)}/reopen\`, {  
    method: "POST",  
  }));  
}  
\`\`\`  
END FILE 19/23: workspace/frontend/src/lib/finance/month-close-api.ts

BEGIN FILE 20/23: workspace/frontend/src/lib/finance/nav.ts  
ACTION: replace | BYTES: 2585 | SHA256: 81d991fbac8250b29dceceda9c7db1e8c4dfc520b19560575e47675ce72a5376  
\`\`\`typescript  
import {  
  LayoutDashboard,  
  ArrowLeftRight,  
  Banknote,  
  CreditCard,  
  Files,  
  GitCompareArrows,  
  Archive,  
  DatabaseBackup,  
  CalendarRange,  
  BarChart3,  
  Wallet,  
  Target,  
  HeartPulse,  
  Sparkles,  
  Settings,  
  type LucideIcon,  
} from "lucide-react";  
import type { SectionId } from "@/lib/finance/ui-store";

export interface NavItem {  
  id: SectionId;  
  label: string;  
  icon: LucideIcon;  
  description: string;  
}

/\*\* Sólo contiene funciones activas o en integración dentro del MVP. \*/  
export const NAV\_ITEMS: NavItem\[\] \= \[  
  {  
    id: "dashboard",  
    label: "Inicio",  
    icon: LayoutDashboard,  
    description: "Resumen financiero general",  
  },  
  {  
    id: "movimientos",  
    label: "Movimientos",  
    icon: ArrowLeftRight,  
    description: "Historial unificado de ingresos y gastos",  
  },  
  {  
    id: "ingresos",  
    label: "Ingresos",  
    icon: Banknote,  
    description: "Sueldos, bonos y proyecciones",  
  },  
  {  
    id: "tarjetas",  
    label: "Tarjetas",  
    icon: CreditCard,  
    description: "Resumen, cuotas y consumos futuros",  
  },  
  {  
    id: "importaciones",  
    label: "Importaciones",  
    icon: Files,  
    description: "Documentos, estados, errores y correcciones",  
  },  
  {  
    id: "conciliacion",  
    label: "Conciliación",  
    icon: GitCompareArrows,  
    description: "Duplicados, relaciones entre fuentes y doble conteo",  
  },  
  {  
    id: "cierres",  
    label: "Cierres",  
    icon: Archive,  
    description: "Snapshots mensuales versionados y reversibles",  
  },  
  {  
    id: "respaldo",  
    label: "Respaldo",  
    icon: DatabaseBackup,  
    description: "Backup portable y restauración segura de SQLite",  
  },  
  {  
    id: "deuda",  
    label: "Deuda futura",  
    icon: CalendarRange,  
    description: "Cuotas, compromisos e ingresos proyectados",  
  },  
  {  
    id: "presupuestos",  
    label: "Presupuestos",  
    icon: Wallet,  
    description: "Límites por categoría y período",  
  },  
  {  
    id: "objetivos",  
    label: "Objetivos",  
    icon: Target,  
    description: "Metas y aportes manuales",  
  },  
  {  
    id: "reportes",  
    label: "Reportes",  
    icon: BarChart3,  
    description: "Análisis basado en datos reales",  
  },  
  {  
    id: "salud",  
    label: "Salud financiera",  
    icon: HeartPulse,  
    description: "Fórmula determinística, evidencia e historial",  
  },  
  {  
    id: "asesor",  
    label: "Asesor IA",  
    icon: Sparkles,  
    description: "Explicaciones trazables y simulaciones aisladas",  
  },  
  {  
    id: "configuracion",  
    label: "Configuración",  
    icon: Settings,  
    description: "Preferencias locales de CajaApp",  
  },  
\];  
\`\`\`  
END FILE 20/23: workspace/frontend/src/lib/finance/nav.ts

BEGIN FILE 21/23: workspace/frontend/src/lib/finance/ui-store.ts  
ACTION: replace | BYTES: 4935 | SHA256: e1ddb199f24b4dfdff9acd980b95572771149b1b1fd57f680f3518d171ca568f  
\`\`\`typescript  
"use client";

import { create } from "zustand";

export type SectionId \=  
  | "dashboard"  
  | "movimientos"  
  | "ingresos"  
  | "tarjetas"  
  | "importaciones"  
  | "conciliacion"  
  | "cierres"  
  | "respaldo"  
  | "deuda"  
  | "presupuestos"  
  | "objetivos"  
  | "reportes"  
  | "salud"  
  | "asesor"  
  | "configuracion";

export type Period \= "mes" | "trimestre" | "semestre" | "anio";

export type SearchRecordType \=  
  | "movement"  
  | "card\_statement"  
  | "income\_source"  
  | "budget"  
  | "goal";

export interface SearchNavigationTarget {  
  section: Extract\<  
    SectionId,  
    "movimientos" | "tarjetas" | "ingresos" | "presupuestos" | "objetivos"  
  \>;  
  recordId: string;  
  recordType: SearchRecordType;  
  module: string;  
  typeLabel: string;  
  title: string;  
  context: string;  
}

export const USER\_TIMEZONE \= "America/Argentina/Tucuman";

export interface PeriodRange {  
  from: string;  
  to: string;  
  label: string;  
  timezone: string;  
}

export interface MovementDrilldown {  
  from: string;  
  to: string;  
  label: string;  
  type?: "income" | "expense";  
  source?: string;  
  category?: string;  
  status?: "actual" | "pending" | "projected";  
  includeProjected?: boolean;  
}

interface FinanceUIState {  
  section: SectionId;  
  period: Period;  
  newMovementOpen: boolean;  
  movementDrilldown: MovementDrilldown | null;  
  searchTarget: SearchNavigationTarget | null;  
  setSection: (section: SectionId) \=\> void;  
  setPeriod: (period: Period) \=\> void;  
  requestNewMovement: () \=\> void;  
  closeNewMovement: () \=\> void;  
  openMovementDrilldown: (drilldown: MovementDrilldown) \=\> void;  
  clearMovementDrilldown: () \=\> void;  
  navigateToSearchResult: (target: SearchNavigationTarget) \=\> void;  
  clearSearchTarget: () \=\> void;  
}

function isoDate(year: number, month: number, day: number): string {  
  return \`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}\`;  
}

function currentDateParts(): {  
  year: number;  
  month: number;  
  day: number;  
} {  
  const parts \= new Intl.DateTimeFormat("en-CA", {  
    timeZone: USER\_TIMEZONE,  
    year: "numeric",  
    month: "2-digit",  
    day: "2-digit",  
  }).formatToParts(new Date());  
  const values \= Object.fromEntries(  
    parts.map((part) \=\> \[part.type, part.value\]),  
  );  
  return {  
    year: Number(values.year),  
    month: Number(values.month),  
    day: Number(values.day),  
  };  
}

function lastDayOfMonth(year: number, month: number): number {  
  return new Date(Date.UTC(year, month, 0)).getUTCDate();  
}

function rangeLabel(from: string, to: string): string {  
  const start \= new Date(\`${from}T00:00:00Z\`);  
  const end \= new Date(\`${to}T00:00:00Z\`);  
  const formatter \= new Intl.DateTimeFormat("es-AR", {  
    timeZone: "UTC",  
    day: "2-digit",  
    month: "short",  
    year: "numeric",  
  });  
  if (from \=== to) return formatter.format(start);  
  return \`${formatter.format(start)} – ${formatter.format(end)}\`;  
}

export function getPeriodRange(period: Period): PeriodRange {  
  const now \= currentDateParts();  
  let startMonth \= now.month;  
  let endMonth \= now.month;

  if (period \=== "trimestre") {  
    startMonth \= Math.floor((now.month \- 1\) / 3\) \* 3 \+ 1;  
    endMonth \= startMonth \+ 2;  
  } else if (period \=== "semestre") {  
    startMonth \= now.month \<= 6 ? 1 : 7;  
    endMonth \= startMonth \+ 5;  
  } else if (period \=== "anio") {  
    startMonth \= 1;  
    endMonth \= 12;  
  }

  const from \= isoDate(now.year, startMonth, 1);  
  const to \= isoDate(  
    now.year,  
    endMonth,  
    lastDayOfMonth(now.year, endMonth),  
  );  
  return {  
    from,  
    to,  
    label: rangeLabel(from, to),  
    timezone: USER\_TIMEZONE,  
  };  
}

export function todayInUserTimezone(): string {  
  const now \= currentDateParts();  
  return isoDate(now.year, now.month, now.day);  
}

export const PERIOD\_LABELS: Record\<Period, string\> \= {  
  mes: "Mes actual",  
  trimestre: "Trimestre actual",  
  semestre: "Semestre actual",  
  anio: "Año actual",  
};

export const useFinanceUI \= create\<FinanceUIState\>((set) \=\> ({  
  section: "dashboard",  
  period: "mes",  
  newMovementOpen: false,  
  movementDrilldown: null,  
  searchTarget: null,  
  setSection: (section) \=\>  
    set({  
      section,  
      searchTarget: null,  
    }),  
  setPeriod: (period) \=\>  
    set({  
      period,  
      movementDrilldown: null,  
      searchTarget: null,  
    }),  
  requestNewMovement: () \=\>  
    set({  
      section: "movimientos",  
      newMovementOpen: true,  
      searchTarget: null,  
    }),  
  closeNewMovement: () \=\> set({ newMovementOpen: false }),  
  openMovementDrilldown: (movementDrilldown) \=\>  
    set({  
      section: "movimientos",  
      movementDrilldown,  
      newMovementOpen: false,  
      searchTarget: null,  
    }),  
  clearMovementDrilldown: () \=\> set({ movementDrilldown: null }),  
  navigateToSearchResult: (searchTarget) \=\>  
    set({  
      section: searchTarget.section,  
      searchTarget,  
      newMovementOpen: false,  
      movementDrilldown: null,  
    }),  
  clearSearchTarget: () \=\> set({ searchTarget: null }),  
}));  
\`\`\`  
END FILE 21/23: workspace/frontend/src/lib/finance/ui-store.ts

BEGIN FILE 22/23: workspace/frontend/tests/backup-restore.spec.ts  
ACTION: new | BYTES: 4469 | SHA256: e29d3e9652ec918aa1727557c4a25c59d1653527d629b126233b6a6cf831f608  
\`\`\`typescript  
import { expect, test, type Page, type Route } from "@playwright/test";  
import type { BackupItem } from "../src/lib/finance/backup-restore-api";

const HASH \= "b".repeat(64);

function backupFixture(id: string, kind: BackupItem\["kind"\], status: BackupItem\["status"\], fileName: string): BackupItem {  
  return {  
    id,  
    fileName,  
    kind,  
    status,  
    sizeBytes: 4096,  
    sha256: HASH,  
    manifest: {  
      format: "cajaapp-backup-v1",  
      createdAt: "2026-07-17T12:34:56.789Z",  
      application: "CajaApp V3",  
      database: {  
        entry: "database.sqlite",  
        sha256: "a".repeat(64),  
        sizeBytes: 2048,  
        integrityCheck: "ok",  
        foreignKeyViolations: 0,  
        tables: \["MonthClose", "BackupArchive"\],  
        migrations: \["20260716233000\_add\_month\_close", "20260717001000\_add\_backup\_restore"\],  
      },  
      source: { schemaSha256: HASH, migrationsSha256: HASH, nodeVersion: "v24.18.0" },  
    },  
    createdAt: "2026-07-17T12:34:56.789Z",  
    validatedAt: status \=== "validated" ? "2026-07-17T12:35:00.000Z" : null,  
    restoredAt: status \=== "restored" ? "2026-07-17T12:40:00.000Z" : null,  
  };  
}

test("Respaldo crea, valida y restaura con backup previo", async ({ page }: { page: Page }) \=\> {  
  const items: BackupItem\[\] \= \[\];  
  let createBody: unknown \= null;  
  let restoreCalled \= false;

  await page.route("\*\*/api/backup-restore\*\*", async (route: Route) \=\> {  
    const request \= route.request();  
    const url \= new URL(request.url());  
    if (request.method() \=== "POST" && url.pathname \=== "/api/backup-restore") {  
      createBody \= request.postDataJSON();  
      const created \= backupFixture("backup-1", "manual", "created", "cajaapp-v3-2026-07-17T12-34-56-789Z-prueba.cajaapp-backup");  
      items.unshift(created);  
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) });  
      return;  
    }  
    if (request.method() \=== "POST" && url.pathname.endsWith("/backup-1/validate")) {  
      items\[0\] \= { ...items\[0\], status: "validated", validatedAt: "2026-07-17T12:35:00.000Z" };  
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ valid: true, manifest: items\[0\].manifest, packageSha256: HASH }) });  
      return;  
    }  
    if (request.method() \=== "POST" && url.pathname \=== "/api/backup-restore/restore") {  
      restoreCalled \= true;  
      const restored \= backupFixture("restored-1", "restored\_upload", "restored", "cajaapp-v3-2026-07-17T12-40-00-000Z-restored.cajaapp-backup");  
      const safety \= backupFixture("safety-1", "pre\_restore", "created", "cajaapp-v3-2026-07-17T12-39-59-000Z-before-prueba.cajaapp-backup");  
      items.unshift(restored, safety);  
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ restored: true, backup: restored, preRestoreBackup: safety }) });  
      return;  
    }  
    await route.fulfill({  
      status: 200,  
      contentType: "application/json",  
      body: JSON.stringify({ items, activities: \[\], backupDirectory: "C:\\\\Users\\\\Javi\\\\AppData\\\\Local\\\\CajaAppV3\\\\backups" }),  
    });  
  });

  await page.goto("/");  
  await page.getByRole("button", { name: /^Respaldo$/i }).click();  
  await expect(page.getByTestId("backup-restore-section")).toBeVisible();  
  await page.getByTestId("backup-label").fill("Prueba");  
  await page.getByTestId("create-backup").click();  
  await expect.poll(() \=\> createBody).toEqual({ label: "Prueba" });  
  await expect(page.getByRole("alert")).toContainText("creado correctamente");  
  await expect(page.getByTestId("backup-row-backup-1")).toContainText("Manual");

  await page.getByTestId("validate-backup-backup-1").click();  
  await expect(page.getByRole("alert")).toContainText("Integridad verificada");  
  await expect(page.getByTestId("backup-row-backup-1")).toContainText("Validado");

  page.on("dialog", (dialog) \=\> void dialog.accept());  
  await page.getByTestId("restore-backup-input").setInputFiles({  
    name: "fixture.cajaapp-backup",  
    mimeType: "application/octet-stream",  
    buffer: Buffer.from("dummy-package"),  
  });  
  await page.getByTestId("restore-backup").click();  
  await expect.poll(() \=\> restoreCalled).toBe(true);  
  await expect(page.getByRole("alert")).toContainText("Respaldo previo");  
  await expect(page.getByTestId("backup-row-safety-1")).toContainText("Previo a restauración");  
  await expect(page.getByTestId("backup-row-restored-1")).toContainText("Paquete restaurado");  
});  
\`\`\`  
END FILE 22/23: workspace/frontend/tests/backup-restore.spec.ts

BEGIN FILE 23/23: workspace/frontend/tests/month-close.spec.ts  
ACTION: new | BYTES: 4345 | SHA256: 628f1b4f11a7f118cc31320036a7dc62e513c40438bf632f015c709b1192a89b  
\`\`\`typescript  
import { expect, test, type Page, type Route } from "@playwright/test";  
import type { MonthCloseItem } from "../src/lib/finance/month-close-api";

const CLOSE\_ID \= "22222222-2222-4222-8222-222222222222";

function closeFixture(status: "closed" | "reopened" \= "closed"): MonthCloseItem {  
  const summary \= {  
    monthKey: "2026-06",  
    movements: 3,  
    income: {  
      all: { ARS: "200000", USD: "2050" },  
      actual: { ARS: "180000", USD: "0" },  
      pending: { ARS: "0", USD: "2050" },  
      projected: { ARS: "20000", USD: "0" },  
    },  
    expense: {  
      all: { ARS: "123456", USD: "0" },  
      actual: { ARS: "123456", USD: "0" },  
      pending: { ARS: "0", USD: "0" },  
      projected: { ARS: "0", USD: "0" },  
    },  
    balance: {  
      all: { ARS: "76544", USD: "2050" },  
      actual: { ARS: "56544", USD: "0" },  
      pending: { ARS: "0", USD: "2050" },  
      projected: { ARS: "20000", USD: "0" },  
    },  
    sources: { manual\_cash: 1, salary\_receipt: 2 },  
    openReconciliations: 0,  
  };  
  return {  
    id: CLOSE\_ID,  
    monthKey: "2026-06",  
    version: 1,  
    status,  
    active: status \=== "closed",  
    summary,  
    sourceFingerprint: "a".repeat(64),  
    canReopen: status \=== "closed",  
    closedAt: "2026-07-17T12:00:00.000Z",  
    reopenedAt: status \=== "reopened" ? "2026-07-17T12:05:00.000Z" : null,  
    createdAt: "2026-07-17T12:00:00.000Z",  
    updatedAt: "2026-07-17T12:00:00.000Z",  
    snapshot: {  
      version: "month-close-v1",  
      monthKey: "2026-06",  
      range: { from: "2026-06-01", to: "2026-06-30" },  
      generatedAt: "2026-07-17T12:00:00.000Z",  
      summary,  
      movements: \[{ id: "manual:1" }, { id: "salary:1" }, { id: "salary:2" }\],  
      settings: { timezone: "America/Argentina/Tucuman" },  
      goals: \[{ id: "goal-1" }\],  
      budgets: \[{ id: "budget-1" }\],  
      cardStatements: \[{ id: "card-1" }\],  
      salaryReceipts: \[{ id: "salary-1" }\],  
    },  
    activities: \[\],  
  };  
}

test("Cierres crea un snapshot, muestra ARS/USD y reabre sólo la versión autorizada", async ({ page }: { page: Page }) \=\> {  
  let item: MonthCloseItem | null \= null;  
  let createBody: unknown \= null;

  await page.route("\*\*/api/month-close\*\*", async (route: Route) \=\> {  
    const request \= route.request();  
    const url \= new URL(request.url());  
    if (request.method() \=== "POST" && url.pathname \=== "/api/month-close") {  
      createBody \= request.postDataJSON();  
      item \= closeFixture();  
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(item) });  
      return;  
    }  
    if (request.method() \=== "POST" && url.pathname.endsWith(\`/${CLOSE\_ID}/reopen\`)) {  
      item \= closeFixture("reopened");  
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(item) });  
      return;  
    }  
    if (url.pathname.endsWith(\`/${CLOSE\_ID}\`)) {  
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(item ?? closeFixture()) });  
      return;  
    }  
    await route.fulfill({  
      status: 200,  
      contentType: "application/json",  
      body: JSON.stringify({ items: item ? \[item\] : \[\], pagination: { limit: 100, offset: 0, total: item ? 1 : 0, hasMore: false } }),  
    });  
  });

  await page.goto("/");  
  await page.getByRole("button", { name: /^Cierres$/i }).click();  
  await expect(page.getByTestId("month-close-section")).toBeVisible();  
  await page.getByTestId("month-close-input").fill("2026-06");  
  await page.getByTestId("create-month-close").click();  
  await expect.poll(() \=\> createBody).toEqual({ monthKey: "2026-06" });  
  await expect(page.getByRole("alert")).toContainText("Cierre 2026-06 v1 creado");

  const row \= page.getByTestId("month-close-row-2026-06");  
  await expect(row).toContainText("$ 765,44");  
  await expect(row).toContainText("US$ 20,50");  
  await expect(row).toContainText("3");  
  await expect(page.getByTestId("month-close-detail")).toContainText("Objetivos");  
  await expect(page.getByTestId("month-close-detail")).toContainText("Huella aaaaaaaaaaaaaaaa");

  page.on("dialog", (dialog) \=\> void dialog.accept());  
  await page.getByTestId("reopen-2026-06").click();  
  await expect(page.getByRole("alert")).toContainText("fue reabierto");  
  await expect(row).toContainText("Reabierto");  
  await expect(page.getByTestId("reopen-2026-06")).toHaveCount(0);  
});  
\`\`\`  
END FILE 23/23: workspace/frontend/tests/month-close.spec.ts

END OF AUTHORITATIVE SOURCE v1.3.0  
SOURCE\_SET\_SHA256: cba0dc8676c38395e4e8b03235c708c24876655b04c9e490e82db3169fde379a  
