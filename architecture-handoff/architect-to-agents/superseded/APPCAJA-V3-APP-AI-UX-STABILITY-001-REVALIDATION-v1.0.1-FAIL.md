# APP-AI-UX-STABILITY-001 — REVALIDACIÓN v1.0.1

Estado: ACTIVA. Vertical único activo: `APP-AI-UX-STABILITY-001`.
Root: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.
Node obligatorio: `I:\Tools\node-v24.18.0-win-x64\node.exe`.

## Motivo

v1.0.0 terminó FAIL:
- Run 1: 2/2 PASS.
- Run 2: `/api/ai-advisor/ask` devolvió una respuesta no exitosa, pero no se guardaron status, body ni log backend correlacionado.
- Run 3: `ai-advisor-response` no apareció en 180 segundos, pero no se determinó si la request falló, quedó pendiente o no fue renderizada.
- No se probó de forma inequívoca que el upstream ejecutado fuera Ollama Cloud real.
- Faltaron API 5/5, suite completa y manifests.

No asumir deadlock SQLite ni defecto UI sin evidencia.

## Baseline

Hashes inmutables:
- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`.
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

Playwright esperado: al menos 40/42. Sólo pueden permanecer los dos fallos conocidos de Recibos de sueldo.

## Archivos autorizados

Sólo si el diagnóstico lo exige:
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.tsx`;
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.legacy.tsx`;
- `workspace/frontend/tests/ai-advisor.spec.ts`;
- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`;
- `workspace/backend/src/modules/ai-advisor/ai-advisor.controller.ts`;
- `workspace/backend/src/modules/ai/ollama.client.ts`;
- `workspace/backend/src/modules/ai/ollama-native.client.ts`;
- `workspace/backend/src/modules/movements/movements.service.ts`;
- `workspace/backend/src/modules/movements/categories.service.ts`.

Los dos archivos de movimientos sólo pueden modificarse si un log backend identifica operación, error, stack y reproducción dentro de ellos.

Prohibido modificar package files, dependencias, `.env`, Prisma schema, migraciones, SQLite, prompts, schemas JSON, otros tests o timeouts globales.

## 1. Preflight

- Confirmar root, Node y hashes package.
- Guardar SHA-256 inicial de los archivos autorizados.
- Guardar SHA-256 y backup de `workspace/backend/prisma/dev.db`.
- Confirmar 11436/11437 libres.
- Crear evidencia nueva en `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.1/`.
- No reutilizar evidencia v1.0.0.

## 2. Identidad del proveedor

Crear `PROVIDER-IDENTITY.json` sanitizado con:
- modo efectivo;
- host efectivo;
- modelo solicitado y devuelto;
- autenticación presente o ausente, sin registrar valores;
- metadata que diferencie ejecución local de upstream remoto.

Un proxy local sólo es válido si se demuestra que relayó la consulta al proveedor remoto. El sufijo `:cloud` no es prueba suficiente.

Si no puede demostrarse proveedor remoto real: `BLOCKED` inmediato, sin cambiar producto ni tests.

## 3. Diagnóstico correlacionado

Arrancar backend y frontend con comandos nativos y guardar stdout/stderr en:
- `backend-runtime.log`;
- `frontend-runtime.log`.

Para cada POST `/api/ai-advisor/ask`, registrar:
- inicio y fin;
- status HTTP;
- body de error sanitizado;
- duración;
- request/correlation ID;
- interaction ID y provider request ID cuando existan;
- fingerprint enviado y devuelto;
- estado final: success, error, timeout o aborted.

En Playwright capturar `request`, `response`, `requestfailed` y consola para `/ask`. Un fallo debe mostrar status y body; no alcanza con `response.ok() = false`.

Ejecutar el focal original una vez y crear `DIAGNOSTIC-RUN.json`.

Clasificar el fallo como: proveedor, armado de contexto, SQLite, controlador/HTTP, frontend o setup/cleanup del test.

Para declarar SQLite contention deben existir error real, operación exacta, stack, timestamps de solapamiento y reproducción mínima.

## 4. Corrección mínima

Si es test:
- escrituras y cleanup secuenciales;
- validar cada response;
- datos únicos;
- cleanup en `finally`;
- no usar pausas arbitrarias como solución.

Si es SQLite/producto:
- corregir sólo la operación demostrada;
- no resolver únicamente aumentando timeout o agregando retries generales;
- agregar prueba backend focal antes/después.

Si es UI:
- una request lógica por submit;
- loading siempre termina en success o error;
- error HTTP visible y recuperable;
- una respuesta tardía no pisa la consulta vigente;
- retry/navegación permiten nueva consulta;
- sin polling indefinido.

## 5. API real 5/5

Ejecutar cinco preguntas financieras distintas por API real y crear `AI-TIMING-SUMMARY.json`.

Gate:
- 5/5 HTTP 201;
- 5/5 schema válido;
- 5/5 fingerprint coincidente;
- fuentes/citas válidas;
- proveedor remoto confirmado;
- cada request <= 180 segundos;
- cero requests duplicadas o huérfanas.

## 6. Playwright focal

Comando:
`npx playwright test tests/ai-advisor.spec.ts --project=chromium --workers=1 --retries=0`

Debe cubrir API, desktop con dos consultas, mobile, loading y correlación.

Ejecuciones obligatorias:
1. focal PASS;
2. focal PASS consecutivo sin reiniciar ni restaurar SQLite entre ambos;
3. ejecutar antes un spec que escriba en backend/SQLite y luego el focal; el focal debe volver a PASS.

Cero skips y retries.

## 7. Gates generales

Backend:
- npm ci;
- Prisma generate y migrate status;
- build;
- prueba focal si se agregó;
- suite backend completa.

Frontend:
- npm ci;
- typecheck;
- lint;
- build.

Luego ejecutar Playwright completo Chromium con workers=1 y retries=0.

PASS requiere al menos 40/42, cero fallos nuevos y package hashes intactos.

## 8. Manifests

Crear:
- `PROVIDER-IDENTITY.json`;
- `DIAGNOSTIC-RUN.json`;
- `AI-TIMING-SUMMARY.json`;
- `FOCAL-RUN-1.json`;
- `FOCAL-RUN-2.json`;
- `ORDER-CONTAMINATION-RUN.json`;
- `FULL-SUITE-RESULT.json`;
- `AI-STABILITY-GATES.json`.

## 9. Salida y cleanup

PASS: conservar sólo cambios mínimos demostrados, con hashes before/after.

FAIL: restaurar archivos autorizados y SQLite a hashes iniciales.

BLOCKED: sólo por proveedor remoto no demostrable o dependencia externa verificable.

Siempre:
- detener procesos iniciados;
- 11436/11437 libres;
- SQLite restaurada;
- datos UAT ausentes;
- package hashes baseline;
- evidencia completa y `00-verdict.md`.

Checklist:
`TOTAL_TASKS=20`, `DONE=<n>`, `PENDING=<n>`, `BLOCKED=<n>`.

No abrir otro vertical.
