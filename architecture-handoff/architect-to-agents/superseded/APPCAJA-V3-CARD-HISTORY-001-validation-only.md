# APPCAJA-V3-CARD-HISTORY-001 — Validación exclusiva de Historial seguro de resúmenes

**Proyecto:** CajaApp V3  
**Root obligatorio:** `I:\cajaApp-V3`  
**Backend:** `I:\cajaApp-V3\workspace\backend`  
**Frontend:** `I:\cajaApp-V3\workspace\frontend`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`  
**Estado del código:** implementado por el arquitecto / pendiente de gate local  
**Modo del agente:** validación solamente

## 1. Restricciones obligatorias

El agente debe ejecutar instalación reproducible, migraciones existentes, build, tests, smoke, Playwright y UAT.

No está autorizado a:

- modificar código, schemas, migraciones, dependencias, configuración o documentación;
- editar `APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`;
- crear wrappers, scripts auxiliares o runners propios;
- ejecutar `npm audit fix --force`;
- trabajar fuera de `I:\cajaApp-V3`;
- usar otra versión de Node;
- alterar permanentemente `prisma\dev.db` para realizar la UAT.

Ante cualquier fallo, debe conservar evidencia, continuar con los gates independientes que todavía puedan ejecutarse y reportar el bloqueo exacto. No debe remediar.

## 2. Archivos que deben existir antes de comenzar

### Backend

- `prisma/schema.prisma`
- `prisma/migrations/20260712150000_add_card_statement_history/migration.sql`
- `src/modules/cards/cards.service.ts`
- `src/modules/cards/cards.controller.ts`
- `src/modules/cards/cards.schemas.ts`
- `src/modules/cards/cards.types.ts`
- `src/modules/cards/card-statement.mapper.ts`
- `src/modules/imports/imports.service.ts`
- `src/modules/manual-purchases/manual-purchases.service.ts`
- `src/modules/movements/movements.service.ts`
- `src/shared/errors.ts`
- `tests/cards/history.test.ts`

### Frontend

- `src/lib/finance/card-statements-api.ts`
- `src/components/finance/sections/tarjetas-section.tsx`
- `tests/card-history.spec.ts`

Si falta alguno, registrar `BLOCKED_MISSING_IMPLEMENTATION_FILE` y no crearlo.

## 3. Preparación segura de base de datos

1. Confirmar que el proceso está ubicado en `I:\cajaApp-V3`.
2. Confirmar Node exacto:

```powershell
& 'I:\Tools\node-v24.18.0-win-x64\node.exe' --version
```

Resultado obligatorio: `v24.18.0`.

3. Crear el directorio de evidencia bajo:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-CARD-HISTORY-001
```

4. Copiar `workspace\backend\prisma\dev.db` al directorio de evidencia con un nombre que incluya fecha y hora.
5. Crear una segunda copia temporal para ejecutar migración y UAT. No apuntar el backend de prueba al `dev.db` original.
6. Registrar en la evidencia la ruta absoluta de:
   - base original;
   - backup;
   - base temporal de validación.

## 4. Gate backend

Desde `I:\cajaApp-V3\workspace\backend`, usando Node exacto `v24.18.0`:

1. `npm ci`
2. `npm run prisma:generate`
3. configurar `DATABASE_URL` para la copia temporal;
4. `npm run prisma:migrate:deploy`
5. `npx prisma migrate status`
6. `npm run build`
7. `npm run test`

La suite debe descubrir y ejecutar:

```text
tests/cards/history.test.ts
```

Registrar conteo total de tests y resultado específico del archivo. `history.test.ts` debe ejecutar sus 6 casos y finalizar `6/6 PASS`.

## 5. Verificación de migración y consistencia

Sobre la base temporal, verificar sin modificar schema ni crear scripts:

- existen las columnas `periodKey`, `historyKey`, `version`, `isActiveForPeriod`, `archivedAt`, `archivedReason`;
- existe el índice único `CardStatement_historyKey_version_key`;
- existe el índice parcial `CardStatement_one_active_per_history_key`;
- resúmenes históricos con fecha válida tienen `periodKey`;
- `historyKey` contiene banco, marca, número de resumen normalizado y período;
- dos resúmenes del mismo banco, marca y período con distinto `statementNumber` no comparten `historyKey`;
- versiones del mismo `historyKey` son consecutivas desde 1;
- como máximo una fila por `historyKey` cumple simultáneamente:
  - `status = 'accepted'`;
  - `isActiveForPeriod = true`.

Usar `sqlite3.exe` si está disponible. Si no está disponible, validar mediante Prisma existente o consultas API; no crear scripts auxiliares.

## 6. Arranque controlado

- elegir puertos libres aleatorios para backend y frontend;
- publicar ambos por variables de entorno;
- registrar backend port, frontend port, `DATABASE_URL` temporal y PIDs;
- iniciar backend y frontend con comandos nativos del proyecto;
- verificar `GET /health`;
- liberar ambos procesos por PID al finalizar, incluso si falla la UAT.

