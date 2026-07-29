# APP-AI-UX-STABILITY-001 — BACKEND CONTRACT v1.0.3-R1

Estado: ACTIVA. Único vertical activo. `APP-FINAL-CLOSURE` continúa bloqueado.

## Entorno

- Root canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
- Node obligatorio: `I:\Tools\node-v24.18.0-win-x64\node.exe`
- Nueva evidencia: `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R1/`

## Resolución arquitectónica del supuesto bloqueo

No existe un conflicto técnico entre el contrato de tres intentos y los tests existentes.

`workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts` está expresamente autorizado y debe modificarse para migrar el contrato anterior al nuevo. La orden de extender ese archivo permite actualizar nombres, fixtures y aserciones obsoletas dentro del mismo test file.

El contrato anterior permitía un intento inicial y una reparación: máximo **2 llamadas**. El contrato vigente permite un intento inicial y hasta dos reparaciones: máximo **3 llamadas totales**.

Importante: “máximo 3 intentos” significa tres llamadas totales al proveedor, no tres reintentos adicionales.

No reducir el contrato a dos intentos. No filtrar, omitir ni borrar tests para lograr PASS.

## Canonical y staging

El canonical debe permanecer intacto hasta PASS.

Hashes canónicos de referencia:

- `ai-advisor.service.ts`: `AD7F34B0A72CAFCC5447633E699639708125BD37F3D77637C6ABF36B24FB692C`
- `ai-advisor.service.test.ts`: `854151E6DB9FD0836FFE8A7F7CCAE0C14A68E08F650C666F2D3BF3E6A3850B21`
- SQLite: `E05FDF545F51085038A9BB5FD8A7E7C5E5CB5CEA424886F1CEE27D8D0869252C`
- `package.json`: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- `package-lock.json`: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

Puede reutilizarse el staging limpio de `v1.0.3` únicamente si se verifica que candidate es byte-a-byte idéntico a baseline en todos los archivos autorizados y que no contiene cambios temporales. Si existe cualquier duda, recrearlo desde canonical.

La evidencia baseline completa de la ejecución bloqueada puede reutilizarse sólo después de verificar hashes y copiarla a la nueva carpeta R1. Candidate debe ejecutarse completamente de nuevo.

## Archivos autorizados

Sólo pueden cambiar, si son necesarios:

- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`
- `workspace/backend/src/modules/ai-advisor/ai-advisor.controller.ts`
- `workspace/backend/src/modules/ai/ollama.client.ts`
- `workspace/backend/src/modules/ai/ollama-native.client.ts`
- `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`
- `workspace/frontend/src/lib/finance/ai-advisor-api.ts`
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.tsx`
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.legacy.tsx`
- `workspace/frontend/tests/ai-advisor.spec.ts`

Prohibido modificar package files, dependencias, `.env`, prompts, schemas JSON, Prisma, migraciones, SQLite, configuración Playwright, timeouts globales u otros tests.

## Implementación backend

Implementar máximo `3` intentos totales al proveedor para una sola request lógica.

Usar una constante explícita equivalente a `MAX_PROVIDER_ATTEMPTS = 3`. Evitar números mágicos distribuidos.

Sólo reintentar cuando una respuesta fue recibida pero rechazada por el validador con `AI_ADVISOR_UNGROUNDED_NUMBER`.

No reintentar:

- errores de autenticación o configuración;
- request inválida;
- errores de red declarados no recuperables;
- códigos de validación distintos;
- errores internos desconocidos.

En cada intento:

- conservar exactamente rango, moneda, modo, pregunta, contexto, fuentes y fingerprint;
- enviar feedback mínimo y sanitizado del rechazo previo;
- mantener intacta la validación estricta;
- usar attempt ID/providerRequestId distinto;
- conservar una sola `correlationId` para la request lógica;
- respetar presupuesto total máximo de 120 segundos;
- no hacer sleeps arbitrarios.

Persistencia:

- no guardar intentos rechazados como interacciones válidas;
- no crear varias interacciones lógicas;
- persistir una sola interacción cuando un intento es válido;
- al agotarse tres respuestas inválidas, devolver `422` sanitizado con `code`, `message`, `recoverable: true`, `attemptCount: 3` y `correlationId`;
- no exponer prompts, output crudo ni secretos.

No borrar claims, modificar cifras, redondear, inventar valores ni relajar el grounding para convertir una respuesta inválida en válida.

## Migración obligatoria de los tests existentes

Actualizar dentro de `ai-advisor.service.test.ts` los tests del contrato anterior:

1. El escenario donde el intento 1 falla y el intento 2 es válido debe seguir esperando exactamente `2` llamadas.
2. `ask finaliza en 422 sin tercer intento cuando la reparación también falla` debe migrarse a un escenario con tres outputs recuperables inválidos y verificar 422 después del tercer intento.
3. `nunca existe tercer intento` debe renombrarse a `nunca existe cuarto intento` y verificar exactamente `3` llamadas en agotamiento.
4. `proveedor se invoca exactamente dos veces en recuperación` puede conservarse sólo para el escenario en que el segundo intento es válido; no puede actuar como límite global.
5. Los tests nuevos que afirman “after 2 attempts” deben corregirse o reemplazarse; no deben congelar nuevamente el límite anterior.

Cobertura mínima final:

- primer intento inválido y segundo válido: 2 llamadas, una interacción persistida;
- dos inválidos y tercero válido: 3 llamadas, una interacción persistida;
- tres inválidos: 3 llamadas, 422 estructurado y cero interacción válida;
- error no recuperable: 1 llamada;
- mismo fingerprint, fuentes, pregunta y contexto en todos los intentos;
- una correlationId lógica y attempt IDs distintos;
- ningún cuarto intento;
- validación estricta activa;
- los intentos rechazados no se persisten como éxito.

Todos los tests históricos deben seguir presentes. No usar `.skip`, `.only`, filtros ni cambios de timeout.

## Frontend

La UI debe hacer una sola llamada HTTP por submit. No implementar retries automáticos en el cliente.

Debe:

- finalizar loading en success, error o timeout;
- abortar con límite máximo de 120 segundos;
- mostrar el 422 estructurado como error visible y recuperable;
- ejecutar una nueva request únicamente cuando el usuario pulsa retry;
- impedir que una respuesta tardía pise una consulta posterior;
- mantener fingerprint, claims, citas y soporte desktop/mobile.

## Validación

### Backend determinístico

Ejecutar test focal AI Advisor y suite backend completa. Todos deben pasar.

### API real

Ejecutar 5 requests consecutivas a `/api/ai-advisor/ask`, incluida la pregunta que produjo números no fundamentados.

PASS:

- 5/5 HTTP 201;
- cada request lógica <=120 s;
- schema, fingerprint, claims y citas válidos;
- attemptCount entre 1 y 3;
- cero duplicados;
- cero 422 en este bloque de estabilidad.

Además ejecutar un test determinístico/mocked de agotamiento que demuestre el 422 estructurado; no intentar provocar tres errores reales del proveedor.

### UI focal

Con Chromium, `workers=1`, `retries=0`:

- `ai-advisor.spec.ts` Run 1 PASS;
- Run 2 consecutivo PASS;
- `month-close.spec.ts` seguido del focal PASS;
- camino de error 422 visible y retry manual funcional. Sólo el error puede interceptarse; el éxito principal debe usar proveedor real.

### Gates

Backend candidate:

- `npm ci`
- Prisma generate
- migrate status
- build
- test focal AI Advisor
- suite backend completa

Frontend candidate:

- `npm ci`
- typecheck
- lint
- build

Playwright candidate completo:

- Chromium
- workers=1
- retries=0
- todos los tests canónicos; ningún archivo temporal dentro de `tests/`.

Crear `BASELINE-FULL-SUITE.json`, `CANDIDATE-FULL-SUITE.json` y `COMPARISON.json` completos y parseables.

PASS:

- `candidateNewFailures = 0`;
- `baselinePassedCandidateFailed = 0`;
- API directa de AI Advisor PASS en candidate;
- focales AI PASS;
- cero skips y retries;
- los fallos comunes baseline/candidate pueden registrarse como deuda preexistente si son idénticos y ajenos a AI.

No usar resultados “proyectados” desde una ejecución parcial.

## Promoción

Sólo tras PASS:

- promover atómicamente únicamente archivos autorizados realmente modificados;
- registrar hashes SHA-256 reales before/after;
- ejecutar build backend, typecheck frontend y smoke API/UI sobre canonical;
- comprobar package hashes y SQLite intactos.

En FAIL/BLOCKED:

- no promover;
- restaurar SQLite;
- detener procesos;
- dejar 11434, 11436 y 11437 libres.

## Evidencia mínima

Entregar en la carpeta R1:

- `00-verdict.md`
- `00-preflight.txt`
- `AUTHORIZED-FILES-HASHES.json`
- `TEST-CONTRACT-MIGRATION.md`
- `BACKEND-RETRY-MATRIX.json`
- `API-REAL-5.json`
- `FOCAL-RUN-1.json`
- `FOCAL-RUN-2.json`
- `ORDER-CONTAMINATION-RUN.json`
- `BASELINE-FULL-SUITE.json`
- `CANDIDATE-FULL-SUITE.json`
- `COMPARISON.json`
- `AI-STABILITY-GATES.json`
- logs sanitizados
- hashes SQLite inicial/final
- `PROMOTION.json` sólo si PASS.

Checklist final: `TOTAL_TASKS=22`, con DONE/PENDING/BLOCKED explícitos.

No abrir otro vertical.