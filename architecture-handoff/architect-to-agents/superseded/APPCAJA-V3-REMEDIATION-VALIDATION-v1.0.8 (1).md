# APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.8

Estado: ISSUED / AUTORIZADA
Proyecto: CajaApp V3
Root operativo obligatorio del agente: `I:\cajaApp-V3-real`
Repo canónico fuente: Google Drive sincronizado en `I:\cajaApp-V3`
Entorno obligatorio: Windows x64 + Node.js exacto `v24.18.0`

## 1. Objetivo

Materializar exactamente las remediaciones publicadas por el arquitecto después del `FAIL` válido de `v1.0.7` y ejecutar desde cero la validación consolidada completa.

La campaña `v1.0.7` confirmó que Prisma, backend, frontend, smoke y headless funcionaban, pero terminó `FAIL` por 13 fallos Playwright y un HTTP 422 del Asesor IA. La auditoría de trazas determinó:

- defecto real: el guardrail numérico interpretaba componentes de fechas ISO como números financieros inventados;
- defecto real: Tarjetas ocultaba el historial cuando no existía un resumen activo;
- doce specs desalineados con navegación, DOM responsive, inputs, paneles colapsados o datos preexistentes;
- no se relajaron guardrails ni contratos: los números realmente inventados continúan bloqueados.

## 2. Gobierno

- `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.7` está `SUPERSEDED / FAIL`.
- Su evidencia se conserva en `agents-to-architect\rejected\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.7-FAIL`.
- `APPCAJA-V3-EVIDENCE-MATERIALIZATION-v1.0.7` está `SUPERSEDED`.
- Esta `v1.0.8` es la única campaña vigente.
- El arquitecto modifica Drive / `I:\cajaApp-V3`; el agente ejecuta exclusivamente en `I:\cajaApp-V3-real`.
- Después de Fase 8A queda prohibido modificar código, tests, configuración, migraciones, dependencias, prompts, contratos o SQLite.
- Un fallo no autoriza reparaciones durante la campaña. Deben continuarse todos los gates técnicamente ejecutables.

## 3. Guardia de roots

Antes de operar:

1. Confirmar `Resolve-Path 'I:\cajaApp-V3-real'`.
2. Confirmar `Resolve-Path 'I:\cajaApp-V3'`.
3. Ejecutar builds, tests, servidores y evidencia únicamente en `I:\cajaApp-V3-real`.
4. Usar `I:\cajaApp-V3` sólo como fuente sincronizada para Fase 8A.
5. Crear evidencia nueva únicamente en:

`I:\cajaApp-V3-real\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.8`

No reutilizar logs, resultados, backups ni artefactos de campañas anteriores.

## 4. Fase 8A — materialización exacta autorizada

Fuente:

`I:\cajaApp-V3\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-v1.0.8-CANONICAL-RECOVERY`

Leer `MANIFEST-v1.0.8.md`. Copiar los siguientes archivos hacia los destinos exactos indicados en el manifiesto:

- `ai-advisor.service.ts` → `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`
- `ai-advisor.service.test.ts` → `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`
- `tarjetas-section.tsx` → `workspace/frontend/src/components/finance/sections/tarjetas-section.tsx`
- `alert-center.spec.ts` → `workspace/frontend/tests/alert-center.spec.ts`
- `categories.spec.ts` → `workspace/frontend/tests/categories.spec.ts`
- `chart-parity.spec.ts` → `workspace/frontend/tests/chart-parity.spec.ts`
- `debit-csv-import.spec.ts` → `workspace/frontend/tests/debit-csv-import.spec.ts`
- `card-statement-import.spec.ts` → `workspace/frontend/tests/e2e/card-statement-import.spec.ts`
- `dashboard.spec.ts` → `workspace/frontend/tests/e2e/dashboard.spec.ts`
- `dashboard-alerts.spec.ts` → `workspace/frontend/tests/e2e/deuda-futura/dashboard-alerts.spec.ts`
- `future.spec.ts` → `workspace/frontend/tests/e2e/deuda-futura/future.spec.ts`
- `financial-health.spec.ts` → `workspace/frontend/tests/financial-health.spec.ts`
- `global-search.spec.ts` → `workspace/frontend/tests/global-search.spec.ts`
- `movements.spec.ts` → `workspace/frontend/tests/movements.spec.ts`
- `sidebar-data-quality.spec.ts` → `workspace/frontend/tests/sidebar-data-quality.spec.ts`

Reglas de materialización:

- Copiar bytes exactos; no reconstruir ni reformatear.
- Se autoriza retirar exclusivamente un BOM inicial si la copia sincronizada lo hubiera agregado; el hash final debe coincidir con el manifiesto sin BOM.
- No eliminar ni modificar otros archivos fuente.
- Limpiar antes del preflight: backend `dist`, `coverage`; frontend `.next`, `coverage`, `playwright-report`, `test-results`.
- Registrar origen, destino, bytes y SHA-256 en `00-remediation.md`.
- Si falta una fuente o un hash no coincide, responder `BLOCKED` sin inventar contenido.

## 5. Integridad y SQLite

Después de Fase 8A:

- verificar los 15 hashes contra el manifiesto;
- verificar cero BOM en archivos técnicos activos;
- verificar cero copias activas `(1)`, `(2)`, `copy`, `copia`, `TEMP-` o `~`;
- verificar migraciones completas y `schema.prisma` sin BOM;
- registrar hashes de lockfiles y archivos remediados como baseline.