No usar puertos fijos si están ocupados y no matar procesos ajenos.

## 7. Smoke API obligatorio

Validar como mínimo:

```text
GET  /api/card-statements/statements?limit=100&includeArchived=true
GET  /api/card-statements/statements/:statementId
GET  /api/card-statements/statements/:statementId/traceability
POST /api/card-statements/statements/:statementId/activate
POST /api/card-statements/statements/:statementId/archive
```

Comprobar:

- listado incluye `periodKey`, `version`, `isActiveForPeriod`, estado, documento y SHA;
- trazabilidad incluye documento, draft, ejecución IA y cadena de versiones;
- activar una versión deja sólo una versión activa para el historial;
- archivar no elimina `UploadedDocument`, `CardStatementDraft` ni `AiExtractionRun`;
- una versión no activa no aparece en ledger, proyecciones ni Deuda futura.

## 8. UAT de duplicado y versionado

Trabajar únicamente sobre la base temporal.

1. Localizar un PDF real ya usado en UAT dentro del storage del backend.
2. Importar el PDF original y completar la aceptación si todavía no existe en la base temporal.
3. Importar exactamente el mismo archivo otra vez.
4. Resultado obligatorio:

```text
HTTP 409
code = CARD_STATEMENT_DUPLICATE
```

5. Confirmar que el segundo intento no creó otro `UploadedDocument`, `CardStatementDraft` ni `AiExtractionRun`.
6. Crear una variante de prueba en el directorio de evidencia copiando el PDF y agregando únicamente bytes finales inocuos mediante herramientas nativas de PowerShell. No modificar el PDF fuente.
7. Importar la variante, revisar y aceptar.
8. Confirmar:
   - mismo `historyKey`;
   - versión incrementada;
   - nueva versión `accepted + isActiveForPeriod=true`;
   - versión anterior `superseded + isActiveForPeriod=false`;
   - documentos y ejecuciones IA de ambas versiones preservados.

Si el PDF variante deja de ser legible, registrar el bloqueo de este subcaso y continuar con los demás gates. No modificar código.

## 9. UAT de compras manuales y cambio de versión

Sobre dos versiones del mismo historial:

1. agregar una compra manual a la versión activa;
2. registrar su ID y proyecciones;
3. activar la versión anterior;
4. confirmar que la compra manual y sus cuotas ahora pertenecen a la nueva versión activa;
5. confirmar que no hay duplicación en:
   - `GET /api/card-statements/updated-values`;
   - Movimientos;
   - Dashboard;
   - Deuda futura;
6. confirmar que no se puede crear una compra manual sobre una versión inactiva;
7. archivar una versión con motivo y comprobar que continúa en el historial y en la trazabilidad.

## 10. Gate frontend y Playwright

Desde `I:\cajaApp-V3\workspace\frontend`:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`
5. ejecutar exclusivamente con Playwright CLI:

```powershell
$env:PLAYWRIGHT_HTML_OPEN = 'never'
npx playwright test tests/card-history.spec.ts --project=chromium --workers=1 --retries=0 --trace=on
```

No crear runners ni archivos JavaScript auxiliares.

## 11. UAT visual

Confirmar en Tarjetas:

- panel `Historial de resúmenes` visible;
- búsqueda por archivo, banco, tarjeta y período;
- filtros Activos, Versiones anteriores y Archivados;
- badges de versión, período y vigencia;
- consulta de una versión anterior sin habilitar compra manual;
- trazabilidad visible con SHA, borrador, modelo, prompt y cadena de versiones;
- activación con confirmación;
- archivo con motivo y permanencia bajo filtro Archivados;
- recarga conserva historial y versión activa;
- smoke de Dashboard, Movimientos y Deuda futura después de cambiar la versión activa.

## 12. Evidencia requerida

Entregar un único ZIP bajo `pending-validation` que incluya:

- `REPORT.md` con veredicto técnico;
- versiones de SO, Node y npm;
- rutas y puertos usados;
- hash del backup y de la base temporal;
- logs de `npm ci`, Prisma, migración, build y tests;
- resultado específico de `history.test.ts`;
- consultas o capturas que prueben una sola versión activa;
- respuestas API del duplicado, trazabilidad, activación y archivo;
- evidencia de que la IA no se ejecutó en el duplicado exacto;
- salida Playwright, trace, screenshots y video si se generó;
- smoke de Dashboard, Movimientos y Deuda futura;
- lista honesta de pendientes o bloqueos.

Nombre sugerido:

```text
APPCAJA-V3-CARD-HISTORY-001-validation-v1.0.0.zip
```

El agente no debe mover el ZIP a `accepted` ni `rejected`; debe dejarlo en `pending-validation` para revisión del arquitecto.