SQLite real:

`I:\cajaApp-V3-real\workspace\backend\prisma\dev.db`

Antes de Prisma, registrar tamaño y SHA-256 y crear un backup `PRE-v1.0.8-dev.db` fuera de la ruta activa. En `finally`, detener CajaApp, restaurar el backup y exigir hash final idéntico al inicial.

## 6. Toolchain obligatorio

No usar ejecutables resueltos por PATH.

- Node: `I:\Tools\node-v24.18.0-win-x64\node.exe`
- npm: `I:\Tools\node-v24.18.0-win-x64\npm.cmd`
- npx: `I:\Tools\node-v24.18.0-win-x64\npx.cmd`

Node debe devolver exactamente `v24.18.0`.

## 7. Gates backend

CWD: `I:\cajaApp-V3-real\workspace\backend`

1. `npm ci`
2. `npm run prisma:generate`
3. `npm run prisma:migrate:deploy`
4. `npx prisma migrate status`
5. `npm run build`
6. `npm run test`

Todos deben terminar con exit code 0. La suite debe incluir la regresión que acepta el día `14` sustentado por un período ISO y seguir rechazando `99/100` cuando no aparece en las fuentes.

## 8. Gates frontend

CWD: `I:\cajaApp-V3-real\workspace\frontend`

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`

Todos deben terminar con exit code 0 y los lockfiles deben permanecer sin cambios.

## 9. Arranque obligatorio

Detención inicial:

```powershell
& "I:\cajaApp-V3-real\cajaapp-headless-up.ps1" -Stop -JsonOnly
```

Arranque único:

```powershell
& "I:\cajaApp-V3-real\cajaapp-headless-up.ps1" `
  -Rebuild `
  -JsonOnly `
  -BackendPort 11436 `
  -FrontendPort 11437
```

No levantar servicios por npm, node, wrappers o comandos paralelos.

## 10. Smoke API

Validar HTTP 200 en los doce endpoints de `v1.0.7`, incluida la ruta correcta:

`GET /api/future-commitments?from=<mes>&months=3`

## 11. Asesor IA real

Ejecutar una consulta real válida mediante `curl.exe` o `Invoke-RestMethod` con JSON UTF-8.

Debe comprobarse:

- HTTP 201;
- proveedor y modelo reales;
- request ID;
- fingerprint de contexto;
- claims y citas materializadas;
- ausencia de `AI_ADVISOR_UNGROUNDED_NUMBER` por componentes de fechas;
- persistencia en historial y cleanup posterior.

Además ejecutar `tests/ai-advisor.spec.ts`. Un 422 sigue siendo `FAIL`; no clasificarlo como dependencia externa si el proveedor respondió.

## 12. Playwright completo

Variables:

```powershell
$env:CAJAAPP_API_BASE_URL = "http://127.0.0.1:11436"
$env:CAJAAPP_FRONTEND_BASE_URL = "http://127.0.0.1:11437"
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:11437"
$env:PLAYWRIGHT_HTML_OPEN = "never"
```

Ejecutar la suite completa, incluyendo Asesor IA, con Chromium, un worker, cero retries y trace activo. No usar filtros, `grep`, `grep-invert`, skips ni exclusiones.

Criterio:

- todos los specs descubiertos PASS;
- 0 failed;
- 0 skipped;
- importación PDF real completada;
- historial de Tarjetas visible aunque no exista resumen activo;
- responsive y accesibilidad completas;
- cleanup UAT demostrado.

No imponer un timeout externo inferior a 60 minutos.

## 13. Cleanup final

En `finally`:

1. eliminar datos UAT e interacciones del Asesor IA;
2. preservar evidencia fuera de `workspace`;
3. eliminar artefactos generados;
4. detener exclusivamente con `cajaapp-headless-up.ps1 -Stop -JsonOnly`;
5. confirmar puertos 11436/11437 libres y cero procesos Node de CajaApp;
6. restaurar SQLite y verificar hash idéntico;
7. comparar hashes finales de los 15 archivos y lockfiles contra el baseline.

## 14. Evidencia mínima

Crear logs separados para root/toolchain, materialización/hashes, SQLite inicial/final, Prisma, backend, frontend, headless, smoke, Asesor IA, Playwright completo, responsive/accesibilidad, cleanup y veredicto.

El veredicto permitido es:

- `PASS`: todos los gates pasan;
- `FAIL`: existe cualquier defecto reproducible del repo, IA, Playwright, cleanup o integridad;
- `BLOCKED`: únicamente si no puede materializarse una fuente canónica o una dependencia externa impide ejecutar un gate sin que el producto haya respondido.

## 15. Respuesta final del agente

```text
Veredicto: PASS | FAIL | BLOCKED
Root operativo validado: I:\cajaApp-V3-real
Repo canónico fuente: I:\cajaApp-V3
Evidencia: I:\cajaApp-V3-real\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.8
Defectos principales: <lista breve o NINGUNO>
Proveedor IA: PASS | FAIL | BLOCKED — <detalle>
Playwright: PASS | FAIL — <passed/failed/skipped/duración>
SQLite restaurado: SI/NO — <hash inicial> / <hash final>
Servicios detenidos: SI/NO — <detalle>
```
